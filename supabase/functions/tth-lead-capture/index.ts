/**
 * TraderTaxHQ — public inquiry intake.
 *
 * Accepts a lead from the open inquiry form. No authentication: this is the
 * top of the funnel and anyone with the link can post. Everything it writes is
 * a lead row — never a client, never an engagement — so the worst a junk
 * submission can do is add a row a preparer deletes.
 *
 * Triage is deliberately NOT computed here. The scoring model lives in the app
 * so there is one implementation, and a score arriving from an untrusted client
 * would be meaningless anyway. The leads page recomputes it from these answers.
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

/** Fields the form is allowed to send. Anything else is dropped. */
const ALLOWED_KEYS = new Set([
  'name', 'email', 'phone', 'service_wanted', 'urgency',
  'total_trades', 'trading_days', 'weekly_hours', 'avg_holding_days', 'months_active',
  'instruments', 'trading_is_primary_income',
  'home_state', 'other_states', 'entity_exists', 'entity_count',
  'sec475_elected', 'unsure_475', 'result_last_year',
  'prior_returns_open', 'irs_notices', 'foreign_broker', 'questions',
]);

const MAX_STRING = 2000;

function sanitize(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (typeof value === 'string') out[key] = value.slice(0, MAX_STRING);
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (typeof value === 'boolean') out[key] = value;
    else if (Array.isArray(value)) {
      out[key] = value.filter((v) => typeof v === 'string').slice(0, 20).map((v) => String(v).slice(0, 100));
    }
  }
  return out;
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const answers = sanitize(body?.answers ?? {});

    const name = typeof answers.name === 'string' ? answers.name.trim() : '';
    if (!name) return json({ error: 'Please tell us your name' }, 400);
    if (!isEmail(answers.email)) return json({ error: 'Please enter a valid email address' }, 400);

    // Only accept a company id that actually exists, so the query string
    // cannot be used to probe for or attach to arbitrary values.
    let companyId: string | null = null;
    if (typeof body?.company_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.company_id)) {
      const { data: company } = await admin
        .from('companies')
        .select('id')
        .eq('id', body.company_id)
        .maybeSingle();
      companyId = company?.id ?? null;
    }

    // Light duplicate guard: the same address submitting twice within an hour
    // updates the existing lead rather than creating a second one.
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { data: recent } = await admin
      .from('tth_leads')
      .select('id')
      .eq('email', answers.email)
      .gte('created_at', hourAgo)
      .maybeSingle();

    const payload = {
      company_id: companyId,
      name,
      email: answers.email as string,
      phone: typeof answers.phone === 'string' ? answers.phone : null,
      source: 'inquiry_form',
      status: 'new',
      tax_year: new Date().getFullYear() - 1,
      service_wanted: typeof answers.service_wanted === 'string' ? answers.service_wanted : 'consultation',
      screening: answers,
    };

    const { error } = recent
      ? await admin.from('tth_leads').update(payload).eq('id', recent.id)
      : await admin.from('tth_leads').insert(payload);

    if (error) {
      console.error('lead capture failed', error);
      return json({ error: 'Could not save your inquiry' }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error('tth-lead-capture error', e);
    return json({ error: 'Something went wrong' }, 500);
  }
});
