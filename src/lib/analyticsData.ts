/**
 * Real-data builders for the Analytics tabs. Everything here is derived from
 * stored records: no projections, no random numbers, no fixed percentage splits.
 */
import { addMonths, differenceInCalendarDays, format, startOfMonth } from 'date-fns';

export interface AProject {
  id: string;
  name: string;
  client?: string | null;
  status?: string | null;
  contract_value?: number | null;
  completion_percentage?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  field_leader?: string | null;
}
export interface AExpense { project_id: string; amount: number | null; date?: string | null; category?: string | null; status?: string | null; vendor?: string | null }
export interface ABilling { project_id: string; billed_amount: number | null; paid_amount: number | null; billing_period_start?: string | null; billing_period_end?: string | null; invoice_date?: string | null }
export interface AChangeOrder { project_id: string; amount: number | null; date?: string | null; status?: string | null }
export interface ATimeEntry {
  project_id: string;
  work_date: string;
  employee_name: string;
  trade?: string | null;
  regular_hours: number | null;
  overtime_hours: number | null;
  hourly_rate: number | null;
  ot_multiplier: number | null;
  burden_percent: number | null;
  total_cost: number | null;
}

const n = (v: unknown) => Number(v) || 0;
/** Jobs that are under way: Active or On Hold. Planning, Completed and Closed are excluded. */
export const isOpenJob = (s?: string | null) => ['active', 'on hold', 'open', 'in progress'].includes((s || '').toLowerCase().trim());
const OPEN = isOpenJob;

/** Last `count` calendar months ending with the current month, oldest first. */
export function monthBuckets(count = 12, today = new Date()) {
  const first = startOfMonth(addMonths(today, -(count - 1)));
  return Array.from({ length: count }, (_, i) => {
    const d = addMonths(first, i);
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM'), long: format(d, 'MMM yyyy') };
  });
}
const monthKey = (d?: string | null) => (d && d.length >= 7 ? d.slice(0, 7) : null);

// ---------------------------------------------------------------- Projects

