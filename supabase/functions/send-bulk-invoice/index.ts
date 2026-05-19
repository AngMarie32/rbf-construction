import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500, headers: corsHeaders });

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const admin = createClient(supabaseUrl, serviceKey);
    const { invoiceIds, combined } = await req.json();
    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return new Response(JSON.stringify({ error: 'invoiceIds required' }), { status: 400, headers: corsHeaders });
    }

    const { data: invoices, error: invErr } = await admin
      .from('bulk_invoices')
      .select('*')
      .in('id', invoiceIds)
      .eq('created_by', userData.user.id);
    if (invErr) throw invErr;

    const results: any[] = [];

    if (combined && invoices && invoices.length > 1) {
      try {
        const attachments: any[] = [];
        for (const inv of invoices) {
          const { data: fileBlob, error: dlErr } = await admin.storage.from('bulk-invoices').download(inv.file_path);
          if (dlErr || !fileBlob) throw new Error(dlErr?.message || `File not found for ${inv.id}`);
          const buf = new Uint8Array(await fileBlob.arrayBuffer());
          let bin = '';
          for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
          attachments.push({ filename: inv.file_name || `invoice-${inv.invoice_number || inv.id}.pdf`, content: btoa(bin) });
        }

        const toSet = new Set<string>();
        const ccSet = new Set<string>();
        for (const inv of invoices) {
          if (inv.recipient_email) toSet.add(inv.recipient_email);
          for (const c of (inv.cc_emails || [])) ccSet.add(c);
        }
        for (const t of toSet) ccSet.delete(t);

        const first = invoices[0];
        const subject = first.subject || `Invoices from RBF Construction`;
        const lines = invoices.map((i: any) => `<li>${i.invoice_number ? `<strong>${i.invoice_number}</strong> — ` : ''}${i.file_name || 'invoice.pdf'}${i.amount ? ` — $${Number(i.amount).toFixed(2)}` : ''}</li>`).join('');
        const html = `<div style="font-family:Arial,sans-serif;color:#222;line-height:1.5">
          <p>Hello,</p>
          <p>${(first.message || 'Please find the attached invoices.').replace(/\n/g, '<br/>')}</p>
          <p><strong>Attached invoices:</strong></p>
          <ul>${lines}</ul>
          <p>Thank you,<br/>RBF Construction</p>
        </div>`;

        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: 'RBF Construction <noreply@portal.rbfconstruction.com>',
            to: Array.from(toSet),
            cc: ccSet.size ? Array.from(ccSet) : undefined,
            subject,
            html,
            attachments,
          }),
        });
        const respJson = await resp.json();
        if (!resp.ok) throw new Error(respJson?.message || 'Resend error');

        for (const inv of invoices) {
          await admin.from('bulk_invoice_sends').insert({
            bulk_invoice_id: inv.id,
            sent_to: Array.from(toSet).join(', '),
            status: 'sent',
            resend_id: respJson?.id,
            file_path: inv.file_path,
          });
          const newCount = (inv.send_count || 0) + 1;
          const update: any = { send_count: newCount, last_sent_at: new Date().toISOString() };
          if (inv.schedule_type === 'monthly') {
            const base = inv.next_send_date ? new Date(inv.next_send_date) : new Date();
            base.setMonth(base.getMonth() + 1);
            update.next_send_date = base.toISOString().slice(0, 10);
            update.status = 'active';
          } else {
            update.status = 'sent';
          }
          await admin.from('bulk_invoices').update(update).eq('id', inv.id);
          results.push({ id: inv.id, ok: true });
        }

        return new Response(JSON.stringify({ results, combined: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e: any) {
        for (const inv of invoices) {
          await admin.from('bulk_invoice_sends').insert({
            bulk_invoice_id: inv.id,
            sent_to: inv.recipient_email,
            status: 'failed',
            error_message: e?.message || String(e),
          });
          results.push({ id: inv.id, ok: false, error: e?.message });
        }
        return new Response(JSON.stringify({ results, combined: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    for (const inv of invoices ?? []) {
      try {
        const { data: fileBlob, error: dlErr } = await admin.storage.from('bulk-invoices').download(inv.file_path);
        if (dlErr || !fileBlob) throw new Error(dlErr?.message || 'File not found');
        const buf = new Uint8Array(await fileBlob.arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        const base64 = btoa(bin);

        const subject = inv.subject || `Invoice${inv.invoice_number ? ' ' + inv.invoice_number : ''} from RBF Construction`;
        const html = `<div style="font-family:Arial,sans-serif;color:#222;line-height:1.5">
          <p>Hello ${inv.recipient_name || ''},</p>
          <p>${(inv.message || 'Please find the attached invoice.').replace(/\n/g, '<br/>')}</p>
          ${inv.invoice_number ? `<p><strong>Invoice #:</strong> ${inv.invoice_number}</p>` : ''}
          ${inv.amount ? `<p><strong>Amount:</strong> $${Number(inv.amount).toFixed(2)}</p>` : ''}
          <p>Thank you,<br/>RBF Construction</p>
        </div>`;

        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: 'RBF Construction <noreply@portal.rbfconstruction.com>',
            to: [inv.recipient_email],
            cc: inv.cc_emails && inv.cc_emails.length ? inv.cc_emails : undefined,
            subject,
            html,
            attachments: [{ filename: inv.file_name || 'invoice.pdf', content: base64 }],
          }),
        });
        const respJson = await resp.json();
        if (!resp.ok) throw new Error(respJson?.message || 'Resend error');

        await admin.from('bulk_invoice_sends').insert({
          bulk_invoice_id: inv.id,
          sent_to: inv.recipient_email,
          status: 'sent',
          resend_id: respJson?.id,
          file_path: inv.file_path,
        });

        const newCount = (inv.send_count || 0) + 1;
        const update: any = { send_count: newCount, last_sent_at: new Date().toISOString() };
        if (inv.schedule_type === 'monthly') {
          const base = inv.next_send_date ? new Date(inv.next_send_date) : new Date();
          base.setMonth(base.getMonth() + 1);
          update.next_send_date = base.toISOString().slice(0, 10);
          update.status = 'active';
        } else {
          update.status = 'sent';
        }
        await admin.from('bulk_invoices').update(update).eq('id', inv.id);

        results.push({ id: inv.id, ok: true });
      } catch (e: any) {
        await admin.from('bulk_invoice_sends').insert({
          bulk_invoice_id: inv.id,
          sent_to: inv.recipient_email,
          status: 'failed',
          error_message: e?.message || String(e),
        });
        results.push({ id: inv.id, ok: false, error: e?.message });
      }
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Server error' }), { status: 500, headers: corsHeaders });
  }
});