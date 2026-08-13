/**
 * Shared analytics report engine.
 * Pure functions only (no imports) so the exact same file can be copied into
 * supabase/functions/send-analytics-report/engine.ts.
 */

export interface AnalyticsOptions {
  startDate: string | null;
  endDate: string | null;
  statuses: string[];        // empty = all
  projectIds: string[];      // empty = all
  fieldLeader: string | null;
  includeArchived: boolean;
  companyIds: string[];      // empty = all
}

export const DEFAULT_ANALYTICS_OPTIONS: AnalyticsOptions = {
  startDate: null,
  endDate: null,
  statuses: [],
  projectIds: [],
  fieldLeader: null,
  includeArchived: false,
  companyIds: [],
};

export interface RawData {
  projects: any[];
  expenses: any[];
  billing: any[];
  changeOrders: any[];
}

export interface ProjectRow {
  id: string;
  name: string;
  client: string;
  status: string;
  fieldLeader: string;
  completion: number;
  contractValue: number;
  changeOrders: number;
  revisedContract: number;
  billed: number;
  received: number;
  outstanding: number;
  expenses: number;
  profit: number;
  margin: number;
  backlog: number;
  burnPct: number;
}

const num = (v: any) => Number(v || 0);

function inRange(date: string | null | undefined, o: AnalyticsOptions) {
  if (!date) return !o.startDate && !o.endDate;
  const d = String(date).slice(0, 10);
  if (o.startDate && d < o.startDate) return false;
  if (o.endDate && d > o.endDate) return false;
  return true;
}

