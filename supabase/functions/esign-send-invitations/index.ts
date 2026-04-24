import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendBody {
  envelopeId: string;
  appUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { envelopeId, appUrl }: SendBody = await req.json();
    if (!envelopeId) {
      return new Response(JSON.stringify({ error: 'envelopeId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: envelope, error: envErr } = await supabase
      .from('esign_envelopes').select('*').eq('id', envelopeId).single();
    if (envErr || !envelope) throw new Error('Envelope not found');

    const { data: signers } = await supabase
      .from('esign_signers').select('*').eq('envelope_id', envelopeId).order('order_index');

    if (!signers?.length) throw new Error('No signers');

    // Determine which signers to notify
    const toNotify = envelope.signing_order === 'sequential'
      ? signers.filter(s => s.status === 'pending').slice(0, 1)
      : signers.filter(s => s.status === 'pending');

    const baseUrl = appUrl || req.headers.get('origin') || 'https://app.example.com';
    const results: any[] = [];

    for (const signer of toNotify) {
      const link = `${baseUrl}/sign/${signer.access_token}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a202c">
          <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:24px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:24px">Signature Requested</h1>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
            <p style="font-size:16px">Hi ${signer.name},</p>
            <p>You've been requested to sign <strong>${envelope.title}</strong>.</p>
            ${envelope.message ? `<div style="background:#f7fafc;padding:16px;border-left:4px solid #3b82f6;margin:16px 0;border-radius:4px">${envelope.message}</div>` : ''}
            <a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;margin:24px 0">Review & Sign Document</a>
            <p style="color:#718096;font-size:14px">This link expires in 30 days. If the button doesn't work, copy this URL: ${link}</p>
          </div>
        </div>
      `;

      if (RESEND_API_KEY) {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'E-Sign <onboarding@resend.dev>',
            to: [signer.email],
            subject: `Signature requested: ${envelope.title}`,
            html,
          }),
        });
        const data = await r.json();
        results.push({ signer: signer.email, ok: r.ok, status: r.status, data, link });
        if (!r.ok) {
          console.error('Resend error for', signer.email, r.status, data);
        }
      } else {
        results.push({ signer: signer.email, ok: false, simulated: true, link });
      }

      await supabase.from('esign_signers').update({
        status: 'notified', notified_at: new Date().toISOString(),
      }).eq('id', signer.id);

      await supabase.from('esign_audit_events').insert({
        envelope_id: envelopeId, signer_id: signer.id, event_type: 'invitation_sent',
        actor_email: signer.email, actor_name: signer.name,
      });
    }

    await supabase.from('esign_envelopes').update({
      status: 'sent', sent_at: new Date().toISOString(),
    }).eq('id', envelopeId);

    const anyFailed = results.some(r => r.ok === false && !r.simulated);
    const allFailed = results.length > 0 && results.every(r => r.ok === false);
    return new Response(JSON.stringify({
      success: !allFailed,
      warning: anyFailed
        ? 'Some emails were rejected by the email provider. With the default Resend sandbox sender (onboarding@resend.dev), Resend only delivers to the email address that owns the Resend account. Verify a domain in Resend and update the sender to send to anyone.'
        : undefined,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('esign-send-invitations error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});