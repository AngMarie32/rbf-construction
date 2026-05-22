import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SECTIONS = ['projects', 'financials', 'schedule', 'documents'] as const;
type Section = typeof SECTIONS[number];

interface Sub {
  id: string;
  user_id: string;
  name: string;
  sections: string[];
  recipients: string[];
  day_of_week: number;
  hour: number;
  timezone: string;
  project_ids: string[] | null;
  enabled: boolean;
  next_send_at: string | null;
}

function fmtMoney(n: number | null | undefined) {
  const v = Number(n || 0);
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function gatherData(admin: any, sub: Sub) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const isoWeekAgo = weekAgo.toISOString();
  const isoNow = now.toISOString();
  const dateWeekAgo = weekAgo.toISOString().slice(0, 10);
  const dateWeekFromNow = weekFromNow.toISOString().slice(0, 10);
  const dateNow = now.toISOString().slice(0, 10);

  const projectFilter = (q: any, col = 'project_id') =>
    sub.project_ids && sub.project_ids.length ? q.in(col, sub.project_ids) : q;

  const data: any = {};

  if (sub.sections.includes('projects')) {
    let q = admin.from('projects').select('id,name,status,contract_value,completion_percentage,due_date');
    if (sub.project_ids && sub.project_ids.length) q = q.in('id', sub.project_ids);
    const { data: projects } = await q;
    data.projects = projects || [];
  }

  if (sub.sections.includes('financials')) {
    let pq = admin.from('projects').select('id,name,contract_value');
    if (sub.project_ids?.length) pq = pq.in('id', sub.project_ids);
    const { data: projects } = await pq;
    let bq = projectFilter(admin.from('project_billing').select('project_id,billed_amount,paid_amount,remaining_amount'));
    const { data: billing } = await bq;
    data.financials = (projects || []).map((p: any) => {
      const rows = (billing || []).filter((b: any) => b.project_id === p.id);
      const billed = rows.reduce((s: number, b: any) => s + Number(b.billed_amount || 0), 0);
      const paid = rows.reduce((s: number, b: any) => s + Number(b.paid_amount || 0), 0);
      const outstanding = rows.reduce((s: number, b: any) => s + Number(b.remaining_amount || 0), 0);
      return { name: p.name, contract: Number(p.contract_value || 0), billed, paid, outstanding };
    });
  }

  if (sub.sections.includes('schedule')) {
    let tq = projectFilter(admin.from('tasks').select('id,project_id,title,start_date,end_date,status,progress'));
    const { data: tasks } = await tq;
    const all = tasks || [];
    data.schedule = {
      completed: all.filter((t: any) => t.status === 'Completed' && t.end_date >= dateWeekAgo && t.end_date <= dateNow),
      upcoming: all.filter((t: any) => t.status !== 'Completed' && t.start_date >= dateNow && t.start_date <= dateWeekFromNow),
      overdue: all.filter((t: any) => t.status !== 'Completed' && t.end_date < dateNow),
    };
  }

  if (sub.sections.includes('documents')) {
    let coq = projectFilter(admin.from('change_orders').select('id,project_id,number,description,amount,status,date,created_at').gte('created_at', isoWeekAgo));
    const { data: changeOrders } = await coq;

    let biq = admin
      .from('bulk_invoice_sends')
      .select('id,sent_at,sent_to,status,bulk_invoices!inner(id,recipient_name,file_name,invoice_number,project_id,created_by)')
      .gte('sent_at', isoWeekAgo)
      .eq('bulk_invoices.created_by', sub.user_id);
    const { data: docSends } = await biq;
    const filteredSends = (docSends || []).filter((s: any) =>
      !sub.project_ids?.length ? true : sub.project_ids.includes(s.bulk_invoices?.project_id)
    );

    data.documents = { changeOrders: changeOrders || [], sends: filteredSends };
  }

  return data;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function buildHtml(sub: Sub, data: any) {
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let body = '';

  if (sub.sections.includes('projects') && data.projects) {
    const rows = data.projects.map((p: any) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(p.name)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(p.status || '')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${p.completion_percentage ?? 0}%</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(p.contract_value)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${p.due_date || ''}</td></tr>`
    ).join('') || `<tr><td colspan="5" style="padding:12px;color:#888">No projects.</td></tr>`;
    body += `<h2 style="font-family:Arial;color:#111;margin-top:24px">Project Status & Progress</h2>
      <table style="width:100%;border-collapse:collapse;font-family:Arial;font-size:13px"><thead>
      <tr style="background:#f4f4f4"><th style="text-align:left;padding:8px">Project</th><th style="text-align:left;padding:8px">Status</th><th style="text-align:right;padding:8px">% Complete</th><th style="text-align:right;padding:8px">Contract</th><th style="text-align:left;padding:8px">Due</th></tr>
      </thead><tbody>${rows}</tbody></table>`;
  }

  if (sub.sections.includes('financials') && data.financials) {
    const rows = data.financials.map((f: any) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(f.name)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(f.contract)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(f.billed)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(f.paid)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(f.outstanding)}</td></tr>`
    ).join('') || `<tr><td colspan="5" style="padding:12px;color:#888">No financial data.</td></tr>`;
    body += `<h2 style="font-family:Arial;color:#111;margin-top:24px">Financials</h2>
      <table style="width:100%;border-collapse:collapse;font-family:Arial;font-size:13px"><thead>
      <tr style="background:#f4f4f4"><th style="text-align:left;padding:8px">Project</th><th style="text-align:right;padding:8px">Contract</th><th style="text-align:right;padding:8px">Billed</th><th style="text-align:right;padding:8px">Paid</th><th style="text-align:right;padding:8px">Outstanding</th></tr>
      </thead><tbody>${rows}</tbody></table>`;
  }

  if (sub.sections.includes('schedule') && data.schedule) {
    const renderTasks = (arr: any[], empty: string) =>
      arr.length
        ? '<ul style="margin:4px 0 12px 20px;padding:0;font-family:Arial;font-size:13px">' +
          arr.map((t: any) => `<li>${escapeHtml(t.title)} — ${escapeHtml(t.status)} (${t.start_date} → ${t.end_date})</li>`).join('') +
          '</ul>'
        : `<p style="color:#888;font-family:Arial;font-size:13px;margin:4px 0 12px">${empty}</p>`;
    body += `<h2 style="font-family:Arial;color:#111;margin-top:24px">Schedule & Tasks</h2>
      <h3 style="font-family:Arial;color:#111;font-size:14px;margin:8px 0 0">Completed last 7 days (${data.schedule.completed.length})</h3>
      ${renderTasks(data.schedule.completed, 'None.')}
      <h3 style="font-family:Arial;color:#111;font-size:14px;margin:8px 0 0">Upcoming next 7 days (${data.schedule.upcoming.length})</h3>
      ${renderTasks(data.schedule.upcoming, 'None.')}
      <h3 style="font-family:Arial;color:#b91c1c;font-size:14px;margin:8px 0 0">Overdue (${data.schedule.overdue.length})</h3>
      ${renderTasks(data.schedule.overdue, 'None.')}`;
  }

  if (sub.sections.includes('documents') && data.documents) {
    const co = data.documents.changeOrders;
    const sends = data.documents.sends;
    const coRows = co.map((c: any) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(c.number || '')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(c.description || '')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(c.status || '')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(c.amount)}</td></tr>`
    ).join('') || `<tr><td colspan="4" style="padding:12px;color:#888">No new change orders.</td></tr>`;
    const sendRows = sends.map((s: any) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${new Date(s.sent_at).toLocaleDateString()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(s.bulk_invoices?.file_name || '')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(s.sent_to || '')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(s.status || '')}</td></tr>`
    ).join('') || `<tr><td colspan="4" style="padding:12px;color:#888">No documents sent.</td></tr>`;
    body += `<h2 style="font-family:Arial;color:#111;margin-top:24px">Documents & Change Orders</h2>
      <h3 style="font-family:Arial;color:#111;font-size:14px;margin:8px 0 4px">Change orders (last 7 days)</h3>
      <table style="width:100%;border-collapse:collapse;font-family:Arial;font-size:13px"><thead>
      <tr style="background:#f4f4f4"><th style="text-align:left;padding:8px">No.</th><th style="text-align:left;padding:8px">Description</th><th style="text-align:left;padding:8px">Status</th><th style="text-align:right;padding:8px">Amount</th></tr>
      </thead><tbody>${coRows}</tbody></table>
      <h3 style="font-family:Arial;color:#111;font-size:14px;margin:16px 0 4px">Documents sent (last 7 days)</h3>
      <table style="width:100%;border-collapse:collapse;font-family:Arial;font-size:13px"><thead>
      <tr style="background:#f4f4f4"><th style="text-align:left;padding:8px">Sent</th><th style="text-align:left;padding:8px">File</th><th style="text-align:left;padding:8px">To</th><th style="text-align:left;padding:8px">Status</th></tr>
      </thead><tbody>${sendRows}</tbody></table>`;
  }

  return `<div style="max-width:760px;margin:0 auto;padding:20px;color:#222">
    <div style="border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:8px">
      <h1 style="font-family:Arial;margin:0;font-size:22px">${escapeHtml(sub.name)}</h1>
      <p style="font-family:Arial;color:#666;margin:4px 0 0;font-size:13px">RBF Construction — Weekly Recap for ${fmtDate(periodStart)} – ${fmtDate(periodEnd)}</p>
    </div>
    ${body}
    <p style="font-family:Arial;color:#888;font-size:11px;margin-top:32px;border-top:1px solid #eee;padding-top:12px">
      Generated automatically by RBF Construction Portal. Manage your weekly reports in the portal under Weekly Reports.
    </p>
  </div>`;
}

