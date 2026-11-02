/**
 * TraderTaxHQ — public state content.
 *
 * Serves the state positions a firm has explicitly published. Everything else
 * in tth_state_positions stays private: the internal `position` field often
 * references a specific client's facts, so only the separate `public_summary`
 * ever leaves the building, and only for rows flagged `is_published`.
 *
 * Read-only, unauthenticated, and it returns nothing that identifies a client.
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
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      // Public marketing content — safe to cache at the edge.
      'Cache-Control': 'public, max-age=300',
    },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    let raw = url.searchParams.get('state') ?? '';
    if (!raw && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      raw = typeof body?.state === 'string' ? body.state : '';
    }
    const state = raw.toUpperCase();

    if (state && !/^[A-Z]{2}$/.test(state)) {
      return json({ error: 'Invalid state' }, 400);
    }

    let query = admin
      .from('tth_state_positions')
      .select('state_code, topic, public_summary, citation, verified_on, published_at')
      .eq('is_published', true)
      .order('state_code')
      .limit(200);

    if (state) query = query.eq('state_code', state);

    const { data, error } = await query;
    if (error) {
      console.error('state content query failed', error);
      return json({ error: 'Could not load state content' }, 500);
    }

    return json({ positions: data ?? [] });
  } catch (e) {
    console.error('tth-state-content error', e);
    return json({ error: 'Something went wrong' }, 500);
  }
});
