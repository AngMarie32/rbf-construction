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

    const { envelopeId, reason, notify } = await req.json();
    if (!envelopeId) throw new Error('envelopeId required');

    const { data: envelope, error } = await supabase
      .from('esign_envelopes').select('*').eq('id', envelopeId).single();
    if (error || !envelope) throw new Error('Envelope not found');
    if (['completed', 'voided'].includes(envelope.status)) {
      throw new Error(`Envelope is already ${envelope.status}`);
    }

    await supabase.from('esign_envelopes').update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      void_reason: reason || null,
    }).eq('id', envelopeId);

    await supabase.from('esign_audit_events').insert({
      envelope_id: envelopeId,
      event_type: 'envelope_voided',
      metadata: { reason: reason || null },
    });

    const results: any[] = [];
    if (notify) {
      const { data: signers } = await supabase
        .from('esign_signers').select('*').eq('envelope_id', envelopeId);
      const pending = (signers || []).filter((s: any) => s.status !== 'signed');
      for (const signer of pending) {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a202c">
            <div style="background:#dc2626;padding:24px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:22px">Document Cancelled</h1>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
              <p>Hi ${signer.name},</p>
              <p>The document <strong>${envelope.title}</strong> has been cancelled and no longer requires your signature.</p>
              ${reason ? `<div style="background:#f7fafc;padding:16px;border-left:4px solid #dc2626;margin:16px 0;border-radius:4px"><strong>Reason:</strong> ${reason}</div>` : ''}
              <p style="color:#718096;font-size:14px">No action is required from you.</p>
            </div>
          </div>`;
        if (RESEND_API_KEY) {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'RBF Construction <noreply@portal.rbfconstruction.com>',
              to: [signer.email],
              subject: `Cancelled: ${envelope.title}`,
              html,
            }),
          });
          results.push({ signer: signer.email, ok: r.ok });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, notified: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('esign-void-envelope error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});