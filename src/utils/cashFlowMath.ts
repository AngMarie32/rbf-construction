import { OverheadFrequency, toDaily, DAYS_PER_MONTH } from '@/utils/overheadMath';

export interface CashFlowMonth {
  key: string; // YYYY-MM
  label: string; // Mon YY
  projected: boolean;
  equipment: number; // equipment purchases / deposits (outflow)
  repairs: number; // maintenance & repair payments (outflow)
  overhead: number; // operating costs (outflow)
  jobCosts: number; // project expenses + labor (outflow)
  loanOut: number; // loan principal disbursed (outflow)
  loanIn: number; // loan payments collected (inflow)
  outflow: number;
  inflow: number;
  net: number;
  cumulative: number;
}

export interface CashFlowInputs {
  months: number; // historical months to include (including current)
  projectMonths: number;
  startingCash: number;
  equipment: { date: string | null; amount: number }[];
  repairs: { date: string | null; amount: number }[];
  overhead: { amount: number; frequency: OverheadFrequency }[];
  /** Project expenses and labor (including uploaded QuickBooks/payroll costs). */
  jobCosts?: { date: string | null; amount: number }[];
  /** Include an averaged job-cost allowance in projected months. */
  projectJobCosts?: boolean;
  loans: { start_date: string; principal_amount: number }[];
  loanPayments: {
    due_date: string;
    scheduled_amount: number;
    paid_amount: number;
    paid_date: string | null;
    status: string;
  }[];
  /** Include an averaged repair allowance in projected months. */
  projectRepairs: boolean;
  /** Include an averaged equipment purchase allowance in projected months. */
  projectEquipment: boolean;
  /** Extra one-off planned outflows, keyed YYYY-MM. */
  planned?: Record<string, number>;
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function keyFromString(value: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}/.test(value)) return value.slice(0, 7);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return monthKey(d);
}

function labelFor(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

export function monthlyOverhead(items: { amount: number; frequency: OverheadFrequency }[]) {
  const daily = items.reduce((sum, i) => sum + toDaily(i.amount, i.frequency), 0);
  return daily * DAYS_PER_MONTH;
}

export function buildCashFlow(input: CashFlowInputs): {
  rows: CashFlowMonth[];
  overheadMonthly: number;
  avgRepairs: number;
  avgEquipment: number;
  avgJobCosts: number;
  lowestCash: CashFlowMonth | null;
  totals: { inflow: number; outflow: number; net: number };
} {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - (input.months - 1), 1);
  const keys: string[] = [];
  const total = input.months + input.projectMonths;
  for (let i = 0; i < total; i++) {
    keys.push(monthKey(new Date(first.getFullYear(), first.getMonth() + i, 1)));
  }
  const currentKey = monthKey(now);

  const blank = (key: string): CashFlowMonth => ({
    key,
    label: labelFor(key),
    projected: key > currentKey,
    equipment: 0,
    repairs: 0,
    overhead: 0,
    jobCosts: 0,
    loanOut: 0,
    loanIn: 0,
    outflow: 0,
    inflow: 0,
    net: 0,
    cumulative: 0,
  });

  const map = new Map<string, CashFlowMonth>(keys.map((k) => [k, blank(k)]));
  const add = (key: string | null, field: keyof CashFlowMonth, amount: number) => {
    if (!key) return;
    const row = map.get(key);
    if (!row) return;
    (row[field] as number) += Number(amount) || 0;
  };

  input.equipment.forEach((e) => add(keyFromString(e.date), 'equipment', e.amount));
  input.repairs.forEach((r) => add(keyFromString(r.date), 'repairs', r.amount));
  (input.jobCosts ?? []).forEach((j) => add(keyFromString(j.date), 'jobCosts', j.amount));
  input.loans.forEach((l) => add(keyFromString(l.start_date), 'loanOut', l.principal_amount));

  input.loanPayments.forEach((p) => {
    const paidKey = keyFromString(p.paid_date);
    const dueKey = keyFromString(p.due_date);
    if (p.paid_amount > 0 && paidKey) {
      add(paidKey, 'loanIn', p.paid_amount);
      return;
    }
    // Unpaid scheduled payment: count it in its due month when that month is in the future.
    if (dueKey && dueKey > currentKey) add(dueKey, 'loanIn', p.scheduled_amount);
  });

  const overheadMonthly = monthlyOverhead(input.overhead);

  // Trailing averages from actual history (exclude future months).
  const historical = keys.filter((k) => k <= currentKey);
  const sumField = (field: 'repairs' | 'equipment' | 'jobCosts') =>
    historical.reduce((s, k) => s + (map.get(k)?.[field] ?? 0), 0);
  const avgRepairs = historical.length ? sumField('repairs') / historical.length : 0;
  const avgEquipment = historical.length ? sumField('equipment') / historical.length : 0;
  const avgJobCosts = historical.length ? sumField('jobCosts') / historical.length : 0;

  let cumulative = Number(input.startingCash) || 0;
  const rows = keys.map((k) => {
    const row = map.get(k)!;
    row.overhead = overheadMonthly;
    if (row.projected) {
      if (input.projectRepairs) row.repairs = avgRepairs;
      if (input.projectEquipment) row.equipment = avgEquipment;
      if (input.projectJobCosts) row.jobCosts = avgJobCosts;
    }
    const planned = input.planned?.[k] ?? 0;
    row.outflow = row.equipment + row.repairs + row.overhead + row.jobCosts + row.loanOut + planned;
    row.inflow = row.loanIn;
    row.net = row.inflow - row.outflow;
    cumulative += row.net;
    row.cumulative = cumulative;
    return row;
  });

  const projectedRows = rows.filter((r) => r.projected);
  const lowestCash =
    projectedRows.length > 0
      ? projectedRows.reduce((min, r) => (r.cumulative < min.cumulative ? r : min))
      : null;

  const totals = rows.reduce(
    (acc, r) => ({
      inflow: acc.inflow + r.inflow,
      outflow: acc.outflow + r.outflow,
      net: acc.net + r.net,
    }),
    { inflow: 0, outflow: 0, net: 0 }
  );

  return { rows, overheadMonthly, avgRepairs, avgEquipment, avgJobCosts, lowestCash, totals };
}
