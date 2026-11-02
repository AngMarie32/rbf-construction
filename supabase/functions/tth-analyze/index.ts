/**
 * TraderTaxHQ — consultation memo drafter.
 *
 * The deterministic engines run in the app and hand this function their output.
 * The model's only job is to turn that structured result into (a) a client-
 * facing memo and (b) a call script for the preparer. It is explicitly barred
 * from computing anything, adding conclusions, or citing authority that is not
 * already in the payload — everything it writes is traceable back to a number
 * the engine produced.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SYSTEM_PROMPT = `You are a senior tax practitioner at a firm specializing in traders, drafting internal work product for a licensed preparer to review.

Hard rules:
- Use ONLY the facts, figures, and authorities present in the payload. Never compute a new number, never estimate, never introduce an authority that is not already cited in the payload.
- If something is missing, say it is missing and name what has to be collected. Do not fill the gap with an assumption.
- Never tell the client a position is guaranteed, safe, or audit-proof. Trader tax status is facts and circumstances, determined year by year.
- Write plainly. No filler, no marketing, no "as your trusted advisor".
- The memo is a draft. Do not sign it, and do not tell the client to act before the preparer has reviewed it.

Return ONLY raw JSON, no markdown fence, in exactly this shape:
{
  "memo": "string — client-facing memorandum in plain prose with short section headers written as ALL-CAPS lines. Cover: where they stand, the trader tax status read and what supports or undercuts it, the section 475 decision with its deadline, entity and retirement structure, the numbers, and what happens next.",
  "call_script": "string — a preparer's running order for the consultation: opening frame, the two or three decisions that must be made on the call, the questions to ask, the objections to expect and how to answer them, and the close with next steps and deadlines.",
  "headline": "string — one sentence, under 200 characters, stating the single most important thing for this client.",
  "top_risks": ["string", "string"],
  "quick_wins": ["string", "string"]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'Missing LOVABLE_API_KEY' }, 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: 'Not authenticated' }, 401);

    const { engagement_id, analysis, client_profile, documents, save = true } = await req.json();
    if (!engagement_id || !analysis) {
      return json({ error: 'engagement_id and analysis are required' }, 400);
    }

    const { data: engagement } = await userClient
      .from('tth_engagements')
      .select('id, tax_year, service_type, status')
      .eq('id', engagement_id)
      .maybeSingle();
    if (!engagement) return json({ error: 'Engagement not found or not accessible' }, 403);

    const userPrompt = [
      `TAX YEAR: ${analysis.taxYear}`,
      `PARAMETER STATUS: ${analysis.configStatus}${
        analysis.configStatus !== 'verified' ? ` — ${analysis.configNote}` : ''
      }`,
      '',
      'CLIENT PROFILE',
      JSON.stringify(client_profile ?? {}, null, 2),
      '',
      'DOCUMENT STATUS',
      JSON.stringify(documents ?? [], null, 2),
      '',
      'DETERMINISTIC ENGINE OUTPUT (the only source of facts and figures you may use)',
      JSON.stringify(analysis, null, 2),
    ].join('\n');

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': apiKey,
      },
      body: JSON.stringify({
        model: 'google/gemini-3.6-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      const msg =
        aiRes.status === 429
          ? 'Rate limit reached. Try again in a moment.'
          : aiRes.status === 402
          ? 'AI credits exhausted. Add credits in Settings → Plans & credits.'
          : `AI gateway error ${aiRes.status}`;
      return json({ error: msg, details: errText }, aiRes.status);
    }

    const data = await aiRes.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? '';
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: 'Could not parse AI response', raw: cleaned }, 502);
      parsed = JSON.parse(match[0]);
    }

    let analysisId: string | null = null;
    if (save) {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: inserted, error } = await admin
        .from('tth_analyses')
        .insert({
          engagement_id,
          tax_year: analysis.taxYear ?? engagement.tax_year,
          engine_version: analysis.engineVersion ?? 'v1',
          computed: analysis,
          ai_memo: parsed.memo ?? null,
          ai_call_script: parsed.call_script ?? null,
          ai_model: 'google/gemini-3.6-flash',
          ai_raw: parsed,
          status: 'draft',
          generated_by: userData.user.id,
        })
        .select('id')
        .single();

      if (error) console.error('Failed to save analysis', error);
      analysisId = inserted?.id ?? null;

      await admin.from('tth_activity').insert({
        engagement_id,
        kind: 'analysis_generated',
        message: `Consultation analysis drafted (${analysis.findings?.length ?? 0} findings, ${
          analysis.positions?.length ?? 0
        } proposed positions).`,
        meta: { analysis_id: analysisId, engine_version: analysis.engineVersion },
        actor: userData.user.id,
      });
    }

    return json({ ...parsed, analysis_id: analysisId });
  } catch (e) {
    console.error('tth-analyze error', e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