export function buildProjectAnalytics(projects: AProject[], expenses: AExpense[], changeOrders: AChangeOrder[], today = new Date(), monthCount = 12) {
  const costBy: Record<string, number> = {};
  expenses.forEach((e) => (costBy[e.project_id] = (costBy[e.project_id] || 0) + n(e.amount)));

  const approvedCO: Record<string, number> = {};
  changeOrders.forEach((c) => {
    if ((c.status || '').toLowerCase() === 'approved') approvedCO[c.project_id] = (approvedCO[c.project_id] || 0) + n(c.amount);
  });

  const statusCounts: Record<string, number> = {};
  projects.forEach((p) => (statusCounts[p.status || 'Unknown'] = (statusCounts[p.status || 'Unknown'] || 0) + 1));
  const statusDistribution = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const open = projects.filter((p) => OPEN(p.status));

  // Budget: revised contract (contract + approved COs) vs costs to date, with % complete.
  const budget = open
    .map((p) => {
      const contract = n(p.contract_value) + (approvedCO[p.id] || 0);
      const costs = costBy[p.id] || 0;
      const done = n(p.completion_percentage);
      const costPct = contract > 0 ? (costs / contract) * 100 : 0;
      return { id: p.id, name: p.name, client: p.client || '', contract, costs, done, costPct, overrun: costPct - done };
    })
    .sort((a, b) => b.contract - a.contract);

  // Schedule: how much of the planned duration has passed vs work complete.
  const schedule = open
    .filter((p) => p.due_date)
    .map((p) => {
      const due = new Date(p.due_date as string);
      const start = p.start_date ? new Date(p.start_date) : null;
      const daysLeft = differenceInCalendarDays(due, today);
      const done = n(p.completion_percentage);
      let timePct: number | null = null;
      if (start && due > start) {
        timePct = Math.max(0, Math.min(100, (differenceInCalendarDays(today, start) / differenceInCalendarDays(due, start)) * 100));
      }
      let state: 'late' | 'behind' | 'at-risk' | 'on-track';
      if (daysLeft < 0 && done < 100) state = 'late';
      else if (timePct != null && timePct - done > 15) state = 'behind';
      else if (daysLeft <= 14 && done < 90) state = 'at-risk';
      else state = 'on-track';
      return { id: p.id, name: p.name, leader: p.field_leader || 'Unassigned', due: p.due_date as string, daysLeft, done, timePct, state };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const months = monthBuckets(monthCount, today);
  const coByMonth = months.map((m) => {
    const inMonth = changeOrders.filter((c) => monthKey(c.date) === m.key);
    return {
      month: m.label,
      approved: inMonth.filter((c) => (c.status || '').toLowerCase() === 'approved').reduce((s, c) => s + n(c.amount), 0),
      pending: inMonth.filter((c) => !['approved', 'rejected'].includes((c.status || '').toLowerCase())).reduce((s, c) => s + n(c.amount), 0),
      count: inMonth.length,
    };
  });

  const totals = {
    projects: projects.length,
    open: open.length,
    contract: open.reduce((s, p) => s + n(p.contract_value), 0),
    approvedCO: Object.values(approvedCO).reduce((s, v) => s + v, 0),
    avgComplete: open.length ? open.reduce((s, p) => s + n(p.completion_percentage), 0) / open.length : 0,
    late: schedule.filter((s) => s.state === 'late').length,
    behind: schedule.filter((s) => s.state === 'behind' || s.state === 'at-risk').length,
    overBudget: budget.filter((b) => b.overrun > 10).length,
  };

  const exportRows = budget.map((b) => {
    const s = schedule.find((x) => x.id === b.id);
    return {
      Project: b.name,
      Client: b.client,
      'Contract (incl. approved COs)': Math.round(b.contract),
      'Costs to date': Math.round(b.costs),
      'Cost % of contract': Number(b.costPct.toFixed(1)),
      '% complete': b.done,
      'Due date': s?.due || '',
      'Days left': s?.daysLeft ?? '',
      Schedule: s?.state || 'no due date',
    };
  });

  return { statusDistribution, budget, schedule, coByMonth, totals, exportRows };
}

// --------------------------------------------------------------- Financial

export function buildFinancialAnalytics(projects: AProject[], expenses: AExpense[], billing: ABilling[], today = new Date(), monthCount = 12) {
  const months = monthBuckets(monthCount, today);
  const billDate = (b: ABilling) => b.billing_period_end || b.invoice_date || b.billing_period_start || null;

  const monthly = months.map((m) => {
    const bills = billing.filter((b) => monthKey(billDate(b)) === m.key);
    const billed = bills.reduce((s, b) => s + n(b.billed_amount), 0);
    const received = bills.reduce((s, b) => s + n(b.paid_amount), 0);
    const costs = expenses.filter((e) => monthKey(e.date) === m.key).reduce((s, e) => s + n(e.amount), 0);
    return { month: m.label, long: m.long, billed, received, costs, net: received - costs };
  });
  let running = 0;
  const cumulative = monthly.map((m) => ({ month: m.month, cash: (running += m.net) }));

  const costBy: Record<string, number> = {};
  expenses.forEach((e) => (costBy[e.project_id] = (costBy[e.project_id] || 0) + n(e.amount)));
  const billedBy: Record<string, number> = {};
  const receivedBy: Record<string, number> = {};
  billing.forEach((b) => {
    billedBy[b.project_id] = (billedBy[b.project_id] || 0) + n(b.billed_amount);
    receivedBy[b.project_id] = (receivedBy[b.project_id] || 0) + n(b.paid_amount);
  });

  const byProject = projects
    .map((p) => {
      const billed = billedBy[p.id] || 0;
      const costs = costBy[p.id] || 0;
      return {
        id: p.id,
        name: p.name,
        status: p.status || '',
        billed,
        received: receivedBy[p.id] || 0,
        costs,
        profit: billed - costs,
        margin: billed > 0 ? ((billed - costs) / billed) * 100 : null,
      };
    })
    .filter((r) => r.billed > 0 || r.costs > 0)
    .sort((a, b) => b.billed - a.billed);

  const costByCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      const k = e.category || 'Other';
      acc[k] = (acc[k] || 0) + n(e.amount);
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const billed = byProject.reduce((s, r) => s + r.billed, 0);
  const received = byProject.reduce((s, r) => s + r.received, 0);
  const costs = expenses.reduce((s, e) => s + n(e.amount), 0);
  const last3 = monthly.slice(-3);
  const totals = {
    billed,
    received,
    costs,
    owed: billed - received,
    profit: billed - costs,
    margin: billed > 0 ? ((billed - costs) / billed) * 100 : null,
    collectRate: billed > 0 ? (received / billed) * 100 : null,
    avgMonthlyNet: last3.reduce((s, m) => s + m.net, 0) / (last3.length || 1),
  };

  const exportRows = [
    ...monthly.map((m) => ({ Section: 'Monthly', Period: m.long, Billed: Math.round(m.billed), Received: Math.round(m.received), Costs: Math.round(m.costs), 'Net cash': Math.round(m.net) })),
    ...byProject.map((r) => ({ Section: 'By project', Period: r.name, Billed: Math.round(r.billed), Received: Math.round(r.received), Costs: Math.round(r.costs), 'Net cash': Math.round(r.received - r.costs), 'Margin %': r.margin == null ? '' : Number(r.margin.toFixed(1)) })),
  ];

  return { monthly, cumulative, byProject, costByCategory, totals, exportRows };
}

// ------------------------------------------------------------------- Labor

/** Cost of a time entry: stored total, or hours x rate with overtime and burden. */
export function entryCost(t: ATimeEntry) {
  if (t.total_cost != null) return n(t.total_cost);
  const base = n(t.regular_hours) * n(t.hourly_rate) + n(t.overtime_hours) * n(t.hourly_rate) * (n(t.ot_multiplier) || 1.5);
  return base * (1 + n(t.burden_percent) / 100);
}

export function buildLaborAnalytics(entries: ATimeEntry[], projects: AProject[], today = new Date(), monthCount = 12) {
  const name: Record<string, string> = {};
  projects.forEach((p) => (name[p.id] = p.name));
  const months = monthBuckets(monthCount, today);

  const monthly = months.map((m) => {
    const inMonth = entries.filter((t) => monthKey(t.work_date) === m.key);
    return {
      month: m.label,
      regular: inMonth.reduce((s, t) => s + n(t.regular_hours), 0),
      overtime: inMonth.reduce((s, t) => s + n(t.overtime_hours), 0),
      cost: inMonth.reduce((s, t) => s + entryCost(t), 0),
    };
  });

  const group = (key: (t: ATimeEntry) => string) => {
    const acc: Record<string, { name: string; hours: number; ot: number; cost: number; people: Set<string> }> = {};
    entries.forEach((t) => {
      const k = key(t);
      const g = (acc[k] ||= { name: k, hours: 0, ot: 0, cost: 0, people: new Set() });
      g.hours += n(t.regular_hours) + n(t.overtime_hours);
      g.ot += n(t.overtime_hours);
      g.cost += entryCost(t);
      g.people.add(t.employee_name);
    });
    return Object.values(acc)
      .map((g) => ({ name: g.name, hours: g.hours, ot: g.ot, cost: g.cost, people: g.people.size, rate: g.hours > 0 ? g.cost / g.hours : 0 }))
      .sort((a, b) => b.cost - a.cost);
  };

  const byProject = group((t) => name[t.project_id] || 'Unknown project');
  const byTrade = group((t) => t.trade || 'Unspecified');
  const byPerson = group((t) => t.employee_name || 'Unknown');

  const hours = entries.reduce((s, t) => s + n(t.regular_hours) + n(t.overtime_hours), 0);
  const ot = entries.reduce((s, t) => s + n(t.overtime_hours), 0);
  const cost = entries.reduce((s, t) => s + entryCost(t), 0);
  const totals = {
    cost,
    hours,
    otHours: ot,
    otShare: hours > 0 ? (ot / hours) * 100 : 0,
    people: new Set(entries.map((t) => t.employee_name)).size,
    jobs: new Set(entries.map((t) => t.project_id)).size,
    blendedRate: hours > 0 ? cost / hours : 0,
  };

  const exportRows = byPerson.map((p) => ({
    Person: p.name,
    Hours: Number(p.hours.toFixed(1)),
    'Overtime hours': Number(p.ot.toFixed(1)),
    'Labor cost': Math.round(p.cost),
    'Cost per hour': Number(p.rate.toFixed(2)),
  }));

  return { monthly, byProject, byTrade, byPerson, totals, exportRows };
}
