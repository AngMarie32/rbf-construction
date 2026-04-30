import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Public endpoint: signer fetches their envelope by access_token
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signer, error: sErr } = await supabase
      .from('esign_signers').select('*').eq('access_token', token).single();
    if (sErr || !signer) {
      return new Response(JSON.stringify({ error: 'Invalid or expired link' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Link expired' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: envelope } = await supabase
      .from('esign_envelopes').select('*').eq('id', signer.envelope_id).single();
    if (envelope && envelope.status === 'voided') {
      return new Response(JSON.stringify({ error: 'This document has been cancelled by the sender.', voided: true, reason: envelope.void_reason }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (envelope && envelope.expires_at && new Date(envelope.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'This document has expired.', expired: true }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: fields } = await supabase
      .from('esign_fields').select('*').eq('envelope_id', signer.envelope_id);
    const { data: allSigners } = await supabase
      .from('esign_signers').select('id,name,email,order_index,status').eq('envelope_id', signer.envelope_id).order('order_index');

    // Generate signed URL for the original PDF
    let pdfUrl: string | null = null;
    if (envelope?.original_pdf_path) {
      const { data: signedUrl } = await supabase.storage
        .from('esign-documents').createSignedUrl(envelope.original_pdf_path, 3600);
      pdfUrl = signedUrl?.signedUrl || null;
    }

    // Mark viewed
    if (signer.status === 'pending' || signer.status === 'notified') {
      await supabase.from('esign_signers').update({
        status: 'viewed', viewed_at: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      }).eq('id', signer.id);

      await supabase.from('esign_audit_events').insert({
        envelope_id: signer.envelope_id, signer_id: signer.id, event_type: 'document_viewed',
        actor_email: signer.email, actor_name: signer.name,
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
      });
    }

    return new Response(JSON.stringify({ signer, envelope, fields, allSigners, pdfUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});