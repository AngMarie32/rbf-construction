import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SECTIONS = ['projects', 'financials', 'schedule', 'documents', 'expenses', 'payment_apps', 'equipment', 'subcontractors'] as const;
type Section = typeof SECTIONS[number];

interface Sub {
  id: string;
  user_id: string;
  name: string;
  sections: string[];
  recipients: string[];
  day_of_week: number;
  day_of_month: number | null;
  hour: number;
  timezone: string;
  frequency: string;
  run_at: string | null;
  subject_override: string | null;
  date_range_days: number | null;
  only_changes: boolean;
  attach_csv: boolean;
  project_ids: string[] | null;
  company_ids: string[] | null;
  enabled: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
}

function fmtMoney(n: number | null | undefined) {
  const v = Number(n || 0);
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function gatherData(admin: any, sub: Sub) {
  const now = new Date();
  let rangeDays = sub.date_range_days ?? (sub.frequency === 'daily' ? 1 : sub.frequency === 'monthly' ? 30 : 7);
  let rangeStart: Date;
  if (rangeDays === -1) {
    rangeStart = sub.last_sent_at ? new Date(sub.last_sent_at) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    rangeStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  }
  const weekAgo = rangeStart;
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const isoWeekAgo = weekAgo.toISOString();
  const isoNow = now.toISOString();
  const dateWeekAgo = weekAgo.toISOString().slice(0, 10);
  const dateWeekFromNow = weekFromNow.toISOString().slice(0, 10);
  const dateNow = now.toISOString().slice(0, 10);

  const projectFilter = (q: any, col = 'project_id') =>
    sub.project_ids && sub.project_ids.length ? q.in(col, sub.project_ids) : q;

  const companyIds = sub.company_ids && sub.company_ids.length ? sub.company_ids : null;
  const companyFilter = (q: any, col = 'company_id') => (companyIds ? q.in(col, companyIds) : q);

  const data: any = { _rangeStart: rangeStart, _rangeEnd: now };

  {
    let cq = admin.from('companies').select('id,name,type');
    if (companyIds) cq = cq.in('id', companyIds);
    const { data: comps } = await cq;
    data._companies = comps || [];
  }

  if (sub.sections.includes('projects')) {
    let q = companyFilter(admin.from('projects').select('id,name,status,contract_value,completion_percentage,due_date'));
    if (sub.project_ids && sub.project_ids.length) q = q.in('id', sub.project_ids);
    const { data: projects } = await q;
    data.projects = projects || [];
  }

  if (sub.sections.includes('financials')) {
    let pq = companyFilter(admin.from('projects').select('id,name,contract_value'));
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

  if (sub.sections.includes('expenses')) {
    let eq = projectFilter(admin.from('expenses').select('id,project_id,vendor,amount,category,date,description').gte('date', dateWeekAgo).lte('date', dateNow));
    const { data: exps } = await eq;
    const list = exps || [];
    const byVendor: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const e of list) {
      const amt = Number(e.amount || 0);
      total += amt;
      byVendor[e.vendor || 'Unknown'] = (byVendor[e.vendor || 'Unknown'] || 0) + amt;
      byCategory[e.category || 'Uncategorized'] = (byCategory[e.category || 'Uncategorized'] || 0) + amt;
    }
    data.expenses = {
      total, count: list.length,
      topVendors: Object.entries(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 10),
      byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
    };
  }

  if (sub.sections.includes('payment_apps')) {
    let pq = projectFilter(admin.from('payment_applications').select('id,project_id,application_number,status,total_completed_and_stored_to_date,current_payment_due,created_at,updated_at').gte('updated_at', isoWeekAgo));
    const { data: apps } = await pq;
    data.payment_apps = apps || [];
  }

  if (sub.sections.includes('equipment')) {
    const { data: equip } = await admin.from('equipment').select('id,name,status,location,insurance_expiry');
    const { data: alerts } = await admin.from('equipment_alerts').select('id,equipment_id,alert_type,message,severity,due_date,is_acknowledged').eq('is_acknowledged', false);
    data.equipment = { items: equip || [], alerts: alerts || [] };
  }

  if (sub.sections.includes('subcontractors')) {
    const { data: subs } = await admin.from('subcontractors').select('id,name,status,trade').eq('status', 'Active');
    const { data: invs } = await admin.from('bid_invitation_recipients').select('id,status,sent_at,responded_at,subcontractor_id').gte('sent_at', isoWeekAgo);
    data.subcontractors = { active: subs || [], recentInvites: invs || [] };
  }

  if (sub.sections.includes('properties')) {
    let prq = admin.from('properties').select('id,name,company_id,city,state');
    if (companyIds) prq = prq.in('company_id', companyIds);
    const { data: props } = await prq;
    const propList = props || [];
    let units: any[] = [];
    if (propList.length) {
      const { data: u } = await admin
        .from('property_units')
        .select('id,property_id,unit_number,status,market_rent,tenant_name,lease_end')
        .in('property_id', propList.map((p: any) => p.id));
      units = u || [];
    }
    const occupied = units.filter((u) => u.status === 'occupied');
    data.properties = {
      properties: propList,
      units,
      occupiedCount: occupied.length,
      occupancy: units.length ? Math.round((occupied.length / units.length) * 100) : 0,
      rentInPlace: occupied.reduce((s, u) => s + Number(u.market_rent || 0), 0),
      potentialRent: units.reduce((s, u) => s + Number(u.market_rent || 0), 0),
      expiringLeases: units.filter((u) => u.lease_end && u.lease_end >= dateNow && u.lease_end <= dateWeekFromNow),
    };
  }

  if (sub.sections.includes('money')) {
    let oq = admin.from('company_obligations').select('id,company_id,direction,kind,counterparty_name,amount,due_date,status');
    if (companyIds) oq = oq.in('company_id', companyIds);
    const { data: obs } = await oq;
    const obligations = obs || [];
    let payments: any[] = [];
    if (obligations.length) {
      const { data: p } = await admin
        .from('obligation_payments')
        .select('id,obligation_id,amount,paid_on')
        .in('obligation_id', obligations.map((o: any) => o.id))
        .gte('paid_on', dateWeekAgo)
        .lte('paid_on', dateNow);
      payments = p || [];
    }
    let allPayments: any[] = [];
    if (obligations.length) {
      const { data: ap } = await admin
        .from('obligation_payments')
        .select('obligation_id,amount')
        .in('obligation_id', obligations.map((o: any) => o.id));
      allPayments = ap || [];
    }
    const paidMap: Record<string, number> = {};
    allPayments.forEach((p: any) => { paidMap[p.obligation_id] = (paidMap[p.obligation_id] || 0) + Number(p.amount || 0); });
    const balance = (o: any) => Math.max(Number(o.amount || 0) - (paidMap[o.id] || 0), 0);
    const obById: Record<string, any> = {};
    obligations.forEach((o: any) => { obById[o.id] = o; });
    const collected = payments
      .filter((p: any) => obById[p.obligation_id]?.direction === 'receivable')
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const paidOut = payments
      .filter((p: any) => obById[p.obligation_id]?.direction === 'payable')
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const receivables = obligations.filter((o: any) => o.direction === 'receivable');
    const payables = obligations.filter((o: any) => o.direction === 'payable');
    data.money = {
      collected,
      paidOut,
      net: collected - paidOut,
      owedToUs: receivables.reduce((s: number, o: any) => s + balance(o), 0),
      owedByUs: payables.reduce((s: number, o: any) => s + balance(o), 0),
      overdue: receivables
        .filter((o: any) => o.due_date && o.due_date < dateNow && balance(o) > 0)
        .map((o: any) => ({ ...o, balance: balance(o) })),
      paymentCount: payments.length,
    };
  }

  return data;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function buildHtml(sub: Sub, data: any) {
  const periodEnd: Date = data._rangeEnd || new Date();
  const periodStart: Date = data._rangeStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let body = '';
  const onlyChanges = sub.only_changes;
  const hasItems = (arr: any) => Array.isArray(arr) ? arr.length > 0 : !!arr;

  if (sub.sections.includes('projects') && data.projects && (!onlyChanges || hasItems(data.projects))) {
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

  if (sub.sections.includes('financials') && data.financials && (!onlyChanges || hasItems(data.financials))) {
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

  if (sub.sections.includes('schedule') && data.schedule && (!onlyChanges || (data.schedule.completed.length + data.schedule.upcoming.length + data.schedule.overdue.length) > 0)) {
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

  if (sub.sections.includes('documents') && data.documents && (!onlyChanges || (data.documents.changeOrders.length + data.documents.sends.length) > 0)) {
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

  if (sub.sections.includes('expenses') && data.expenses && (!onlyChanges || data.expenses.count > 0)) {
    const e = data.expenses;
    const vendorRows = e.topVendors.map(([v, a]: any) => `<tr><td style="padding:6px;border-bottom:1px solid #eee">${escapeHtml(v)}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(a)}</td></tr>`).join('') || `<tr><td colspan="2" style="padding:8px;color:#888">No expenses.</td></tr>`;
    const catRows = e.byCategory.map(([v, a]: any) => `<tr><td style="padding:6px;border-bottom:1px solid #eee">${escapeHtml(v)}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(a)}</td></tr>`).join('') || `<tr><td colspan="2" style="padding:8px;color:#888">—</td></tr>`;
    body += `<h2 style="font-family:Arial;color:#111;margin-top:24px">Expenses</h2>
      <p style="font-family:Arial;font-size:13px;margin:4px 0">Total: <strong>${fmtMoney(e.total)}</strong> across ${e.count} entries.</p>
      <h3 style="font-family:Arial;font-size:14px;margin:8px 0 4px">Top vendors</h3>
      <table style="width:100%;border-collapse:collapse;font-family:Arial;font-size:13px"><tbody>${vendorRows}</tbody></table>
      <h3 style="font-family:Arial;font-size:14px;margin:12px 0 4px">By category</h3>
      <table style="width:100%;border-collapse:collapse;font-family:Arial;font-size:13px"><tbody>${catRows}</tbody></table>`;
  }

  if (sub.sections.includes('payment_apps') && data.payment_apps && (!onlyChanges || data.payment_apps.length > 0)) {
    const rows = data.payment_apps.map((p: any) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">#${escapeHtml(String(p.application_number || ''))}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(p.status || '')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(p.total_completed_and_stored_to_date)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(p.current_payment_due)}</td></tr>`
    ).join('') || `<tr><td colspan="4" style="padding:12px;color:#888">No pay app activity.</td></tr>`;
    body += `<h2 style="font-family:Arial;color:#111;margin-top:24px">Payment Applications</h2>
      <table style="width:100%;border-collapse:collapse;font-family:Arial;font-size:13px"><thead>
      <tr style="background:#f4f4f4"><th style="text-align:left;padding:8px">App #</th><th style="text-align:left;padding:8px">Status</th><th style="text-align:right;padding:8px">Completed to date</th><th style="text-align:right;padding:8px">Current due</th></tr>
      </thead><tbody>${rows}</tbody></table>`;
  }

  if (sub.sections.includes('equipment') && data.equipment && (!onlyChanges || data.equipment.alerts.length > 0)) {
    const alertRows = data.equipment.alerts.map((a: any) =>
      `<tr><td style="padding:6px;border-bottom:1px solid #eee">${escapeHtml(a.alert_type)}</td><td style="padding:6px;border-bottom:1px solid #eee">${escapeHtml(a.message)}</td><td style="padding:6px;border-bottom:1px solid #eee">${escapeHtml(a.severity)}</td><td style="padding:6px;border-bottom:1px solid #eee">${a.due_date || ''}</td></tr>`
    ).join('') || `<tr><td colspan="4" style="padding:8px;color:#888">No open alerts.</td></tr>`;
    body += `<h2 style="font-family:Arial;color:#111;margin-top:24px">Equipment & Maintenance</h2>
      <p style="font-family:Arial;font-size:13px;margin:4px 0">${data.equipment.items.length} units tracked · ${data.equipment.alerts.length} open alerts</p>
      <table style="width:100%;border-collapse:collapse;font-family:Arial;font-size:13px"><thead>
      <tr style="background:#f4f4f4"><th style="text-align:left;padding:6px">Type</th><th style="text-align:left;padding:6px">Message</th><th style="text-align:left;padding:6px">Severity</th><th style="text-align:left;padding:6px">Due</th></tr>
      </thead><tbody>${alertRows}</tbody></table>`;
  }

  if (sub.sections.includes('subcontractors') && data.subcontractors && (!onlyChanges || data.subcontractors.recentInvites.length > 0)) {
    body += `<h2 style="font-family:Arial;color:#111;margin-top:24px">Subcontractor Activity</h2>
      <p style="font-family:Arial;font-size:13px;margin:4px 0">${data.subcontractors.active.length} active subcontractors · ${data.subcontractors.recentInvites.length} bid invitations in period</p>`;
  }

  if (sub.sections.includes('money') && data.money && (!onlyChanges || data.money.paymentCount > 0)) {
    const m = data.money;
    const overdueRows = (m.overdue || []).slice(0, 15).map((o: any) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(o.counterparty_name)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(o.kind)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(o.due_date || '')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmtMoney(o.balance)}</td></tr>`).join('');
    body += `<h2 style="font-family:Arial;color:#111;margin-top:24px">Money</h2>
      <p style="font-family:Arial;font-size:13px;margin:4px 0">
        Collected: <strong>${fmtMoney(m.collected)}</strong> · Paid out: <strong>${fmtMoney(m.paidOut)}</strong> · Net: <strong>${fmtMoney(m.net)}</strong><br/>
        Still owed to you: <strong>${fmtMoney(m.owedToUs)}</strong> · You owe: <strong>${fmtMoney(m.owedByUs)}</strong>
      </p>
      ${overdueRows ? `<table style="width:100%;border-collapse:collapse;font-family:Arial;font-size:13px">
        <tr><th align="left" style="padding:8px;border-bottom:2px solid #111">Past due from</th>
        <th align="left" style="padding:8px;border-bottom:2px solid #111">Type</th>
        <th align="left" style="padding:8px;border-bottom:2px solid #111">Due</th>
        <th align="right" style="padding:8px;border-bottom:2px solid #111">Balance</th></tr>${overdueRows}</table>` : ''}`;
  }

  if (sub.sections.includes('properties') && data.properties && (!onlyChanges || data.properties.units.length > 0)) {
    const p = data.properties;
    const expiring = (p.expiringLeases || []).length;
    body += `<h2 style="font-family:Arial;color:#111;margin-top:24px">Properties</h2>
      <p style="font-family:Arial;font-size:13px;margin:4px 0">
        ${p.properties.length} properties · ${p.units.length} units · ${p.occupancy}% occupied<br/>
        Rent in place: <strong>${fmtMoney(p.rentInPlace)}</strong> of ${fmtMoney(p.potentialRent)} potential${expiring ? ` · ${expiring} lease(s) ending soon` : ''}
      </p>`;
  }

  return `<div style="max-width:760px;margin:0 auto;padding:20px;color:#222">
    <div style="border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:8px">
      <h1 style="font-family:Arial;margin:0;font-size:22px">${escapeHtml(sub.name)}</h1>
      <p style="font-family:Arial;color:#666;margin:4px 0 0;font-size:13px">${escapeHtml((data._companies || []).map((c: any) => c.name).join(', ') || 'RBF Construction')} — Recap for ${fmtDate(periodStart)} – ${fmtDate(periodEnd)}</p>
    </div>
    ${body}
    <p style="font-family:Arial;color:#888;font-size:11px;margin-top:32px;border-top:1px solid #eee;padding-top:12px">
      Generated automatically by RBF Construction Portal. Manage your reports in the portal under Weekly Reports.
    </p>
  </div>`;
}

function buildCsv(sub: Sub, data: any): string {
  const lines: string[] = [];
  const esc = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (...c: any[]) => lines.push(c.map(esc).join(','));
  if (data.projects?.length) {
    lines.push('# Projects');
    row('Name', 'Status', '% Complete', 'Contract', 'Due');
    for (const p of data.projects) row(p.name, p.status, p.completion_percentage ?? 0, p.contract_value ?? 0, p.due_date || '');
    lines.push('');
  }
  if (data.financials?.length) {
    lines.push('# Financials');
    row('Project', 'Contract', 'Billed', 'Paid', 'Outstanding');
    for (const f of data.financials) row(f.name, f.contract, f.billed, f.paid, f.outstanding);
    lines.push('');
  }
  if (data.expenses) {
    lines.push('# Expenses by category');
    row('Category', 'Amount');
    for (const [c, a] of data.expenses.byCategory) row(c, a);
    lines.push('');
  }
  if (data.payment_apps?.length) {
    lines.push('# Payment applications');
    row('App #', 'Status', 'Completed to date', 'Current due');
    for (const p of data.payment_apps) row(p.application_number, p.status, p.total_completed_and_stored_to_date, p.current_payment_due);
    lines.push('');
  }
  if (data.money) {
    lines.push('# Money');
    row('Metric', 'Amount');
    row('Collected in period', data.money.collected);
    row('Paid out in period', data.money.paidOut);
    row('Still owed to you', data.money.owedToUs);
    row('You owe', data.money.owedByUs);
    lines.push('');
    if (data.money.overdue?.length) {
      lines.push('# Past due receivables');
      row('Counterparty', 'Type', 'Due', 'Balance');
      for (const o of data.money.overdue) row(o.counterparty_name, o.kind, o.due_date, o.balance);
      lines.push('');
    }
  }
  if (data.properties) {
    lines.push('# Properties');
    row('Property', 'Unit', 'Status', 'Tenant', 'Rent', 'Lease end');
    const nameById: Record<string, string> = {};
    for (const p of data.properties.properties) nameById[p.id] = p.name;
    for (const u of data.properties.units) row(nameById[u.property_id] || '', u.unit_number, u.status, u.tenant_name || '', u.market_rent ?? 0, u.lease_end || '');
    lines.push('');
  }
  return lines.join('\n');
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
  const periodEnd: Date = data._rangeEnd || new Date();
  const periodStart: Date = data._rangeStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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
    hr();
  }
  if (sub.sections.includes('expenses') && data.expenses) {
    text('Expenses', { size: 14, bold: true });
    text(`Total ${fmtMoney(data.expenses.total)} across ${data.expenses.count} entries`);
    text('Top vendors:', { bold: true });
    for (const [v, a] of data.expenses.topVendors) text(`• ${v}: ${fmtMoney(a)}`);
    hr();
  }
  if (sub.sections.includes('payment_apps') && data.payment_apps) {
    text('Payment Applications', { size: 14, bold: true });
    for (const p of data.payment_apps) text(`• #${p.application_number || ''} — ${p.status || ''} — Due ${fmtMoney(p.current_payment_due)}`);
    hr();
  }
  if (sub.sections.includes('equipment') && data.equipment) {
    text('Equipment & Maintenance', { size: 14, bold: true });
    text(`${data.equipment.items.length} units · ${data.equipment.alerts.length} open alerts`);
    for (const a of data.equipment.alerts) text(`• [${a.severity}] ${a.message} (due ${a.due_date || 'n/a'})`);
    hr();
  }
  if (sub.sections.includes('subcontractors') && data.subcontractors) {
    text('Subcontractor Activity', { size: 14, bold: true });
    text(`${data.subcontractors.active.length} active subs · ${data.subcontractors.recentInvites.length} invites in period`);
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
    const defaultSubject = `${sub.name} — ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const subject = `${(sub.subject_override?.trim() || defaultSubject)}${isTest ? ' (TEST)' : ''}`;
    const attachments: any[] = [
      { filename: `report-${periodEnd.toISOString().slice(0, 10)}.pdf`, content: pdfB64 },
    ];
    if (sub.attach_csv) {
      const csv = buildCsv(sub, data);
      attachments.push({ filename: `report-${periodEnd.toISOString().slice(0, 10)}.csv`, content: btoa(unescape(encodeURIComponent(csv))) });
    }
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'RBF Construction <noreply@portal.rbfconstruction.com>',
        to: sub.recipients,
        subject,
        html,
        attachments,
      }),
    });
    const respJson = await resp.json();
    if (!resp.ok) throw new Error(respJson?.message || 'Resend error');
    await admin.from('weekly_report_runs').insert({ subscription_id: sub.id, status: 'sent', recipient_count: sub.recipients.length, sections: sub.sections, is_test: isTest });
    if (!isTest) {
      if (sub.frequency === 'one_time') {
        await admin.from('weekly_report_subscriptions').update({
          last_sent_at: new Date().toISOString(),
          next_send_at: null,
          enabled: false,
        }).eq('id', sub.id);
      } else {
        const { data: next } = await admin.rpc('compute_next_scheduled_send', {
          p_frequency: sub.frequency,
          p_day_of_week: sub.day_of_week,
          p_day_of_month: sub.day_of_month,
          p_hour: sub.hour,
          p_tz: sub.timezone,
          p_run_at: sub.run_at,
          p_after: new Date().toISOString(),
        });
        await admin.from('weekly_report_subscriptions').update({ last_sent_at: new Date().toISOString(), next_send_at: next }).eq('id', sub.id);
      }
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