async function buildPdf(sub: Sub, data: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  const margin = 40;
  let y = 752;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([612, 792]);
      y = 752;
    }
  };
  const text = (s: string, opts: { size?: number; bold?: boolean; color?: any } = {}) => {
    const size = opts.size || 10;
    ensureSpace(size + 4);
    page.drawText(s.slice(0, 200), { x: margin, y, size, font: opts.bold ? bold : font, color: opts.color || rgb(0, 0, 0) });
    y -= size + 4;
  };
  const hr = () => { ensureSpace(8); page.drawLine({ start: { x: margin, y }, end: { x: 612 - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) }); y -= 8; };

  text(sub.name, { size: 18, bold: true });
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  text(`RBF Construction — ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`, { size: 10, color: rgb(0.4, 0.4, 0.4) });
  hr();

  if (sub.sections.includes('projects') && data.projects) {
    text('Project Status & Progress', { size: 14, bold: true });
    for (const p of data.projects) {
      text(`• ${p.name} — ${p.status || ''} — ${p.completion_percentage ?? 0}% — ${fmtMoney(p.contract_value)}`);
    }
    if (!data.projects.length) text('No projects.', { color: rgb(0.5, 0.5, 0.5) });
    hr();
  }
  if (sub.sections.includes('financials') && data.financials) {
    text('Financials', { size: 14, bold: true });
    for (const f of data.financials) {
      text(`• ${f.name}: Contract ${fmtMoney(f.contract)} | Billed ${fmtMoney(f.billed)} | Paid ${fmtMoney(f.paid)} | Outstanding ${fmtMoney(f.outstanding)}`);
    }
    if (!data.financials.length) text('No financial data.', { color: rgb(0.5, 0.5, 0.5) });
    hr();
  }
  if (sub.sections.includes('schedule') && data.schedule) {
    text('Schedule & Tasks', { size: 14, bold: true });
    text(`Completed last 7 days (${data.schedule.completed.length})`, { bold: true });
    for (const t of data.schedule.completed) text(`• ${t.title} (${t.end_date})`);
    text(`Upcoming next 7 days (${data.schedule.upcoming.length})`, { bold: true });
    for (const t of data.schedule.upcoming) text(`• ${t.title} (${t.start_date} → ${t.end_date})`);
    text(`Overdue (${data.schedule.overdue.length})`, { bold: true, color: rgb(0.7, 0.1, 0.1) });
    for (const t of data.schedule.overdue) text(`• ${t.title} (due ${t.end_date})`);
    hr();
  }
  if (sub.sections.includes('documents') && data.documents) {
    text('Documents & Change Orders', { size: 14, bold: true });
    text(`Change orders (${data.documents.changeOrders.length})`, { bold: true });
    for (const c of data.documents.changeOrders) text(`• #${c.number || ''} ${c.description || ''} — ${c.status || ''} — ${fmtMoney(c.amount)}`);
    text(`Documents sent (${data.documents.sends.length})`, { bold: true });
    for (const s of data.documents.sends) text(`• ${new Date(s.sent_at).toLocaleDateString()} — ${s.bulk_invoices?.file_name || ''} → ${s.sent_to}`);
  }

  return await pdf.save();
}