export function buildAnalytics(raw: RawData, options: AnalyticsOptions) {
  const o = { ...DEFAULT_ANALYTICS_OPTIONS, ...options };

  const projects = (raw.projects || []).filter((p) => {
    if (!o.includeArchived && p.archived_at) return false;
    if (o.projectIds.length && !o.projectIds.includes(p.id)) return false;
    if (o.statuses.length && !o.statuses.includes(p.status)) return false;
    if (o.fieldLeader && (p.field_leader || 'Unassigned') !== o.fieldLeader) return false;
    if (o.companyIds.length && !o.companyIds.includes(p.company_id)) return false;
    return true;
  });

  const ids = new Set(projects.map((p) => p.id));
  const expenses = (raw.expenses || []).filter((e) => ids.has(e.project_id) && inRange(e.date, o));
  const billing = (raw.billing || []).filter(
    (b) => ids.has(b.project_id) && inRange(b.invoice_date || b.billing_period_end, o)
  );
  const changeOrders = (raw.changeOrders || []).filter((c) => ids.has(c.project_id) && inRange(c.date, o));

  const sumBy = <T,>(list: T[], key: (t: T) => string, val: (t: T) => number) => {
    const m: Record<string, number> = {};
    list.forEach((i) => {
      const k = key(i);
      m[k] = (m[k] || 0) + val(i);
    });
    return m;
  };

  const expByProject = sumBy(expenses, (e: any) => e.project_id, (e: any) => num(e.amount));
  const billedByProject = sumBy(billing, (b: any) => b.project_id, (b: any) => num(b.billed_amount));
  const paidByProject = sumBy(billing, (b: any) => b.project_id, (b: any) => num(b.paid_amount));
  const coByProject = sumBy(changeOrders, (c: any) => c.project_id, (c: any) => num(c.amount));

  const rows: ProjectRow[] = projects.map((p) => {
    const contractValue = num(p.contract_value);
    const co = coByProject[p.id] || 0;
    const revised = contractValue + co;
    const billed = billedByProject[p.id] || 0;
    const received = paidByProject[p.id] || 0;
    const spend = expByProject[p.id] || 0;
    const profit = billed - spend;
    return {
      id: p.id,
      name: p.name,
      client: p.client || '—',
      status: p.status || '—',
      fieldLeader: p.field_leader || 'Unassigned',
      completion: num(p.completion_percentage),
      contractValue,
      changeOrders: co,
      revisedContract: revised,
      billed,
      received,
      outstanding: billed - received,
      expenses: spend,
      profit,
      margin: billed > 0 ? (profit / billed) * 100 : 0,
      backlog: revised - billed,
      burnPct: revised > 0 ? (spend / revised) * 100 : 0,
    };
  });

  const t = rows.reduce(
    (a, r) => {
      a.contractValue += r.contractValue;
      a.changeOrders += r.changeOrders;
      a.revisedContract += r.revisedContract;
      a.billed += r.billed;
      a.received += r.received;
      a.outstanding += r.outstanding;
      a.expenses += r.expenses;
      a.profit += r.profit;
      a.backlog += r.backlog;
      return a;
    },
    {
      contractValue: 0, changeOrders: 0, revisedContract: 0, billed: 0,
      received: 0, outstanding: 0, expenses: 0, profit: 0, backlog: 0,
    }
  );

  const totals = {
    ...t,
    margin: t.billed > 0 ? (t.profit / t.billed) * 100 : 0,
    projectCount: rows.length,
    activeProjects: rows.filter((r) => r.status === 'Open' || r.status === 'Active').length,
    avgCompletion: rows.length ? rows.reduce((s, r) => s + r.completion, 0) / rows.length : 0,
    collectionRate: t.billed > 0 ? (t.received / t.billed) * 100 : 0,
    burnPct: t.revisedContract > 0 ? (t.expenses / t.revisedContract) * 100 : 0,
    changeOrderCount: changeOrders.length,
    expenseCount: expenses.length,
    invoiceCount: billing.length,
  };

  const catMap = sumBy(expenses, (e: any) => e.category || 'Uncategorized', (e: any) => num(e.amount));
  const categories = Object.entries(catMap)
    .map(([label, total]) => ({
      label,
      total,
      pct: totals.expenses > 0 ? (total / totals.expenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const monthKey = (d: string) => String(d).slice(0, 7);
  const monthSet = new Set<string>();
  expenses.forEach((e: any) => e.date && monthSet.add(monthKey(e.date)));
  billing.forEach((b: any) => (b.invoice_date || b.billing_period_end) && monthSet.add(monthKey(b.invoice_date || b.billing_period_end)));
  const expByMonth = sumBy(expenses.filter((e: any) => e.date), (e: any) => monthKey(e.date), (e: any) => num(e.amount));
  const billedByMonth = sumBy(
    billing.filter((b: any) => b.invoice_date || b.billing_period_end),
    (b: any) => monthKey(b.invoice_date || b.billing_period_end),
    (b: any) => num(b.billed_amount)
  );
  const receivedByMonth = sumBy(
    billing.filter((b: any) => b.payment_date),
    (b: any) => monthKey(b.payment_date),
    (b: any) => num(b.paid_amount)
  );
  const monthly = Array.from(monthSet)
    .sort()
    .map((m) => ({
      month: m,
      billed: billedByMonth[m] || 0,
      received: receivedByMonth[m] || 0,
      expenses: expByMonth[m] || 0,
      profit: (billedByMonth[m] || 0) - (expByMonth[m] || 0),
    }));

  const statusMap = sumBy(rows, (r) => r.status, () => 1);
  const statusCounts = Object.entries(statusMap).map(([label, value]) => ({ label, value }));

  const leaderMap: Record<string, { leader: string; projects: number; contract: number; billed: number; expenses: number; profit: number }> = {};
  rows.forEach((r) => {
    const k = r.fieldLeader;
    leaderMap[k] = leaderMap[k] || { leader: k, projects: 0, contract: 0, billed: 0, expenses: 0, profit: 0 };
    leaderMap[k].projects += 1;
    leaderMap[k].contract += r.revisedContract;
    leaderMap[k].billed += r.billed;
    leaderMap[k].expenses += r.expenses;
    leaderMap[k].profit += r.profit;
  });
  const leaders = Object.values(leaderMap).sort((a, b) => b.contract - a.contract);

  const today = new Date().toISOString().slice(0, 10);
  const bucket = (days: number) => 0;
  const aging = [
    { label: 'Current', total: 0 },
    { label: '1-30', total: 0 },
    { label: '31-60', total: 0 },
    { label: '61-90', total: 0 },
    { label: '90+', total: 0 },
  ];
  billing.forEach((b: any) => {
    const open = num(b.billed_amount) - num(b.paid_amount);
    if (open <= 0) return;
    const due = b.due_date || b.invoice_date;
    if (!due) {
      aging[0].total += open;
      return;
    }
    const days = Math.floor((Date.parse(today) - Date.parse(String(due).slice(0, 10))) / 86400000);
    const idx = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
    aging[idx].total += open;
  });

  const vendorMap = sumBy(expenses, (e: any) => e.vendor || 'Unspecified', (e: any) => num(e.amount));
  const vendors = Object.entries(vendorMap)
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  const changeOrderRows = changeOrders
    .map((c: any) => ({
      id: c.id,
      number: c.number,
      project: projects.find((p) => p.id === c.project_id)?.name || '—',
      description: c.description || '',
      date: c.date,
      amount: num(c.amount),
      status: c.status || '—',
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return { rows, totals, categories, monthly, statusCounts, leaders, aging, vendors, changeOrderRows };
}

export type AnalyticsReport = ReturnType<typeof buildAnalytics>;
