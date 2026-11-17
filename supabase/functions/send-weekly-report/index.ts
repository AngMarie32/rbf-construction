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

  if (sub.sections.includes('job_cost')) {
    // Same numbers as the project page's Job Cost tab: budget from the saved split, else the linked
    // estimate, else bid items; spent = expenses (not rejected) + time entries.
    const all = async (table: string, cols: string, ids: string[]) => {
      const out: any[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        for (let from = 0; ; from += 1000) {
          const { data: rows, error } = await admin.from(table).select(cols).in('project_id', chunk).order('id').range(from, from + 999);
          if (error) break;
          out.push(...(rows || []));
          if (!rows || rows.length < 1000) break;
        }
      }
      return out;
    };
    let q = companyFilter(admin.from('projects').select('id,name,status,completion_percentage,contract_value,archived_at'));
    if (sub.project_ids && sub.project_ids.length) q = q.in('id', sub.project_ids);
    const { data: projs } = await q;
    const active = (projs || []).filter((p: any) => !p.archived_at && !/complete|closed|cancel/i.test(p.status || ''));
    const ids = active.map((p: any) => p.id);
    const jobs: any[] = [];
    if (ids.length) {
      const [exps, times, splits, bids] = await Promise.all([
        all('expenses', 'id,project_id,amount,status', ids),
        all('time_entries', 'id,project_id,total_cost', ids),
        all('project_cost_budgets', 'id,project_id,amount', ids),
        all('bid_items', 'id,project_id,total', ids),
      ]);
      const { data: ests } = await admin.from('estimates').select('id,project_id,sov_project_id,updated_at').or(`project_id.in.(${ids.join(',')}),sov_project_id.in.(${ids.join(',')})`);
      const estFor: Record<string, any> = {};
      (ests || []).forEach((e: any) => {
        const pid = ids.includes(e.project_id) ? e.project_id : e.sov_project_id;
        if (!estFor[pid] || String(e.updated_at) > String(estFor[pid].updated_at)) estFor[pid] = e;
      });
      const estIds = Object.values(estFor).map((e: any) => e.id);
      const estTotal: Record<string, number> = {};
      for (let i = 0; i < estIds.length; i += 100) {
        const { data: lines } = await admin.from('estimate_lines').select('estimate_id,baseline_amount,override_amount').in('estimate_id', estIds.slice(i, i + 100));
        (lines || []).forEach((l: any) => { estTotal[l.estimate_id] = (estTotal[l.estimate_id] || 0) + (Number(l.override_amount ?? l.baseline_amount) || 0); });
      }
      const sumBy = (rows: any[], f: (r: any) => number) => rows.reduce((m: Record<string, number>, r: any) => ((m[r.project_id] = (m[r.project_id] || 0) + f(r)), m), {});
      const spentExp = sumBy(exps.filter((e: any) => e.status !== 'Rejected'), (e) => Number(e.amount) || 0);
      const spentTime = sumBy(times, (t) => Number(t.total_cost) || 0);
      const split = sumBy(splits, (b) => Number(b.amount) || 0);
      const bid = sumBy(bids, (b) => Number(b.total) || 0);
      active.forEach((p: any) => {
        const budget = split[p.id] || (estFor[p.id] ? estTotal[estFor[p.id].id] || 0 : 0) || bid[p.id] || 0;
        const spent = (spentExp[p.id] || 0) + (spentTime[p.id] || 0);
        const complete = Number(p.completion_percentage) || 0;
        const used = budget > 0 ? Math.round((spent / budget) * 100) : 0;
        jobs.push({
          id: p.id, name: p.name, budget, spent, complete, used,
          over: budget > 0 && spent > budget,
          ahead: budget > 0 && used > complete + 10,
          projected: budget > 0 && complete > 0 ? (spent / complete) * 100 : null,
        });
      });
    }
    data.job_cost = {
      flagged: jobs.filter((j) => j.over || j.ahead).sort((a, b) => (b.spent - b.budget) - (a.spent - a.budget)),
      noBudget: jobs.filter((j) => !j.budget && j.spent > 0).length,
      checked: jobs.filter((j) => j.budget > 0).length,
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

const NAVY = '#0f2a4a';
const ORANGE = '#e8742c';
const INK = '#1f2937';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
const FONT = "font-family:'Segoe UI',Helvetica,Arial,sans-serif";
const td = (v: string, align = 'left', extra = '') => `<td style="padding:9px 12px;border-bottom:1px solid ${LINE};text-align:${align};${FONT};font-size:13px;color:${INK};${extra}">${v}</td>`;
const th = (v: string, align = 'left') => `<th style="padding:8px 12px;background:#f3f5f8;text-align:${align};${FONT};font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:${MUTED};font-weight:600;border-bottom:1px solid ${LINE}">${v}</th>`;
const table = (head: string, rows: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${LINE};border-radius:8px;overflow:hidden"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
const emptyRow = (cols: number, text: string) => `<tr><td colspan="${cols}" style="padding:14px 12px;${FONT};font-size:13px;color:${MUTED};font-style:italic">${text}</td></tr>`;
const PILL: Record<string, [string, string]> = {
  green: ['#ecfdf5', '#047857'], blue: ['#eff6ff', '#1d4ed8'], amber: ['#fffbeb', '#b45309'], red: ['#fef2f2', '#b91c1c'], gray: ['#f3f4f6', '#4b5563'],
};
const toneOf = (s: string) => {
  const x = String(s || '').toLowerCase();
  if (/complete|approved|paid|active|available|sent|done/.test(x)) return 'green';
  if (/progress|submitted|in use|open|pending/.test(x)) return 'blue';
  if (/hold|draft|maintenance|medium|warning/.test(x)) return 'amber';
  if (/overdue|reject|late|high|critical|cancel|fail/.test(x)) return 'red';
  return 'gray';
};
const pill = (s: string, tone = toneOf(s)) => s ? `<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:${PILL[tone][0]};color:${PILL[tone][1]};${FONT};font-size:11px;font-weight:600;white-space:nowrap">${escapeHtml(s)}</span>` : '';
const bar = (pct: number) => {
  const p = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:110px;display:inline-table;vertical-align:middle"><tr><td style="width:80px;background:#e5e7eb;border-radius:4px;height:6px;padding:0"><div style="width:${Math.round(p * 0.8)}px;height:6px;background:${p >= 100 ? '#059669' : ORANGE};border-radius:4px"></div></td><td style="padding-left:8px;${FONT};font-size:12px;color:${INK};white-space:nowrap">${p}%</td></tr></table>`;
};
const section = (title: string, sub: string, inner: string) => `
  <tr><td style="padding:22px 28px 0">
    <div style="${FONT};font-size:16px;font-weight:700;color:${NAVY};margin:0 0 2px;border-left:4px solid ${ORANGE};padding-left:10px">${title}</div>
    ${sub ? `<div style="${FONT};font-size:12px;color:${MUTED};margin:0 0 10px;padding-left:14px">${sub}</div>` : '<div style="height:10px"></div>'}
    ${inner}
  </td></tr>`;
const tiles = (items: { label: string; value: string; tone?: string }[]) => {
  const cells = items.map((t) => `<td width="${Math.floor(100 / items.length)}%" style="padding:6px"><div style="background:#ffffff;border:1px solid ${LINE};border-radius:10px;padding:12px 14px">
    <div style="${FONT};font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:${MUTED}">${t.label}</div>
    <div style="${FONT};font-size:20px;font-weight:700;color:${t.tone === 'red' ? '#b91c1c' : t.tone === 'green' ? '#047857' : NAVY};margin-top:4px">${t.value}</div></div></td>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`;
};
const sub3 = (t: string, color = INK) => `<div style="${FONT};font-size:13px;font-weight:700;color:${color};margin:14px 0 6px">${t}</div>`;
const day = (d?: string) => {
  if (!d) return '—';
  const x = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d);
  return isNaN(x.getTime()) ? escapeHtml(d) : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function buildHtml(sub: Sub, data: any) {
  const periodEnd: Date = data._rangeEnd || new Date();
  const periodStart: Date = data._rangeStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const companyName = escapeHtml((data._companies || []).map((c: any) => c.name).join(', ') || 'RBF Construction');

  let body = '';
  const onlyChanges = sub.only_changes;
  const hasItems = (arr: any) => (Array.isArray(arr) ? arr.length > 0 : !!arr);
  const on = (k: string) => sub.sections.includes(k);

  // Headline tiles from whatever sections are included.
  const kpis: { label: string; value: string; tone?: string }[] = [];
  if (on('projects') && data.projects) kpis.push({ label: 'Active projects', value: String(data.projects.filter((p: any) => !/complete|closed/i.test(p.status || '')).length) });
  if (on('money') && data.money) kpis.push({ label: 'Collected', value: fmtMoney(data.money.collected), tone: 'green' });
  else if (on('financials') && data.financials) kpis.push({ label: 'Outstanding', value: fmtMoney(data.financials.reduce((s: number, f: any) => s + Number(f.outstanding || 0), 0)) });
  if (on('expenses') && data.expenses) kpis.push({ label: 'Spent', value: fmtMoney(data.expenses.total) });
  if (on('schedule') && data.schedule) kpis.push({ label: 'Overdue tasks', value: String(data.schedule.overdue.length), tone: data.schedule.overdue.length ? 'red' : 'green' });
  if (on('job_cost') && data.job_cost) kpis.unshift({ label: 'Jobs over budget', value: String(data.job_cost.flagged.length), tone: data.job_cost.flagged.length ? 'red' : 'green' });
  if (kpis.length) body += `<tr><td style="padding:18px 22px 0">${tiles(kpis.slice(0, 4))}</td></tr>`;

  if (on('projects') && data.projects && (!onlyChanges || hasItems(data.projects))) {
    const rows = data.projects.map((p: any) =>
      `<tr>${td(`<strong>${escapeHtml(p.name)}</strong>`)}${td(pill(p.status || ''))}${td(bar(p.completion_percentage ?? 0))}${td(fmtMoney(p.contract_value), 'right')}${td(day(p.due_date))}</tr>`).join('') || emptyRow(5, 'No projects.');
    body += section('Projects', `${data.projects.length} project${data.projects.length === 1 ? '' : 's'}`, table(th('Project') + th('Status') + th('Progress') + th('Contract', 'right') + th('Due'), rows));
  }

  if (on('financials') && data.financials && (!onlyChanges || hasItems(data.financials))) {
    const t = data.financials.reduce((a: any, f: any) => ({ c: a.c + Number(f.contract || 0), b: a.b + Number(f.billed || 0), p: a.p + Number(f.paid || 0), o: a.o + Number(f.outstanding || 0) }), { c: 0, b: 0, p: 0, o: 0 });
    const rows = data.financials.map((f: any) =>
      `<tr>${td(`<strong>${escapeHtml(f.name)}</strong>`)}${td(fmtMoney(f.contract), 'right')}${td(fmtMoney(f.billed), 'right')}${td(fmtMoney(f.paid), 'right')}${td(fmtMoney(f.outstanding), 'right', Number(f.outstanding) > 0 ? 'font-weight:700;color:#b45309' : '')}</tr>`).join('') || emptyRow(5, 'No financial data.');
    const total = data.financials.length > 1 ? `<tr>${td('<strong>Total</strong>', 'left', 'background:#f9fafb')}${td(`<strong>${fmtMoney(t.c)}</strong>`, 'right', 'background:#f9fafb')}${td(`<strong>${fmtMoney(t.b)}</strong>`, 'right', 'background:#f9fafb')}${td(`<strong>${fmtMoney(t.p)}</strong>`, 'right', 'background:#f9fafb')}${td(`<strong>${fmtMoney(t.o)}</strong>`, 'right', 'background:#f9fafb')}</tr>` : '';
    body += section('Financials', 'Contract, billed and collected by project', table(th('Project') + th('Contract', 'right') + th('Billed', 'right') + th('Paid', 'right') + th('Outstanding', 'right'), rows + total));
  }

  if (on('schedule') && data.schedule && (!onlyChanges || data.schedule.completed.length + data.schedule.upcoming.length + data.schedule.overdue.length > 0)) {
    const list = (arr: any[], empty: string) =>
      table(th('Task') + th('Status') + th('Dates'), arr.map((t: any) => `<tr>${td(escapeHtml(t.title))}${td(pill(t.status))}${td(`${day(t.start_date)} → ${day(t.end_date)}`, 'left', 'white-space:nowrap')}</tr>`).join('') || emptyRow(3, empty));
    body += section('Schedule', `${data.schedule.completed.length} finished · ${data.schedule.upcoming.length} coming up · ${data.schedule.overdue.length} overdue`,
      (data.schedule.overdue.length ? sub3(`Overdue (${data.schedule.overdue.length})`, '#b91c1c') + list(data.schedule.overdue, '') : '') +
      sub3(`Coming up next 7 days (${data.schedule.upcoming.length})`) + list(data.schedule.upcoming, 'Nothing scheduled.') +
      sub3(`Finished last 7 days (${data.schedule.completed.length})`, '#047857') + list(data.schedule.completed, 'Nothing finished.'));
  }

  if (on('documents') && data.documents && (!onlyChanges || data.documents.changeOrders.length + data.documents.sends.length > 0)) {
    const coRows = data.documents.changeOrders.map((c: any) => `<tr>${td(`<strong>${escapeHtml(c.number || '')}</strong>`)}${td(escapeHtml(c.description || ''))}${td(pill(c.status || ''))}${td(fmtMoney(c.amount), 'right')}</tr>`).join('') || emptyRow(4, 'No new change orders.');
    const sendRows = data.documents.sends.map((s: any) => `<tr>${td(day(s.sent_at))}${td(escapeHtml(s.bulk_invoices?.file_name || ''))}${td(escapeHtml(s.sent_to || ''))}${td(pill(s.status || ''))}</tr>`).join('') || emptyRow(4, 'No documents sent.');
    body += section('Documents & change orders', 'Last 7 days',
      sub3('Change orders') + table(th('No.') + th('Description') + th('Status') + th('Amount', 'right'), coRows) +
      sub3('Documents sent') + table(th('Sent') + th('File') + th('To') + th('Status'), sendRows));
  }

  if (on('expenses') && data.expenses && (!onlyChanges || data.expenses.count > 0)) {
    const e = data.expenses;
    const max = Math.max(1, ...e.topVendors.map(([, a]: any) => Number(a) || 0), ...e.byCategory.map(([, a]: any) => Number(a) || 0));
    const rows = (arr: any[]) => arr.map(([v, a]: any) => `<tr>${td(escapeHtml(v))}${td(`<div style="background:#fde7d8;height:6px;border-radius:4px;width:${Math.max(4, Math.round((Number(a) / max) * 100))}%"></div>`, 'left', 'width:40%')}${td(fmtMoney(a), 'right')}</tr>`).join('') || emptyRow(3, 'No expenses.');
    body += section('Expenses', `${fmtMoney(e.total)} across ${e.count} entr${e.count === 1 ? 'y' : 'ies'}`,
      sub3('Top vendors') + table(th('Vendor') + th('') + th('Amount', 'right'), rows(e.topVendors)) +
      sub3('By category') + table(th('Category') + th('') + th('Amount', 'right'), rows(e.byCategory)));
  }

  if (on('job_cost') && data.job_cost && (!onlyChanges || data.job_cost.flagged.length > 0)) {
    const jc = data.job_cost;
    const rows = jc.flagged.map((j: any) => {
      const diff = j.spent - j.budget;
      const why = j.over ? pill('Over budget', 'red') : pill(`${j.used}% spent, ${j.complete}% done`, 'amber');
      return `<tr>${td(`<strong>${escapeHtml(j.name)}</strong>`)}${td(why)}${td(fmtMoney(j.budget), 'right')}${td(fmtMoney(j.spent), 'right')}${td(diff > 0 ? `+${fmtMoney(diff)}` : '—', 'right', diff > 0 ? 'color:#b91c1c;font-weight:700' : '')}${td(j.projected ? fmtMoney(j.projected) : '—', 'right', j.projected && j.projected > j.budget ? 'color:#b45309;font-weight:700' : '')}</tr>`;
    }).join('') || emptyRow(6, `All ${jc.checked} job${jc.checked === 1 ? '' : 's'} with a budget are on track.`);
    body += section('Jobs over budget', `${jc.flagged.length} of ${jc.checked} job${jc.checked === 1 ? '' : 's'} need a look${jc.noBudget ? ` · ${jc.noBudget} job${jc.noBudget === 1 ? ' has' : 's have'} costs but no budget` : ''}`,
      table(th('Project') + th('Why') + th('Budget', 'right') + th('Spent', 'right') + th('Over by', 'right') + th('On pace for', 'right'), rows) +
      `<div style="${FONT};font-size:11px;color:${MUTED};margin-top:6px">Flagged when spending passes the budget, or when the share of budget spent is more than 10 points ahead of % complete. "On pace for" = spent so far ÷ % complete.</div>`);
  }

  if (on('payment_apps') && data.payment_apps && (!onlyChanges || data.payment_apps.length > 0)) {
    const rows = data.payment_apps.map((p: any) => `<tr>${td(`<strong>#${escapeHtml(String(p.application_number || ''))}</strong>`)}${td(pill(p.status || ''))}${td(fmtMoney(p.total_completed_and_stored_to_date), 'right')}${td(fmtMoney(p.current_payment_due), 'right', 'font-weight:700')}</tr>`).join('') || emptyRow(4, 'No pay app activity.');
    body += section('Payment applications', '', table(th('App') + th('Status') + th('Completed to date', 'right') + th('Current due', 'right'), rows));
  }

  if (on('equipment') && data.equipment && (!onlyChanges || data.equipment.alerts.length > 0)) {
    const rows = data.equipment.alerts.map((a: any) => `<tr>${td(`<strong>${escapeHtml(a.alert_type)}</strong>`)}${td(escapeHtml(a.message))}${td(pill(a.severity))}${td(day(a.due_date))}</tr>`).join('') || emptyRow(4, 'No open alerts.');
    body += section('Equipment & maintenance', `${data.equipment.items.length} units tracked · ${data.equipment.alerts.length} open alert${data.equipment.alerts.length === 1 ? '' : 's'}`, table(th('Type') + th('Message') + th('Severity') + th('Due'), rows));
  }

  if (on('subcontractors') && data.subcontractors && (!onlyChanges || data.subcontractors.recentInvites.length > 0)) {
    body += section('Subcontractors', '', tiles([
      { label: 'Active subcontractors', value: String(data.subcontractors.active.length) },
      { label: 'Bid invitations this period', value: String(data.subcontractors.recentInvites.length) },
    ]));
  }

  if (on('money') && data.money && (!onlyChanges || data.money.paymentCount > 0)) {
    const m = data.money;
    const rows = (m.overdue || []).slice(0, 15).map((o: any) => `<tr>${td(`<strong>${escapeHtml(o.counterparty_name)}</strong>`)}${td(escapeHtml(o.kind))}${td(day(o.due_date), 'left', 'color:#b91c1c')}${td(fmtMoney(o.balance), 'right', 'font-weight:700')}</tr>`).join('');
    body += section('Money', `${m.paymentCount} payment${m.paymentCount === 1 ? '' : 's'} recorded`,
      tiles([
        { label: 'Collected', value: fmtMoney(m.collected), tone: 'green' },
        { label: 'Paid out', value: fmtMoney(m.paidOut) },
        { label: 'Net', value: fmtMoney(m.net), tone: m.net < 0 ? 'red' : 'green' },
      ]) + tiles([
        { label: 'Still owed to you', value: fmtMoney(m.owedToUs) },
        { label: 'You owe', value: fmtMoney(m.owedByUs) },
      ]) + (rows ? sub3('Past due to you', '#b91c1c') + table(th('From') + th('Type') + th('Due') + th('Balance', 'right'), rows) : ''));
  }

  if (on('properties') && data.properties && (!onlyChanges || data.properties.units.length > 0)) {
    const p = data.properties;
    const expiring = (p.expiringLeases || []).length;
    body += section('Properties', `${p.properties.length} properties · ${p.units.length} units${expiring ? ` · ${expiring} lease${expiring === 1 ? '' : 's'} ending soon` : ''}`, tiles([
      { label: 'Occupied', value: `${p.occupancy}%`, tone: p.occupancy >= 90 ? 'green' : undefined },
      { label: 'Rent in place', value: fmtMoney(p.rentInPlace) },
      { label: 'Potential rent', value: fmtMoney(p.potentialRent) },
    ]));
  }

  if (!body) body = section('Nothing new', '', `<p style="${FONT};font-size:13px;color:${MUTED};margin:0">No activity in the sections this report covers.</p>`);

  return `<!doctype html><html><body style="margin:0;padding:0;background:#eef1f5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:24px 0"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${LINE}">
    <tr><td style="background:${NAVY};padding:22px 28px;border-bottom:4px solid ${ORANGE}">
      <div style="${FONT};font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#f6b483;font-weight:600">${companyName}</div>
      <div style="${FONT};font-size:24px;font-weight:700;color:#ffffff;margin-top:4px">${escapeHtml(sub.name)}</div>
      <div style="${FONT};font-size:13px;color:#c7d2e0;margin-top:4px">${fmtDate(periodStart)} – ${fmtDate(periodEnd)}</div>
    </td></tr>
    ${body}
    <tr><td style="padding:28px 28px 22px">
      <div style="border-top:1px solid ${LINE};padding-top:12px;${FONT};font-size:11px;color:#9ca3af">Sent automatically by the ${companyName} portal. Change what's in this report under Weekly Reports.</div>
    </td></tr>
  </table></td></tr></table></body></html>`;
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
  if (data.job_cost?.flagged?.length) {
    lines.push('# Jobs over budget');
    row('Project', 'Budget', 'Spent', 'Budget used %', 'Complete %', 'On pace for');
    for (const j of data.job_cost.flagged) row(j.name, Math.round(j.budget), Math.round(j.spent), j.used, j.complete, j.projected ? Math.round(j.projected) : '');
    lines.push('');
  }
  return lines.join('\n');
}

async function buildPdf(sub: Sub, data: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792, M = 36;
  const NAVY = rgb(15 / 255, 42 / 255, 74 / 255), ORANGE = rgb(232 / 255, 116 / 255, 44 / 255);
  const INK = rgb(0.12, 0.16, 0.22), MUTED = rgb(0.42, 0.45, 0.5), LINE = rgb(0.9, 0.91, 0.92), ZEBRA = rgb(0.97, 0.98, 0.99);
  const RED = rgb(0.73, 0.11, 0.11), GREEN = rgb(0.02, 0.47, 0.34), AMBER = rgb(0.71, 0.33, 0.04), BLUE = rgb(0.11, 0.31, 0.85);
  const companyName = (data._companies || []).map((c: any) => c.name).join(', ') || 'RBF Construction';
  const periodEnd: Date = data._rangeEnd || new Date();
  const periodStart: Date = data._rangeStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fmtD = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const day = (d?: string) => {
    if (!d) return '-';
    const x = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d);
    return isNaN(x.getTime()) ? String(d) : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  // Standard PDF fonts only cover basic characters; replace anything else.
  const clean = (s: any) => String(s ?? '').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/→/g, '->').replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
  const fit = (s: string, f: any, size: number, w: number) => {
    let t = clean(s);
    if (f.widthOfTextAtSize(t, size) <= w) return t;
    while (t.length > 1 && f.widthOfTextAtSize(t + '...', size) > w) t = t.slice(0, -1);
    return t + '...';
  };
  const statusColor = (s: string) => {
    const x = String(s || '').toLowerCase();
    if (/overdue|reject|late|high|critical|cancel/.test(x)) return RED;
    if (/complete|approved|paid|available|sent/.test(x)) return GREEN;
    if (/hold|draft|maintenance|planning|medium/.test(x)) return AMBER;
    if (/active|progress|submitted|in use|open|pending/.test(x)) return BLUE;
    return MUTED;
  };

  let page: any;
  let y = 0;
  let pageNo = 0;
  const newPage = () => {
    page = pdf.addPage([W, H]);
    pageNo++;
    if (pageNo === 1) {
      page.drawRectangle({ x: 0, y: H - 92, width: W, height: 92, color: NAVY });
      page.drawRectangle({ x: 0, y: H - 95, width: W, height: 3, color: ORANGE });
      page.drawText(clean(companyName).toUpperCase(), { x: M, y: H - 32, size: 8.5, font: bold, color: rgb(0.96, 0.71, 0.51) });
      page.drawText(fit(sub.name, bold, 20, W - 2 * M), { x: M, y: H - 56, size: 20, font: bold, color: rgb(1, 1, 1) });
      page.drawText(`${fmtD(periodStart)} - ${fmtD(periodEnd)}`, { x: M, y: H - 76, size: 10, font, color: rgb(0.78, 0.82, 0.88) });
      y = H - 118;
    } else {
      page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: NAVY });
      page.drawText(fit(`${companyName} - ${sub.name}`, font, 8, W - 2 * M), { x: M, y: H - 24, size: 8, font, color: MUTED });
      y = H - 42;
    }
  };
  const ensure = (h: number) => { if (y - h < M + 20) newPage(); };

  const heading = (t: string, subtitle = '') => {
    ensure(60);
    y -= 8;
    page.drawRectangle({ x: M, y: y - 13, width: 3, height: 15, color: ORANGE });
    page.drawText(clean(t), { x: M + 9, y: y - 10, size: 13, font: bold, color: NAVY });
    if (subtitle) page.drawText(fit(subtitle, font, 8.5, 300), { x: W - M - Math.min(300, font.widthOfTextAtSize(clean(subtitle), 8.5)), y: y - 9, size: 8.5, font, color: MUTED });
    y -= 24;
  };
  const label = (t: string, color = INK) => { ensure(30); page.drawText(clean(t), { x: M, y: y - 9, size: 9.5, font: bold, color }); y -= 16; };
  const note = (t: string) => { ensure(16); page.drawText(fit(t, font, 9, W - 2 * M), { x: M + 4, y: y - 9, size: 9, font, color: MUTED }); y -= 16; };

  const tiles = (items: { label: string; value: string; color?: any }[]) => {
    if (!items.length) return;
    ensure(52);
    const gap = 8, w = (W - 2 * M - gap * (items.length - 1)) / items.length;
    items.forEach((t, i) => {
      const x = M + i * (w + gap);
      page.drawRectangle({ x, y: y - 44, width: w, height: 44, borderColor: LINE, borderWidth: 1, color: rgb(1, 1, 1) });
      page.drawText(fit(t.label.toUpperCase(), font, 7.5, w - 16), { x: x + 9, y: y - 14, size: 7.5, font, color: MUTED });
      page.drawText(fit(t.value, bold, 15, w - 16), { x: x + 9, y: y - 34, size: 15, font: bold, color: t.color || NAVY });
    });
    y -= 54;
  };

  type Col = { h: string; w: number; align?: 'left' | 'right' };
  type Cell = string | { t: string; color?: any; bold?: boolean; pill?: boolean; bar?: number };
  const table = (cols: Col[], rows: Cell[][], opts: { empty?: string; totalRow?: Cell[] } = {}) => {
    const total = cols.reduce((s, c) => s + c.w, 0);
    const widths = cols.map((c) => (c.w / total) * (W - 2 * M));
    const rowH = 18;
    const header = () => {
      ensure(rowH * 2);
      page.drawRectangle({ x: M, y: y - rowH, width: W - 2 * M, height: rowH, color: rgb(0.95, 0.96, 0.97) });
      let x = M;
      cols.forEach((c, i) => {
        const t = c.h.toUpperCase();
        const tw = font.widthOfTextAtSize(t, 7.5);
        page.drawText(t, { x: c.align === 'right' ? x + widths[i] - 7 - tw : x + 7, y: y - 12, size: 7.5, font, color: MUTED });
        x += widths[i];
      });
      y -= rowH;
    };
    const drawRow = (r: Cell[], idx: number, isTotal = false) => {
      if (y - rowH < M + 20) { newPage(); header(); }
      if (isTotal) page.drawRectangle({ x: M, y: y - rowH, width: W - 2 * M, height: rowH, color: rgb(0.95, 0.96, 0.97) });
      else if (idx % 2) page.drawRectangle({ x: M, y: y - rowH, width: W - 2 * M, height: rowH, color: ZEBRA });
      let x = M;
      r.forEach((cell, i) => {
        const c = typeof cell === 'string' ? { t: cell } : cell;
        const f = c.bold || isTotal ? bold : font;
        const avail = widths[i] - 14;
        if (c.bar !== undefined) {
          const p = Math.max(0, Math.min(100, Math.round(c.bar)));
          const bw = Math.min(60, avail - 28);
          page.drawRectangle({ x: x + 7, y: y - 11, width: bw, height: 5, color: LINE });
          if (p) page.drawRectangle({ x: x + 7, y: y - 11, width: (bw * p) / 100, height: 5, color: p >= 100 ? GREEN : ORANGE });
          page.drawText(`${p}%`, { x: x + 12 + bw, y: y - 12.5, size: 8.5, font, color: INK });
        } else if (c.pill) {
          const t = fit(c.t, bold, 7.5, avail - 10);
          if (t) {
            const tw = bold.widthOfTextAtSize(t, 7.5);
            const col = c.color || statusColor(c.t);
            page.drawRectangle({ x: x + 7, y: y - 14, width: tw + 10, height: 11, color: col, opacity: 0.12 });
            page.drawText(t, { x: x + 12, y: y - 11.3, size: 7.5, font: bold, color: col });
          }
        } else {
          const t = fit(c.t, f, 8.5, avail);
          const tw = f.widthOfTextAtSize(t, 8.5);
          page.drawText(t, { x: cols[i].align === 'right' ? x + widths[i] - 7 - tw : x + 7, y: y - 12.5, size: 8.5, font: f, color: c.color || INK });
        }
        x += widths[i];
      });
      page.drawLine({ start: { x: M, y: y - rowH }, end: { x: W - M, y: y - rowH }, thickness: 0.5, color: LINE });
      y -= rowH;
    };
    header();
    if (!rows.length) {
      ensure(rowH);
      page.drawText(clean(opts.empty || 'Nothing to show.'), { x: M + 7, y: y - 12.5, size: 8.5, font, color: MUTED });
      y -= rowH;
    }
    rows.forEach((r, i) => drawRow(r, i));
    if (opts.totalRow) drawRow(opts.totalRow, 0, true);
    y -= 10;
  };

  newPage();
  const on = (k: string) => sub.sections.includes(k);

  // Headline tiles
  const kpis: { label: string; value: string; color?: any }[] = [];
  if (on('projects') && data.projects) kpis.push({ label: 'Active projects', value: String(data.projects.filter((p: any) => !/complete|closed/i.test(p.status || '')).length) });
  if (on('financials') && data.financials) {
    kpis.push({ label: 'Billed to date', value: fmtMoney(data.financials.reduce((s: number, f: any) => s + Number(f.billed || 0), 0)) });
    kpis.push({ label: 'Outstanding', value: fmtMoney(data.financials.reduce((s: number, f: any) => s + Number(f.outstanding || 0), 0)), color: AMBER });
  }
  if (on('money') && data.money) kpis.push({ label: 'Collected this week', value: fmtMoney(data.money.collected), color: GREEN });
  if (on('schedule') && data.schedule) kpis.push({ label: 'Overdue tasks', value: String(data.schedule.overdue.length), color: data.schedule.overdue.length ? RED : GREEN });
  if (on('job_cost') && data.job_cost) kpis.unshift({ label: 'Jobs over budget', value: String(data.job_cost.flagged.length), color: data.job_cost.flagged.length ? RED : GREEN });
  tiles(kpis.slice(0, 4));

  if (on('projects') && data.projects) {
    const order = (s: string) => (/active|progress/i.test(s) ? 0 : /planning|hold/i.test(s) ? 1 : 2);
    const list = [...data.projects].sort((a: any, b: any) => order(a.status) - order(b.status) || Number(b.contract_value || 0) - Number(a.contract_value || 0));
    heading('Projects', `${list.length} project${list.length === 1 ? '' : 's'}`);
    table(
      [{ h: 'Project', w: 34 }, { h: 'Status', w: 15 }, { h: 'Progress', w: 20 }, { h: 'Contract', w: 18, align: 'right' }, { h: 'Due', w: 11 }],
      list.map((p: any) => [{ t: p.name, bold: true }, { t: p.status || '', pill: true }, { t: '', bar: Number(p.completion_percentage) || 0 }, Number(p.contract_value) ? fmtMoney(p.contract_value) : '-', day(p.due_date)]),
      { empty: 'No projects.' }
    );
  }

  if (on('financials') && data.financials) {
    const list = [...data.financials].sort((a: any, b: any) => Number(b.outstanding || 0) - Number(a.outstanding || 0) || Number(b.billed || 0) - Number(a.billed || 0));
    const t = list.reduce((a: any, f: any) => ({ c: a.c + Number(f.contract || 0), b: a.b + Number(f.billed || 0), p: a.p + Number(f.paid || 0), o: a.o + Number(f.outstanding || 0) }), { c: 0, b: 0, p: 0, o: 0 });
    const m = (n: any) => (Number(n) ? fmtMoney(n) : '-');
    heading('Financials', 'Sorted by amount outstanding');
    table(
      [{ h: 'Project', w: 32 }, { h: 'Contract', w: 17, align: 'right' }, { h: 'Billed', w: 17, align: 'right' }, { h: 'Paid', w: 17, align: 'right' }, { h: 'Outstanding', w: 17, align: 'right' }],
      list.map((f: any) => [{ t: f.name, bold: true }, m(f.contract), m(f.billed), m(f.paid), { t: m(f.outstanding), bold: Number(f.outstanding) > 0, color: Number(f.outstanding) > 0 ? AMBER : MUTED }]),
      { empty: 'No financial data.', totalRow: list.length > 1 ? ['Total', fmtMoney(t.c), fmtMoney(t.b), fmtMoney(t.p), fmtMoney(t.o)] : undefined }
    );
  }

  if (on('money') && data.money) {
    const mo = data.money;
    heading('Money', `${mo.paymentCount} payment${mo.paymentCount === 1 ? '' : 's'} recorded`);
    tiles([
      { label: 'Collected', value: fmtMoney(mo.collected), color: GREEN },
      { label: 'Paid out', value: fmtMoney(mo.paidOut) },
      { label: 'Net', value: fmtMoney(mo.net), color: mo.net < 0 ? RED : GREEN },
      { label: 'Owed to you', value: fmtMoney(mo.owedToUs) },
      { label: 'You owe', value: fmtMoney(mo.owedByUs) },
    ]);
    if ((mo.overdue || []).length) {
      label('Past due to you', RED);
      table([{ h: 'From', w: 40 }, { h: 'Type', w: 22 }, { h: 'Due', w: 16 }, { h: 'Balance', w: 22, align: 'right' }],
        mo.overdue.slice(0, 20).map((o: any) => [{ t: o.counterparty_name, bold: true }, o.kind || '', { t: day(o.due_date), color: RED }, { t: fmtMoney(o.balance), bold: true }]));
    }
  }

  if (on('properties') && data.properties && (data.properties.units.length || !sub.only_changes)) {
    const p = data.properties;
    heading('Properties', `${p.properties.length} properties - ${p.units.length} units`);
    if (!p.units.length) note('No rental units set up.');
    else tiles([{ label: 'Occupied', value: `${p.occupancy}%` }, { label: 'Rent in place', value: fmtMoney(p.rentInPlace) }, { label: 'Potential rent', value: fmtMoney(p.potentialRent) }]);
  }

  if (on('schedule') && data.schedule) {
    const s = data.schedule;
    heading('Schedule', `${s.completed.length} finished - ${s.upcoming.length} coming up - ${s.overdue.length} overdue`);
    const cols: Col[] = [{ h: 'Task', w: 50 }, { h: 'Status', w: 20 }, { h: 'Start', w: 15 }, { h: 'Finish', w: 15 }];
    const rows = (arr: any[], late = false) => arr.map((t: any) => [{ t: t.title, bold: true }, { t: t.status || '', pill: true }, day(t.start_date), { t: day(t.end_date), color: late ? RED : undefined }]);
    if (s.overdue.length) { label(`Overdue (${s.overdue.length})`, RED); table(cols, rows(s.overdue, true)); }
    label(`Coming up next 7 days (${s.upcoming.length})`); table(cols, rows(s.upcoming), { empty: 'Nothing scheduled.' });
    label(`Finished last 7 days (${s.completed.length})`, GREEN); table(cols, rows(s.completed), { empty: 'Nothing finished.' });
  }

  if (on('documents') && data.documents) {
    heading('Documents & change orders', 'Last 7 days');
    label('Change orders');
    table([{ h: 'No.', w: 12 }, { h: 'Description', w: 50 }, { h: 'Status', w: 18 }, { h: 'Amount', w: 20, align: 'right' }],
      data.documents.changeOrders.map((c: any) => [{ t: String(c.number || ''), bold: true }, c.description || '', { t: c.status || '', pill: true }, fmtMoney(c.amount)]), { empty: 'No new change orders.' });
    label('Documents sent');
    table([{ h: 'Sent', w: 14 }, { h: 'File', w: 40 }, { h: 'To', w: 30 }, { h: 'Status', w: 16 }],
      data.documents.sends.map((s: any) => [day(s.sent_at), s.bulk_invoices?.file_name || '', s.sent_to || '', { t: s.status || '', pill: true }]), { empty: 'No documents sent.' });
  }

  if (on('expenses') && data.expenses) {
    const e = data.expenses;
    heading('Expenses', `${fmtMoney(e.total)} across ${e.count} entr${e.count === 1 ? 'y' : 'ies'}`);
    label('Top vendors');
    table([{ h: 'Vendor', w: 70 }, { h: 'Amount', w: 30, align: 'right' }], e.topVendors.map(([v, a]: any) => [{ t: v, bold: true }, fmtMoney(a)]), { empty: 'No expenses.' });
    if (e.byCategory?.length) { label('By category'); table([{ h: 'Category', w: 70 }, { h: 'Amount', w: 30, align: 'right' }], e.byCategory.map(([v, a]: any) => [v, fmtMoney(a)])); }
  }

  if (on('job_cost') && data.job_cost) {
    const jc = data.job_cost;
    heading('Jobs over budget', `${jc.flagged.length} of ${jc.checked} need a look`);
    table(
      [{ h: 'Project', w: 30 }, { h: 'Why', w: 22 }, { h: 'Budget', w: 12, align: 'right' }, { h: 'Spent', w: 12, align: 'right' }, { h: 'Over by', w: 12, align: 'right' }, { h: 'On pace for', w: 12, align: 'right' }],
      jc.flagged.map((j: any) => [
        { t: j.name, bold: true },
        { t: j.over ? 'Over budget' : `${j.used}% spent / ${j.complete}% done`, pill: true, color: j.over ? RED : AMBER },
        fmtMoney(j.budget),
        fmtMoney(j.spent),
        { t: j.spent > j.budget ? fmtMoney(j.spent - j.budget) : '-', color: j.spent > j.budget ? RED : MUTED, bold: j.spent > j.budget },
        { t: j.projected ? fmtMoney(j.projected) : '-', color: j.projected && j.projected > j.budget ? AMBER : undefined },
      ]),
      { empty: `All ${jc.checked} jobs with a budget are on track.` }
    );
    if (jc.noBudget) note(`${jc.noBudget} job${jc.noBudget === 1 ? ' has' : 's have'} costs but no budget yet.`);
  }

  if (on('payment_apps') && data.payment_apps) {
    heading('Payment applications');
    table([{ h: 'App', w: 15 }, { h: 'Status', w: 25 }, { h: 'Completed to date', w: 30, align: 'right' }, { h: 'Current due', w: 30, align: 'right' }],
      data.payment_apps.map((p: any) => [{ t: `#${p.application_number || ''}`, bold: true }, { t: p.status || '', pill: true }, fmtMoney(p.total_completed_and_stored_to_date), { t: fmtMoney(p.current_payment_due), bold: true }]), { empty: 'No pay app activity.' });
  }

  if (on('equipment') && data.equipment) {
    heading('Equipment & maintenance', `${data.equipment.items.length} units - ${data.equipment.alerts.length} open alerts`);
    table([{ h: 'Type', w: 20 }, { h: 'Message', w: 50 }, { h: 'Severity', w: 15 }, { h: 'Due', w: 15 }],
      data.equipment.alerts.map((a: any) => [{ t: a.alert_type, bold: true }, a.message || '', { t: a.severity || '', pill: true }, day(a.due_date)]), { empty: 'No open alerts.' });
  }

  if (on('subcontractors') && data.subcontractors) {
    heading('Subcontractors');
    tiles([{ label: 'Active subcontractors', value: String(data.subcontractors.active.length) }, { label: 'Bid invitations this period', value: String(data.subcontractors.recentInvites.length) }]);
  }

  // Footer with page numbers
  const pages = pdf.getPages();
  pages.forEach((pg: any, i: number) => {
    pg.drawLine({ start: { x: M, y: 28 }, end: { x: W - M, y: 28 }, thickness: 0.5, color: LINE });
    pg.drawText(fit(`${companyName} - ${sub.name} - printed ${fmtD(new Date())}`, font, 7.5, 400), { x: M, y: 17, size: 7.5, font, color: MUTED });
    const t = `Page ${i + 1} of ${pages.length}`;
    pg.drawText(t, { x: W - M - font.widthOfTextAtSize(t, 7.5), y: 17, size: 7.5, font, color: MUTED });
  });

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