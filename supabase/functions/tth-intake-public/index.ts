/**
 * TraderTaxHQ — public intake endpoint.
 *
 * Serves the client-facing questionnaire by opaque token, with no Supabase
 * session. Runs on the service role, so it only ever touches the one intake row
 * the token resolves to and only returns the fields the client's own form needs.
 *
 * Actions
 *   get     — load an intake by token
 *   save    — persist a partial answer set (autosave)
 *   submit  — mark the questionnaire submitted
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, token, answers, completion_pct } = await req.json();
    if (!token || typeof token !== 'string' || token.length < 16) {
      return json({ error: 'Invalid link' }, 400);
    }

    const { data: intake, error } = await admin
      .from('tth_intakes')
      .select('id, engagement_id, client_id, tax_year, schema_version, status, answers, completion_pct, token_expires_at, submitted_at')
      .eq('access_token', token)
      .maybeSingle();

    if (error) {
      console.error('intake lookup failed', error);
      return json({ error: 'Could not load this questionnaire' }, 500);
    }
    if (!intake) return json({ error: 'This link is not valid' }, 404);

    if (intake.token_expires_at && new Date(intake.token_expires_at) < new Date()) {
      return json({ error: 'This link has expired. Ask your preparer for a new one.' }, 410);
    }

    // Client-facing context only — never the internal notes or analysis.
    const { data: client } = await admin
      .from('tth_clients')
      .select('display_name')
      .eq('id', intake.client_id)
      .maybeSingle();

    const publicShape = (row: typeof intake) => ({
      tax_year: row.tax_year,
      schema_version: row.schema_version,
      status: row.status,
      answers: row.answers ?? {},
      completion_pct: row.completion_pct,
      submitted_at: row.submitted_at,
      client_name: client?.display_name ?? null,
    });

    switch (action) {
      case 'get':
        return json({ intake: publicShape(intake) });

      case 'save': {
        if (intake.status === 'submitted' || intake.status === 'reviewed') {
          return json({ error: 'This questionnaire has already been submitted.' }, 409);
        }
        const { data: updated, error: saveError } = await admin
          .from('tth_intakes')
          .update({
            answers: answers ?? {},
            completion_pct: typeof completion_pct === 'number' ? completion_pct : intake.completion_pct,
            status: 'in_progress',
          })
          .eq('id', intake.id)
          .select('id, engagement_id, client_id, tax_year, schema_version, status, answers, completion_pct, token_expires_at, submitted_at')
          .single();

        if (saveError) {
          console.error('intake save failed', saveError);
          return json({ error: 'Could not save your answers' }, 500);
        }
        return json({ intake: publicShape(updated) });
      }

      case 'submit': {
        const { data: updated, error: submitError } = await admin
          .from('tth_intakes')
          .update({
            answers: answers ?? intake.answers,
            completion_pct: typeof completion_pct === 'number' ? completion_pct : intake.completion_pct,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', intake.id)
          .select('id, engagement_id, client_id, tax_year, schema_version, status, answers, completion_pct, token_expires_at, submitted_at')
          .single();

        if (submitError) {
          console.error('intake submit failed', submitError);
          return json({ error: 'Could not submit your answers' }, 500);
        }

        await admin
          .from('tth_engagements')
          .update({ status: 'docs_pending' })
          .eq('id', intake.engagement_id)
          .eq('status', 'intake');

        await admin.from('tth_activity').insert({
          client_id: intake.client_id,
          engagement_id: intake.engagement_id,
          kind: 'intake_submitted',
          message: 'Client submitted the intake questionnaire.',
          meta: { completion_pct: updated.completion_pct },
        });

        return json({ intake: publicShape(updated) });
      }

      default:
        return json({ error: `Unknown action "${action}"` }, 400);
    }
  } catch (e) {
    console.error('tth-intake-public error', e);
    return json({ error: 'Something went wrong' }, 500);
  }
});
