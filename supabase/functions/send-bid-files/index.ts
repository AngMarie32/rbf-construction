import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Emails bid files to selected subcontractors. Each recipient gets their own
// email (no shared To: list) with secure download links, so large plan sets
// are not limited by attachment size.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const ALLOWED_BUCKETS = new Set(['project-documents', 'bulk-invoices', 'esign-documents', 'plan_documents']);
const LINK_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return json({ error: 'RESEND_API_KEY not configured' }, 500);

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: 'Unauthorized' }, 401);
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { subject, message, projectName, dueDate, recipients, files, replyTo } = await req.json();
    if (!Array.isArray(recipients) || !recipients.length) return json({ error: 'Pick at least one subcontractor' }, 400);
    if (!Array.isArray(files) || !files.length) return json({ error: 'Pick at least one file' }, 400);
    if (recipients.length > 200) return json({ error: 'Send to 200 or fewer at a time' }, 400);

    // Sign each file once; every recipient gets the same links.
    const links: { name: string; url: string }[] = [];
    for (const f of files) {
      if (!ALLOWED_BUCKETS.has(f.bucket)) return json({ error: `File storage "${f.bucket}" is not allowed` }, 400);
      if (/^https?:\/\//.test(f.path)) {
        links.push({ name: f.name, url: f.path });
        continue;
      }
      const { data, error } = await admin.storage.from(f.bucket).createSignedUrl(f.path, LINK_DAYS * 86400, { download: f.name });
      if (error || !data?.signedUrl) return json({ error: `Couldn't prepare "${f.name}": ${error?.message || 'not found'}` }, 400);
      links.push({ name: f.name, url: data.signedUrl });
    }

    const due = dueDate ? new Date(`${dueDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : null;
    const results: { email: string; ok: boolean; error?: string }[] = [];
    for (const r of recipients) {
      if (!r?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
        results.push({ email: r?.email || '(none)', ok: false, error: 'No valid email' });
        continue;
      }
      const html = `<div style="font-family:Arial,sans-serif;color:#222;line-height:1.5;max-width:620px">
        <p>Hello ${esc(r.name || '')},</p>
        <p>${esc(message || 'You are invited to bid on the project below. The bid documents are linked here.').replace(/\n/g, '<br/>')}</p>
        ${projectName ? `<p><strong>Project:</strong> ${esc(projectName)}</p>` : ''}
        ${due ? `<p><strong>Bids due:</strong> ${esc(due)}</p>` : ''}
        <p><strong>Bid documents</strong> (links work for ${LINK_DAYS} days):</p>
        <ul>${links.map((l) => `<li><a href="${l.url}">${esc(l.name)}</a></li>`).join('')}</ul>
        <p>Please reply to this email with any questions or your bid.</p>
        <p>Thank you,<br/>RBF Construction</p>
      </div>`;
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'RBF Construction <noreply@portal.rbfconstruction.com>',
          to: [r.email],
          reply_to: replyTo || userData.user.email || undefined,
          subject: subject || `Invitation to bid${projectName ? `: ${projectName}` : ''}`,
          html,
        }),
      });
      if (resp.ok) results.push({ email: r.email, ok: true });
      else results.push({ email: r.email, ok: false, error: (await resp.text()).slice(0, 200) });
    }
    return json({ results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
