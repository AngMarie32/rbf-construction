import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Daily smart-reminder email.
 * - Cron mode (body {cron:true}): emails every Admin profile.
 * - Test mode (body {test:true}, signed-in user): emails only the caller.
 * Rules mirror src/lib/reminders.ts; keep them in sync.
 * Covers overdue invoices, sub insurance, permit inspections (today/tomorrow), permits expiring, job cost jumps.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RULES = { invoiceOverdueDays: 30, insuranceWarningDays: 14, costSpikePct: 10, costSpikeWindowDays: 7, permitWarningDays: 14 };
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

interface Reminder { severity: 'high' | 'medium'; group: string; title: string; detail: string; path: string }

async function buildReminders(admin: any): Promise<Reminder[]> {
  const today = new Date();
  const out: Reminder[] = [];
  const [billing, subs, projects, expenses, inspections, permits] = await Promise.all([
    admin.from('project_billing').select('id, project_id, invoice_number, billed_amount, paid_amount, due_date')
      .not('due_date', 'is', null).lte('due_date', iso(new Date(today.getTime() - RULES.invoiceOverdueDays * DAY))),
    admin.from('subcontractors').select('id, name, company, insurance_expiry')
      .not('insurance_expiry', 'is', null).lte('insurance_expiry', iso(new Date(today.getTime() + RULES.insuranceWarningDays * DAY))),
    admin.from('projects').select('id, name, status'),
    admin.from('expenses').select('project_id, amount, date'),
    admin.from('permit_inspections').select('id, inspection_type, scheduled_date, scheduled_time, permits(permit_type, permit_number, project_id)')
      .eq('result', 'Scheduled').gte('scheduled_date', iso(today)).lte('scheduled_date', iso(new Date(today.getTime() + DAY))),
    admin.from('permits').select('id, project_id, permit_type, permit_number, expiration_date, status')
      .not('expiration_date', 'is', null).gte('expiration_date', iso(today)).lte('expiration_date', iso(new Date(today.getTime() + RULES.permitWarningDays * DAY))),
  ]);

  const name: Record<string, string> = {};
  const open = new Set<string>();
  for (const p of projects.data || []) {
    name[p.id] = p.name;
    if (p.status !== 'Completed' && p.status !== 'Closed') open.add(p.id);
  }

  for (const b of billing.data || []) {
    const owed = (b.billed_amount || 0) - (b.paid_amount || 0);
    if (owed <= 0.005) continue;
    const days = Math.floor((today.getTime() - new Date(b.due_date).getTime()) / DAY);
    if (days < RULES.invoiceOverdueDays) continue;
    out.push({ severity: 'high', group: 'Overdue invoices', title: `${money(owed)} overdue ${days} days`, detail: `${b.invoice_number ? `Invoice ${b.invoice_number} · ` : ''}${name[b.project_id] || 'Unknown project'}`, path: `/billing?project=${b.project_id}` });
  }

  for (const s of subs.data || []) {
    const days = Math.ceil((new Date(s.insurance_expiry).getTime() - today.getTime()) / DAY);
    if (days > RULES.insuranceWarningDays) continue;
    const who = s.company || s.name;
    out.push(days < 0
      ? { severity: 'high', group: 'Subcontractor insurance', title: `${who}: insurance expired`, detail: `Expired ${-days} days ago`, path: '/subcontractors' }
      : { severity: 'medium', group: 'Subcontractor insurance', title: `${who}: expires in ${days} days`, detail: 'Ask for an updated certificate', path: '/subcontractors' });
  }

  for (const i of inspections.data || []) {
    const pm = i.permits as any;
    const isToday = i.scheduled_date === iso(today);
    out.push({ severity: isToday ? 'high' : 'medium', group: 'Inspections', title: `${i.inspection_type} inspection ${isToday ? 'today' : 'tomorrow'}${i.scheduled_time ? ` (${i.scheduled_time})` : ''}`, detail: `${pm ? name[pm.project_id] || 'Unknown job' : 'Unknown job'}${pm ? ` · ${pm.permit_type} permit${pm.permit_number ? ` #${pm.permit_number}` : ''}` : ''}`, path: pm ? `/permits?project=${pm.project_id}` : '/permits' });
  }

  for (const p of permits.data || []) {
    if (['Expired', 'Rejected'].includes(p.status)) continue;
    const days = Math.ceil((new Date(p.expiration_date).getTime() - today.getTime()) / DAY);
    if (days < 0 || days > RULES.permitWarningDays) continue;
    out.push({ severity: days <= 3 ? 'high' : 'medium', group: 'Permits expiring', title: `${p.permit_type} permit expires in ${days} days`, detail: `${name[p.project_id] || 'Unknown job'}${p.permit_number ? ` · #${p.permit_number}` : ''}`, path: `/permits?project=${p.project_id}` });
  }

  const weekStart = iso(new Date(today.getTime() - RULES.costSpikeWindowDays * DAY));
  const before: Record<string, number> = {};
  const week: Record<string, number> = {};
  for (const e of expenses.data || []) {
    if (!open.has(e.project_id)) continue;
    if (e.date >= weekStart) week[e.project_id] = (week[e.project_id] || 0) + (e.amount || 0);
    else before[e.project_id] = (before[e.project_id] || 0) + (e.amount || 0);
  }
  for (const pid of Object.keys(week)) {
    const prior = before[pid] || 0;
    if (prior <= 0) continue;
    const pct = (week[pid] / prior) * 100;
    if (pct > RULES.costSpikePct) {
      out.push({ severity: pct > 25 ? 'high' : 'medium', group: 'Job cost jumps', title: `${name[pid] || 'A job'}: costs up ${pct.toFixed(0)}% this week`, detail: `${money(week[pid])} added on top of ${money(prior)}`, path: `/projects/${pid}?tab=expenses` });
    }
  }
  return out;
}

function renderEmail(reminders: Reminder[], appUrl: string) {
  const groups = [...new Set(reminders.map((r) => r.group))];
  const sections = groups.map((g) => {
    const items = reminders.filter((r) => r.group === g).map((r) => `
      <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb">
        <div style="font-weight:600;color:${r.severity === 'high' ? '#b91c1c' : '#b45309'}">${esc(r.title)}</div>
        <div style="color:#6b7280;font-size:13px">${esc(r.detail)} · <a href="${appUrl}${r.path}" style="color:#2563eb">Open</a></div>
      </td></tr>`).join('');
    return `<h3 style="margin:24px 0 4px;font-size:15px;color:#111827">${esc(g)}</h3><table width="100%" cellspacing="0" cellpadding="0">${items}</table>`;
  }).join('');
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111827">
    <h2 style="margin:0 0 4px">RBF daily reminders</h2>
    <p style="margin:0;color:#6b7280">${reminders.length} item${reminders.length === 1 ? '' : 's'} need attention today.</p>
    ${sections}
    <p style="margin-top:28px;color:#9ca3af;font-size:12px">Rather Be Fishing. Sent by the RBF Operations Hub.</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const appUrl = (Deno.env.get('APP_URL') || 'https://portal.rbfconstruction.com').replace(/\/$/, '');
  if (!resendKey) return json({ error: 'RESEND_API_KEY not configured' }, 500);
  const admin = createClient(supabaseUrl, serviceKey);

  let body: any = {};
  try { body = await req.json(); } catch (_) { /* empty body */ }

  let recipients: string[] = [];
  if (body?.test) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await userClient.auth.getUser();
    if (!data?.user?.email) return json({ error: 'Unauthorized' }, 401);
    recipients = [data.user.email];
  } else if (body?.cron) {
    const { data: admins } = await admin.from('profiles').select('email').eq('role', 'Admin').not('email', 'is', null);
    recipients = (admins || []).map((a: any) => a.email).filter(Boolean);
  } else {
    return json({ error: 'Specify {cron:true} or {test:true}' }, 400);
  }
  if (!recipients.length) return json({ sent: false, reason: 'No recipients' });

  const reminders = await buildReminders(admin);
  if (!reminders.length) return json({ sent: false, reason: 'Nothing to remind' });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'RBF Construction <noreply@portal.rbfconstruction.com>',
      to: recipients,
      subject: `RBF reminders: ${reminders.length} item${reminders.length === 1 ? '' : 's'} need attention`,
      html: renderEmail(reminders, appUrl),
    }),
  });
  if (!resp.ok) return json({ error: `Email failed: ${(await resp.text()).slice(0, 200)}` }, 502);
  return json({ sent: true, count: reminders.length, recipients: recipients.length });
});