async function sendOne(admin: any, resendKey: string, sub: Sub, isTest: boolean) {
  if (!sub.recipients || sub.recipients.length === 0) {
    await admin.from('weekly_report_runs').insert({ subscription_id: sub.id, status: 'failed', error_message: 'No recipients', sections: sub.sections, is_test: isTest });
    return { ok: false, error: 'No recipients' };
  }
  try {
    const data = await gatherData(admin, sub);
    const html = buildHtml(sub, data);
    const pdfBytes = await buildPdf(sub, data);
    let bin = '';
    for (let i = 0; i < pdfBytes.length; i++) bin += String.fromCharCode(pdfBytes[i]);
    const pdfB64 = btoa(bin);
    const periodEnd = new Date();
    const subject = `${sub.name} — Week of ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${isTest ? ' (TEST)' : ''}`;
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'RBF Construction <noreply@portal.rbfconstruction.com>',
        to: sub.recipients,
        subject,
        html,
        attachments: [{ filename: `weekly-recap-${periodEnd.toISOString().slice(0, 10)}.pdf`, content: pdfB64 }],
      }),
    });
    const respJson = await resp.json();
    if (!resp.ok) throw new Error(respJson?.message || 'Resend error');
    await admin.from('weekly_report_runs').insert({ subscription_id: sub.id, status: 'sent', recipient_count: sub.recipients.length, sections: sub.sections, is_test: isTest });
    if (!isTest) {
      const { data: next } = await admin.rpc('compute_next_weekly_send', { p_day: sub.day_of_week, p_hour: sub.hour, p_tz: sub.timezone, p_after: new Date().toISOString() });
      await admin.from('weekly_report_subscriptions').update({ last_sent_at: new Date().toISOString(), next_send_at: next }).eq('id', sub.id);
    }
    return { ok: true };
  } catch (e: any) {
    await admin.from('weekly_report_runs').insert({ subscription_id: sub.id, status: 'failed', error_message: e?.message || String(e), sections: sub.sections, is_test: isTest });
    return { ok: false, error: e?.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500, headers: corsHeaders });
  const admin = createClient(supabaseUrl, serviceKey);

  let body: any = {};
  try { body = await req.json(); } catch (_) {}
  const isTest = !!body?.test;
  const subscriptionId: string | undefined = body?.subscriptionId;

  try {
    if (isTest && subscriptionId) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      const { data: sub } = await admin.from('weekly_report_subscriptions').select('*').eq('id', subscriptionId).eq('user_id', userData.user.id).single();
      if (!sub) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
      const result = await sendOne(admin, resendKey, sub, true);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Cron mode: process all due subscriptions
    const { data: due } = await admin
      .from('weekly_report_subscriptions')
      .select('*')
      .eq('enabled', true)
      .not('next_send_at', 'is', null)
      .lte('next_send_at', new Date().toISOString());
    const results: any[] = [];
    for (const sub of due || []) {
      results.push({ id: sub.id, ...(await sendOne(admin, resendKey, sub as Sub, false)) });
    }
    return new Response(JSON.stringify({ processed: results.length, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Server error' }), { status: 500, headers: corsHeaders });
  }
});