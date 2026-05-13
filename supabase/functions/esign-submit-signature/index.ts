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

    // Only allow updating fields that are assigned to THIS signer.
    // This prevents signer 1 from filling signer 2's fields.
    const incomingIds = Object.keys(fieldValues);
    if (incomingIds.length > 0) {
      const { data: ownedFields } = await supabase
        .from('esign_fields')
        .select('id')
        .eq('envelope_id', signer.envelope_id)
        .eq('signer_id', signer.id)
        .in('id', incomingIds);
      const ownedSet = new Set((ownedFields || []).map((f: any) => f.id));
      for (const [fieldId, value] of Object.entries(fieldValues)) {
        if (!ownedSet.has(fieldId)) continue; // silently ignore fields not owned by this signer
        await supabase.from('esign_fields').update({
          value, filled_at: new Date().toISOString(),
        }).eq('id', fieldId);
      }
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
      let certificatePath: string | null = null;
      let certificateBytes: Uint8Array | null = null;
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

            // === Append a certificate of completion page to the signed PDF ===
            const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const drawCertificate = (doc: PDFDocument, page: any) => {
              const { width: cw, height: ch } = page.getSize();
              page.drawRectangle({ x: 0, y: ch - 80, width: cw, height: 80, color: rgb(0.07, 0.09, 0.15) });
              page.drawText('RBF Construction', {
                x: 50, y: ch - 40, size: 16, font: helvBold, color: rgb(1, 1, 1),
              });
              page.drawText('Certificate of Completion', {
                x: 50, y: ch - 62, size: 12, font: helv, color: rgb(0.85, 0.85, 0.9),
              });
              page.drawText(`Document: ${envelope.title}`, {
                x: 50, y: ch - 120, size: 13, font: helvBold,
              });
              page.drawText(`Envelope ID: ${envelope.id}`, {
                x: 50, y: ch - 140, size: 9, font: helv, color: rgb(0.4, 0.4, 0.4),
              });
              page.drawText(`Completed: ${new Date().toLocaleString()}`, {
                x: 50, y: ch - 156, size: 10, font: helv, color: rgb(0.3, 0.3, 0.3),
              });
              let cy = ch - 200;
              page.drawText('Signers', { x: 50, y: cy, size: 14, font: helvBold });
              cy -= 8;
              page.drawLine({ start: { x: 50, y: cy }, end: { x: cw - 50, y: cy }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
              cy -= 18;
              for (const s of (allSigners || [])) {
                page.drawText(`• ${s.name}`, { x: 60, y: cy, size: 11, font: helvBold });
                page.drawText(`<${s.email}>`, { x: 60 + helvBold.widthOfTextAtSize(`• ${s.name} `, 11), y: cy, size: 11, font: helv, color: rgb(0.35, 0.35, 0.35) });
                cy -= 14;
                const meta = `Signed: ${s.signed_at ? new Date(s.signed_at).toLocaleString() : '—'}  •  IP: ${s.ip_address || '—'}  •  Type: ${s.signature_type || '—'}`;
                page.drawText(meta, { x: 70, y: cy, size: 9, font: helv, color: rgb(0.4, 0.4, 0.4) });
                cy -= 22;
              }
              page.drawText('This certificate verifies the electronic signing of the above document by the signers listed.', {
                x: 50, y: 60, size: 8, font: helv, color: rgb(0.5, 0.5, 0.5),
              });
              page.drawText('Generated by RBF Construction E-Sign', {
                x: 50, y: 48, size: 8, font: helv, color: rgb(0.5, 0.5, 0.5),
              });
            };

            drawCertificate(pdfDoc, pdfDoc.addPage());
            signedPdfBytes = await pdfDoc.save();

            // Also build a STANDALONE certificate PDF
            const certDoc = await PDFDocument.create();
            const certHelv = await certDoc.embedFont(StandardFonts.Helvetica);
            const certHelvBold = await certDoc.embedFont(StandardFonts.HelveticaBold);
            const certPage = certDoc.addPage();
            // Re-draw using the cert document's fonts
            const { width: cw, height: ch } = certPage.getSize();
            certPage.drawRectangle({ x: 0, y: ch - 80, width: cw, height: 80, color: rgb(0.07, 0.09, 0.15) });
            certPage.drawText('RBF Construction', { x: 50, y: ch - 40, size: 16, font: certHelvBold, color: rgb(1, 1, 1) });
            certPage.drawText('Certificate of Completion', { x: 50, y: ch - 62, size: 12, font: certHelv, color: rgb(0.85, 0.85, 0.9) });
            certPage.drawText(`Document: ${envelope.title}`, { x: 50, y: ch - 120, size: 13, font: certHelvBold });
            certPage.drawText(`Envelope ID: ${envelope.id}`, { x: 50, y: ch - 140, size: 9, font: certHelv, color: rgb(0.4, 0.4, 0.4) });
            certPage.drawText(`Completed: ${new Date().toLocaleString()}`, { x: 50, y: ch - 156, size: 10, font: certHelv, color: rgb(0.3, 0.3, 0.3) });
            let ccy = ch - 200;
            certPage.drawText('Signers', { x: 50, y: ccy, size: 14, font: certHelvBold });
            ccy -= 8;
            certPage.drawLine({ start: { x: 50, y: ccy }, end: { x: cw - 50, y: ccy }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
            ccy -= 18;
            for (const s of (allSigners || [])) {
              certPage.drawText(`• ${s.name}  <${s.email}>`, { x: 60, y: ccy, size: 11, font: certHelvBold });
              ccy -= 14;
              const meta = `Signed: ${s.signed_at ? new Date(s.signed_at).toLocaleString() : '—'}  •  IP: ${s.ip_address || '—'}  •  Type: ${s.signature_type || '—'}`;
              certPage.drawText(meta, { x: 70, y: ccy, size: 9, font: certHelv, color: rgb(0.4, 0.4, 0.4) });
              ccy -= 22;
            }
            certPage.drawText('This certificate verifies the electronic signing of the above document.', {
              x: 50, y: 60, size: 8, font: certHelv, color: rgb(0.5, 0.5, 0.5),
            });
            certificateBytes = await certDoc.save();

            signedPdfPath = `${envelope.created_by}/${envelope.id}/signed.pdf`;
            const { error: upErr } = await supabase.storage
              .from('esign-documents')
              .upload(signedPdfPath, signedPdfBytes, {
                upsert: true, contentType: 'application/pdf',
              });
            if (upErr) throw upErr;

            certificatePath = `${envelope.created_by}/${envelope.id}/certificate.pdf`;
            const { error: certUpErr } = await supabase.storage
              .from('esign-documents')
              .upload(certificatePath, certificateBytes, {
                upsert: true, contentType: 'application/pdf',
              });
            if (certUpErr) throw certUpErr;
          }
        }
      } catch (pdfErr) {
        console.error('Signed PDF generation failed:', pdfErr);
      }

      await supabase.from('esign_envelopes').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        signed_pdf_path: signedPdfPath,
        certificate_path: certificatePath,
      }).eq('id', signer.envelope_id);

      await supabase.from('esign_audit_events').insert({
        envelope_id: signer.envelope_id, event_type: 'envelope_completed',
      });

      // Update source record status when fully signed
      if (envelope?.source_type && envelope?.source_id) {
        try {
          if (envelope.source_type === 'change_order') {
            await supabase.from('change_orders')
              .update({ status: 'Approved' })
              .eq('id', envelope.source_id);
          } else if (envelope.source_type === 'proposal') {
            await supabase.from('proposals')
              .update({ status: 'Signed' })
              .eq('id', envelope.source_id);
          } else if (envelope.source_type === 'invoice') {
            // Payment Application
            // No "status" column on payment_applications_g702; record signature meta
            await supabase.from('payment_applications_g702')
              .update({ contractor_date: new Date().toISOString().slice(0, 10) })
              .eq('id', envelope.source_id);
          } else if (envelope.source_type === 'subcontractor') {
            // No status column; skip silently
          }
        } catch (statusErr) {
          console.error('Failed to update source status:', statusErr);
        }
      }

      // Create document records so the signed PDF + certificate appear in
      // the project's Documents area (and the global Documents page).
      if (signedPdfPath && envelope) {
        try {
          await supabase.from('documents').insert({
            project_id: envelope.project_id,
            name: `${envelope.title} (Signed).pdf`,
            category: envelope.project_id ? 'Contracts' : 'Signed Documents',
            file_path: signedPdfPath,
            mime_type: 'application/pdf',
            file_size: signedPdfBytes ? signedPdfBytes.byteLength : null,
            uploaded_by: envelope.created_by,
            description: `Signed e-signature envelope • ${(allSigners || []).map(s => s.name).join(', ')}`,
            tags: ['esign', 'signed'],
            source_type: envelope.source_type,
            source_id: envelope.source_id,
          });
          if (certificatePath) {
            await supabase.from('documents').insert({
              project_id: envelope.project_id,
              name: `${envelope.title} – Certificate of Completion.pdf`,
              category: envelope.project_id ? 'Contracts' : 'Signed Documents',
              file_path: certificatePath,
              mime_type: 'application/pdf',
              file_size: certificateBytes ? certificateBytes.byteLength : null,
              uploaded_by: envelope.created_by,
              description: `Certificate of completion for ${envelope.title}`,
              tags: ['esign', 'certificate'],
              source_type: envelope.source_type,
              source_id: envelope.source_id,
            });
          }
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

        // Build attachments: signed PDF + certificate
        const toB64 = (bytes: Uint8Array) => {
          let binary = '';
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
          }
          return btoa(binary);
        };
        const safeName = envelope.title.replace(/[^a-z0-9-_ ]/gi, '_');
        const attachments: any[] = [];
        if (signedPdfBytes) attachments.push({ filename: `${safeName}-signed.pdf`, content: toB64(signedPdfBytes) });
        if (certificateBytes) attachments.push({ filename: `${safeName}-certificate.pdf`, content: toB64(certificateBytes) });

        for (const r of recipients) {
          const html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a202c">
              <div style="background:#0f172a;padding:24px;border-radius:8px 8px 0 0">
                <p style="color:#94a3b8;margin:0 0 4px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase">RBF Construction</p>
                <h1 style="color:#fff;margin:0;font-size:24px">✓ Document Fully Signed</h1>
              </div>
              <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
                <p>Hi ${r.name},</p>
                <p><strong>${envelope.title}</strong> has been signed by all parties.</p>
                <p>Signers:</p>
                <ul>${allSigners!.map(s => `<li>${s.name} (${s.email}) — signed ${new Date(s.signed_at!).toLocaleString()}</li>`).join('')}</ul>
                <p style="margin-top:16px">A signed copy of the document and the certificate of completion are attached.</p>
                <p style="color:#64748b;font-size:12px;margin-top:24px">Sent by RBF Construction</p>
              </div>
            </div>
          `;
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'RBF Construction <onboarding@resend.dev>',
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
            from: 'RBF Construction <onboarding@resend.dev>', to: [next.email],
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