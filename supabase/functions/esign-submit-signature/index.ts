import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

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
      // === Generate flattened signed PDF ===
      let signedPdfPath: string | null = null;
      let signedPdfBytes: Uint8Array | null = null;
      try {
        if (envelope?.original_pdf_path) {
          const { data: origFile } = await supabase.storage
            .from('esign-documents')
            .download(envelope.original_pdf_path);
          if (origFile) {
            const origBytes = new Uint8Array(await origFile.arrayBuffer());
            const pdfDoc = await PDFDocument.load(origBytes);
            const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

            const { data: allFields } = await supabase
              .from('esign_fields').select('*').eq('envelope_id', signer.envelope_id);

            const signerById: Record<string, any> = {};
            (allSigners || []).forEach(s => { signerById[s.id] = s; });

            const pages = pdfDoc.getPages();
            for (const f of (allFields || [])) {
              const pageIdx = (f.page_number || 1) - 1;
              if (pageIdx < 0 || pageIdx >= pages.length) continue;
              const page = pages[pageIdx];
              const pw = page.getWidth();
              const ph = page.getHeight();
              const x = (Number(f.x_pct) / 100) * pw;
              const w = (Number(f.width_pct) / 100) * pw;
              const h = (Number(f.height_pct) / 100) * ph;
              // y_pct is from top in our editor; pdf-lib y is from bottom
              const yTop = (Number(f.y_pct) / 100) * ph;
              const y = ph - yTop - h;

              const fSigner = f.signer_id ? signerById[f.signer_id] : null;

              if ((f.field_type === 'signature' || f.field_type === 'initial') && fSigner?.signature_data) {
                try {
                  const dataUrl: string = fSigner.signature_data;
                  const isPng = dataUrl.startsWith('data:image/png');
                  const base64 = dataUrl.split(',')[1];
                  const bin = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                  const img = isPng ? await pdfDoc.embedPng(bin) : await pdfDoc.embedJpg(bin);
                  const dims = img.scaleToFit(w, h);
                  page.drawImage(img, {
                    x, y: y + (h - dims.height) / 2,
                    width: dims.width, height: dims.height,
                  });
                } catch (imgErr) {
                  console.error('Failed to embed signature image:', imgErr);
                }
              } else {
                const textValue = f.value
                  || (f.field_type === 'date' && fSigner?.signed_at ? new Date(fSigner.signed_at).toLocaleDateString() : '')
                  || (f.field_type === 'name' && fSigner?.name ? fSigner.name : '');
                if (textValue) {
                  const fontSize = Math.max(8, Math.min(h * 0.6, 12));
                  page.drawText(String(textValue), {
                    x: x + 2, y: y + (h - fontSize) / 2,
                    size: fontSize, font: helv, color: rgb(0, 0, 0),
                  });
                }
              }
            }

            // Append a certificate of completion page
            const certPage = pdfDoc.addPage();
            const { width: cw, height: ch } = certPage.getSize();
            const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            certPage.drawText('Certificate of Completion', {
              x: 50, y: ch - 60, size: 20, font: helvBold, color: rgb(0, 0, 0),
            });
            certPage.drawText(`Document: ${envelope.title}`, {
              x: 50, y: ch - 100, size: 12, font: helv,
            });
            certPage.drawText(`Envelope ID: ${envelope.id}`, {
              x: 50, y: ch - 118, size: 10, font: helv, color: rgb(0.4, 0.4, 0.4),
            });
            certPage.drawText(`Completed: ${new Date().toLocaleString()}`, {
              x: 50, y: ch - 136, size: 10, font: helv, color: rgb(0.4, 0.4, 0.4),
            });
            let cy = ch - 180;
            certPage.drawText('Signers:', { x: 50, y: cy, size: 14, font: helvBold });
            cy -= 24;
            for (const s of (allSigners || [])) {
              certPage.drawText(`• ${s.name} <${s.email}>`, { x: 60, y: cy, size: 11, font: helv });
              cy -= 16;
              const meta = `   Signed: ${s.signed_at ? new Date(s.signed_at).toLocaleString() : '—'}  •  IP: ${s.ip_address || '—'}`;
              certPage.drawText(meta, { x: 60, y: cy, size: 9, font: helv, color: rgb(0.4, 0.4, 0.4) });
              cy -= 22;
            }

            signedPdfBytes = await pdfDoc.save();
            signedPdfPath = `${envelope.created_by}/${envelope.id}/signed.pdf`;
            const { error: upErr } = await supabase.storage
              .from('esign-documents')
              .upload(signedPdfPath, signedPdfBytes, {
                upsert: true, contentType: 'application/pdf',
              });
            if (upErr) throw upErr;
          }
        }
      } catch (pdfErr) {
        console.error('Signed PDF generation failed:', pdfErr);
      }

      await supabase.from('esign_envelopes').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        signed_pdf_path: signedPdfPath,
      }).eq('id', signer.envelope_id);

      await supabase.from('esign_audit_events').insert({
        envelope_id: signer.envelope_id, event_type: 'envelope_completed',
      });

      // Create a document record so it appears in the project's Documents area
      if (signedPdfPath && envelope) {
        try {
          await supabase.from('documents').insert({
            project_id: envelope.project_id,
            name: `${envelope.title} (Signed).pdf`,
            category: 'Signed Documents',
            file_path: signedPdfPath,
            mime_type: 'application/pdf',
            file_size: signedPdfBytes ? signedPdfBytes.byteLength : null,
            uploaded_by: envelope.created_by,
            description: `Signed e-signature envelope • ${(allSigners || []).map(s => s.name).join(', ')}`,
            tags: ['esign', 'signed'],
          });
        } catch (docErr) {
          console.error('Failed to create document record:', docErr);
        }
      }

      // Send completion emails to contractor + all signers
      if (RESEND_API_KEY && envelope) {
        // Get contractor email
        const { data: contractor } = await supabase.auth.admin.getUserById(envelope.created_by);
        const recipients = [
          ...(contractor?.user?.email ? [{ email: contractor.user.email, name: 'Contractor' }] : []),
          ...allSigners!.map(s => ({ email: s.email, name: s.name })),
        ];

        // Build attachment from signed PDF
        let attachments: any[] | undefined;
        if (signedPdfBytes) {
          // base64 encode
          let binary = '';
          const chunk = 0x8000;
          for (let i = 0; i < signedPdfBytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, Array.from(signedPdfBytes.subarray(i, i + chunk)) as any);
          }
          const b64 = btoa(binary);
          attachments = [{
            filename: `${envelope.title.replace(/[^a-z0-9-_ ]/gi, '_')}-signed.pdf`,
            content: b64,
          }];
        }

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
                <p style="margin-top:16px">A signed copy of the document is attached to this email. A certificate of completion is included as the final page.</p>
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
              attachments,
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