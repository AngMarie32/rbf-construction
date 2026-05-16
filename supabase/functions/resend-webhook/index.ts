import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

// Public webhook (no JWT). Resend sends events: email.sent, email.delivered,
// email.opened, email.bounced, email.complained, email.delivery_delayed.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const payload = await req.json();
    const type: string = payload?.type || '';
    const data = payload?.data || {};
    const emailId: string | undefined = data?.email_id || data?.id;
    if (!emailId) {
      return new Response(JSON.stringify({ ok: true, ignored: 'no email id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { last_event_at: now };
    if (type === 'email.delivered') update.delivered_at = now;
    if (type === 'email.opened') update.opened_at = now;
    if (type === 'email.bounced' || type === 'email.complained') {
      update.status = type === 'email.bounced' ? 'bounced' : 'complained';
      update.error_message = data?.bounce?.message || type;
    }
    await admin.from('bulk_invoice_sends').update(update).eq('resend_id', emailId);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});