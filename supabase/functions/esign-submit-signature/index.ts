import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitBody {
  token: string;
  fieldValues: Record<string, string>; // field_id -> value
  signatureData: string; // data URL of signature
  signatureType: 'drawn' | 'typed';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body: SubmitBody = await req.json();
    const { token, fieldValues, signatureData, signatureType } = body;

    const { data: signer } = await supabase
      .from('esign_signers').select('*').eq('access_token', token).single();
    if (!signer) throw new Error('Invalid token');
    if (signer.status === 'signed') throw new Error('Already signed');

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const ua = req.headers.get('user-agent') || 'unknown';

    // Update field values
    for (const [fieldId, value] of Object.entries(fieldValues)) {
      await supabase.from('esign_fields').update({
        value, filled_at: new Date().toISOString(),
      }).eq('id', fieldId);
    }

    // Mark signer as signed
    await supabase.from('esign_signers').update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      signature_data: signatureData,
      signature_type: signatureType,
      ip_address: ip,
      user_agent: ua,
    }).eq('id', signer.id);

    await supabase.from('esign_audit_events').insert({
      envelope_id: signer.envelope_id, signer_id: signer.id, event_type: 'document_signed',
      actor_email: signer.email, actor_name: signer.name,
      ip_address: ip, user_agent: ua,
    });

    // Check if all signers have signed
    const { data: allSigners } = await supabase
      .from('esign_signers').select('*').eq('envelope_id', signer.envelope_id).order('order_index');
    const allSigned = allSigners?.every(s => s.status === 'signed');
    const pending = allSigners?.filter(s => s.status === 'pending') || [];

    const { data: envelope } = await supabase
      .from('esign_envelopes').select('*').eq('id', signer.envelope_id).single();

    if (allSigned) {
      await supabase.from('esign_envelopes').update({
        status: 'completed', completed_at: new Date().toISOString(),
      }).eq('id', signer.envelope_id);

      await supabase.from('esign_audit_events').insert({
        envelope_id: signer.envelope_id, event_type: 'envelope_completed',
      });

      // Send completion emails to contractor + all signers
      if (RESEND_API_KEY && envelope) {
        // Get contractor email
        const { data: contractor } = await supabase.auth.admin.getUserById(envelope.created_by);
        const recipients = [
          ...(contractor?.user?.email ? [{ email: contractor.user.email, name: 'Contractor' }] : []),
          ...allSigners!.map(s => ({ email: s.email, name: s.name })),
        ];

        for (const r of recipients) {
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a202c">
              <div style="background:linear-gradient(135deg,#059669,#10b981);padding:24px;border-radius:8px 8px 0 0">
                <h1 style="color:#fff;margin:0;font-size:24px">✓ Document Fully Signed</h1>
              </div>
              <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
                <p>Hi ${r.name},</p>
                <p><strong>${envelope.title}</strong> has been signed by all parties.</p>
                <p>Signers:</p>
                <ul>${allSigners!.map(s => `<li>${s.name} (${s.email}) — signed ${new Date(s.signed_at!).toLocaleString()}</li>`).join('')}</ul>
                <p style="color:#718096;font-size:14px;margin-top:24px">A certificate of completion is available in your dashboard.</p>
              </div>
            </div>
          `;
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'E-Sign <onboarding@resend.dev>',
              to: [r.email],
              subject: `Signed: ${envelope.title}`,
              html,
            }),
          });
        }
      }
    } else {
      await supabase.from('esign_envelopes').update({
        status: 'partially_signed',
      }).eq('id', signer.envelope_id);

      // If sequential, notify next signer
      if (envelope?.signing_order === 'sequential' && pending.length > 0 && RESEND_API_KEY) {
        const next = pending[0];
        const baseUrl = req.headers.get('origin') || '';
        const link = `${baseUrl}/sign/${next.access_token}`;
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2>Your turn to sign: ${envelope.title}</h2>
            <p>Hi ${next.name}, the previous signer has completed their signature. Please review and sign:</p>
            <a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Review & Sign</a>
          </div>`;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'E-Sign <onboarding@resend.dev>', to: [next.email],
            subject: `Your turn: ${envelope.title}`, html,
          }),
        });
        await supabase.from('esign_signers').update({
          status: 'notified', notified_at: new Date().toISOString(),
        }).eq('id', next.id);
      }
    }

    return new Response(JSON.stringify({ success: true, allSigned }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('esign-submit-signature error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});