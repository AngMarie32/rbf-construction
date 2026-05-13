import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Pull envelopes that have reminders enabled and aren't done.
    const { data: envelopes, error } = await supabase
      .from('esign_envelopes')
      .select('*')
      .not('reminder_cadence_days', 'is', null)
      .in('status', ['sent', 'partially_signed']);
    if (error) throw error;

    const PUBLIC_APP_URL = 'https://rbf-construction.lovable.app';
    const now = Date.now();
    const results: any[] = [];

    for (const env of envelopes || []) {
      const cadenceMs = (env.reminder_cadence_days as number) * 24 * 60 * 60 * 1000;
      const last = env.last_reminder_sent_at
        ? new Date(env.last_reminder_sent_at).getTime()
        : env.sent_at
          ? new Date(env.sent_at).getTime()
          : new Date(env.created_at).getTime();
      if (now - last < cadenceMs) continue;

      // Expiry check
      if (env.expires_at && new Date(env.expires_at).getTime() < now) {
        await supabase.from('esign_envelopes').update({ status: 'expired' }).eq('id', env.id);
        continue;
      }

      const { data: signers } = await supabase
        .from('esign_signers').select('*').eq('envelope_id', env.id).order('order_index');
      if (!signers?.length) continue;

      let pending = signers.filter((s: any) => s.status !== 'signed');
      if (env.signing_order === 'sequential') pending = pending.slice(0, 1);

      for (const signer of pending) {
        const link = `${PUBLIC_APP_URL}/sign/${signer.access_token}`;
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a202c">
            <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:24px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:22px">Reminder: Signature still needed</h1>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <p>Hi ${signer.name},</p>
              <p>This is a friendly reminder to sign <strong>${env.title}</strong>.</p>
              <a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;margin:24px 0">Review & Sign</a>
              <p style="color:#718096;font-size:14px">If the button doesn't work, paste this URL: ${link}</p>
            </div>
          </div>`;

        if (RESEND_API_KEY) {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'RBF Construction <noreply@portal.rbfconstruction.com>',
              to: [signer.email],
              subject: `Reminder: ${env.title}`,
              html,
            }),
          });
          results.push({ envelope: env.id, signer: signer.email, ok: r.ok });
        } else {
          results.push({ envelope: env.id, signer: signer.email, simulated: true });
        }

        await supabase.from('esign_audit_events').insert({
          envelope_id: env.id, signer_id: signer.id,
          event_type: 'reminder_sent',
          actor_email: signer.email, actor_name: signer.name,
        });
      }

      await supabase.from('esign_envelopes').update({
        last_reminder_sent_at: new Date().toISOString(),
        reminder_count: (env.reminder_count || 0) + 1,
      }).eq('id', env.id);
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('esign-send-reminders error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});