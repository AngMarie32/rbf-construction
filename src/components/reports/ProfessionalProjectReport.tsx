import React, { useEffect, useMemo, useState } from 'react';
import { format, startOfYear, endOfYear, subYears, subMonths, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { AlertTriangle, Briefcase, CircleDollarSign, Landmark, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isOpenJob } from '@/lib/analyticsData';
import { bondedExposure, loadBondCapacity, type Bond, type BondCapacity } from '@/types/bonds';
import {
  CHART,
  ChartTooltip,
  EmptyNote,
  KpiGrid,
  Legend,
  Panel,
  ReportDocument,
  ReportTable,
  ReportToolbar,
  SERIES,
  Section,
  axisProps,
  compact,
  money,
} from './ReportKit';

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  start_date: string;
  due_date: string;
  contract_value: number;
  completion_percentage: number;
  description?: string;
  field_leader?: string;
  address?: string;
  project_code?: string;
  type?: string;
}

interface Props {
  projects: Project[];
  totalExpenses: Record<string, number>;
  totalBilled: Record<string, number>;
  totalReceived: Record<string, number>;
  /** Extra controls shown at the left of the toolbar (e.g. a Back button). */
  toolbarStart?: React.ReactNode;
  /** Dated rows so billing and costs can be limited to the report period. Without them, lifetime totals are used. */
  entries?: {
    expenses: { project_id: string; amount: number; date: string | null }[];
    billing: { project_id: string; billed: number; paid: number; date: string | null }[];
  };
}

type Scope = 'active-closed' | 'active' | 'open' | 'all';
type Period = 'ytd' | 'last-year' | '12m' | 'all' | 'custom';
const SCOPES: Record<Scope, string> = {
  'active-closed': 'Active & closed jobs',
  active: 'Active jobs only',
  open: 'Active & on-hold jobs',
  all: 'All jobs',
};
const PERIODS: Record<Period, string> = {
  ytd: 'Year to date',
  'last-year': 'Last year',
  '12m': 'Last 12 months',
  all: 'All time',
  custom: 'Custom dates',
};
/** "2026-03-01" as local midnight (plain new Date() reads it as UTC, a day early in the US). */
const day = (v?: string | null) => (v ? new Date(`${v.slice(0, 10)}T00:00:00`) : null);
function periodRange(p: Period, custom?: DateRange): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (p === 'ytd') return { from: startOfYear(now), to: endOfDay(now) };
  if (p === 'last-year') { const y = subYears(now, 1); return { from: startOfYear(y), to: endOfYear(y) }; }
  if (p === '12m') return { from: startOfDay(subMonths(now, 12)), to: endOfDay(now) };
  if (p === 'custom') return { from: custom?.from ? startOfDay(custom.from) : null, to: custom?.to ? endOfDay(custom.to) : custom?.from ? endOfDay(custom.from) : null };
  return { from: null, to: null };
}

const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;
const statusColor: Record<string, string> = {
  Active: CHART.emerald,
  'On Hold': CHART.amber,
  Planning: CHART.indigo,
  Completed: CHART.blue,
  Closed: CHART.slate,
};

export const ProfessionalProjectReport: React.FC<Props> = ({ projects, totalExpenses, totalBilled, totalReceived, toolbarStart, entries }) => {
  const [leader, setLeader] = useState('all');
  const [scope, setScope] = useState<Scope>('active-closed');
  const [period, setPeriod] = useState<Period>('ytd');
  const [custom, setCustom] = useState<DateRange | undefined>();
  const range = useMemo(() => periodRange(period, custom), [period, custom]);
  const inRange = (d: Date | null) => !d || ((!range.from || d >= range.from) && (!range.to || d <= range.to));

  // Billing and costs inside the period (falls back to lifetime totals when dated rows aren't supplied).
  const sums = useMemo(() => {
    if (!entries || (!range.from && !range.to)) return { costs: totalExpenses, billed: totalBilled, received: totalReceived, active: null as Set<string> | null };
    const costs: Record<string, number> = {};
    const billed: Record<string, number> = {};
    const received: Record<string, number> = {};
    const active = new Set<string>();
    entries.expenses.forEach((e) => {
      if (!e.project_id || !inRange(day(e.date))) return;
      costs[e.project_id] = (costs[e.project_id] || 0) + (Number(e.amount) || 0);
      active.add(e.project_id);
    });
    entries.billing.forEach((b) => {
      if (!b.project_id || !inRange(day(b.date))) return;
      billed[b.project_id] = (billed[b.project_id] || 0) + (Number(b.billed) || 0);
      received[b.project_id] = (received[b.project_id] || 0) + (Number(b.paid) || 0);
      active.add(b.project_id);
    });
    return { costs, billed, received, active };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, range, totalExpenses, totalBilled, totalReceived]);

  const inScope = (p: Project) => {
    const st = p.status;
    if (scope === 'all') return true;
    if (scope === 'active') return st === 'Active';
    if (scope === 'open') return isOpenJob(st);
    // Active jobs always; closed jobs only when they had billing/costs in the period or ended in it.
    if (st === 'Active') return true;
    if (st !== 'Closed') return false;
    if (!sums.active) return true;
    return sums.active.has(p.id) || (!!p.due_date && inRange(day(p.due_date)));
  };
  const [companyName, setCompanyName] = useState('RBF Construction');
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [capacity, setCapacity] = useState<BondCapacity>({ single: 0, aggregate: 0 });

  useEffect(() => {
    supabase
      .from('company_settings')
      .select('company_name')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => data?.company_name && !/buildpro/i.test(data.company_name) && setCompanyName(data.company_name));
    (supabase as any)
      .from('project_bonds')
      .select('*, projects(name, contract_value, status, client)')
      .then(({ data, error }: any) => !error && setBonds(data || []));
    loadBondCapacity(supabase).then(setCapacity);
  }, []);

  const leaders = useMemo(() => [...new Set(projects.map((p) => p.field_leader).filter(Boolean))] as string[], [projects]);
  const rows = useMemo(
    () =>
      projects
        .filter((p) => inScope(p) && (leader === 'all' || p.field_leader === leader))
        .map((p) => {
          const billed = sums.billed[p.id] || 0;
          const received = sums.received[p.id] || 0;
          const costs = sums.costs[p.id] || 0;
          const profit = billed - costs;
          return {
            ...p,
            billed,
            received,
            costs,
            profit,
            owed: Math.max(0, billed - received),
            margin: billed > 0 ? (profit / billed) * 100 : null,
            billedPct: p.contract_value > 0 ? (billed / p.contract_value) * 100 : 0,
            late: !!p.due_date && (day(p.due_date) as Date) < new Date() && (p.completion_percentage || 0) < 100 && isOpenJob(p.status),
          };
        })
        .sort((a, b) => (b.contract_value || 0) - (a.contract_value || 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, scope, leader, sums, range]
  );

  const t = rows.reduce(
    (a, r) => ({
      contract: a.contract + (r.contract_value || 0),
      billed: a.billed + r.billed,
      received: a.received + r.received,
      costs: a.costs + r.costs,
      owed: a.owed + r.owed,
    }),
    { contract: 0, billed: 0, received: 0, costs: 0, owed: 0 }
  );
  const profit = t.billed - t.costs;
  const margin = t.billed > 0 ? (profit / t.billed) * 100 : 0;
  const leftToBill = Math.max(0, t.contract - t.billed);

  const statusMix = Object.entries(
    rows.reduce<Record<string, number>>((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})
  ).map(([name, value]) => ({ name, value }));
  const chartRows = rows.slice(0, 10).map((r) => ({ name: r.name.length > 22 ? `${r.name.slice(0, 21)}…` : r.name, Contract: r.contract_value || 0, Billed: r.billed, Costs: r.costs }));

  const watch = [
    ...rows.filter((r) => r.margin != null && r.margin < 0).map((r) => ({ job: r.name, issue: `Costs exceed billing by ${money(-r.profit)}`, tone: 'bad' as const })),
    ...rows.filter((r) => r.margin != null && r.margin >= 0 && r.margin < 10).map((r) => ({ job: r.name, issue: `Thin margin: ${pct(r.margin!)}`, tone: 'warn' as const })),
    ...rows.filter((r) => r.late).map((r) => ({ job: r.name, issue: `Past due date (${format(day(r.due_date) as Date, 'MMM d')}) at ${r.completion_percentage || 0}% complete`, tone: 'warn' as const })),
    ...rows.filter((r) => r.owed > 0 && r.owed >= r.billed * 0.5 && r.billed > 0).map((r) => ({ job: r.name, issue: `${money(r.owed)} still owed (${pct((r.owed / r.billed) * 100)} of billing)`, tone: 'warn' as const })),
  ];

  // Bonding
  const exposure = bondedExposure(bonds);
  const bondRows = bonds
    .filter((b) => ['Active', 'Requested'].includes(b.status))
    .filter((b) => leader === 'all' || rows.some((r) => r.id === b.project_id))
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  const usedPct = capacity.aggregate > 0 ? Math.min(100, (exposure.total / capacity.aggregate) * 100) : 0;

  const periodLabel =
    period === 'custom'
      ? range.from
        ? `${format(range.from, 'MMM d, yyyy')} – ${format(range.to || range.from, 'MMM d, yyyy')}`
        : 'All time'
      : period === 'ytd'
        ? `Year to date (Jan 1 – ${format(new Date(), 'MMM d, yyyy')})`
        : period === 'last-year'
          ? `${new Date().getFullYear() - 1}`
          : PERIODS[period];
  const chips = [SCOPES[scope], periodLabel, leader === 'all' ? 'All field leaders' : `Field leader: ${leader}`];
  const periodWord = range.from || range.to ? 'in period' : 'to date';

  return (
    <div className="space-y-4">
      <ReportToolbar>
        {toolbarStart && <div className="mr-auto">{toolbarStart}</div>}
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className="w-52" aria-label="Which jobs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SCOPES) as Scope[]).map((k) => (
              <SelectItem key={k} value={k}>{SCOPES[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-44" aria-label="Report period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIODS) as Period[]).map((k) => (
              <SelectItem key={k} value={k}>{PERIODS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {period === 'custom' && <DatePickerWithRange date={custom} onDateChange={setCustom} />}
        <Select value={leader} onValueChange={setLeader}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All field leaders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All field leaders</SelectItem>
            {leaders.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ReportToolbar>

      <ReportDocument
        eyebrow="Report snapshot"
        title="Project Performance"
        chips={chips}
        companyName={companyName}
        stats={[
          { label: 'Contract value', value: compact(t.contract) },
          { label: `Profit ${periodWord}`, value: compact(profit) },
        ]}
      >
        <Section eyebrow="Overview" title="Where the portfolio stands">
          <KpiGrid
            items={[
              { label: 'Jobs', value: String(rows.length), sub: `${rows.filter((r) => r.late).length} past due`, icon: Briefcase, accent: 'bg-blue-600' },
              { label: 'Contract value', value: compact(t.contract), sub: `${compact(leftToBill)} left to bill`, icon: CircleDollarSign, accent: 'bg-indigo-500' },
              { label: 'Billed', value: compact(t.billed), sub: `${pct(t.contract ? (t.billed / t.contract) * 100 : 0)} of contract`, icon: Receipt, accent: 'bg-emerald-500' },
              { label: 'Costs', value: compact(t.costs), sub: `Recorded expenses ${periodWord}`, icon: Wallet, accent: 'bg-orange-500' },
              { label: `Profit ${periodWord}`, value: compact(profit), sub: `${pct(margin)} margin on billing`, icon: TrendingUp, accent: 'bg-amber-500', tone: profit < 0 ? 'bad' : 'good' },
              { label: 'Owed to you', value: compact(t.owed), sub: `${compact(t.received)} received`, icon: Landmark, accent: 'bg-rose-500', tone: t.owed > 0 ? undefined : 'good' },
            ]}
          />
        </Section>

        <Section eyebrow="Jobs" title="Contract, billing and costs by job" note={rows.length > 10 ? 'Top 10 by contract value' : undefined}>
          {chartRows.length ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <Panel title="Contract vs billed vs costs">
                <div style={{ height: Math.max(180, chartRows.length * 34) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} layout="vertical" margin={{ left: 8, right: 12 }}>
                      <CartesianGrid horizontal={false} stroke={CHART.grid} />
                      <XAxis type="number" {...axisProps} tickFormatter={compact} />
                      <YAxis type="category" dataKey="name" {...axisProps} width={140} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="Contract" fill={CHART.slate} radius={[0, 3, 3, 0]} barSize={8} isAnimationActive={false} />
                      <Bar dataKey="Billed" fill={CHART.emerald} radius={[0, 3, 3, 0]} barSize={8} isAnimationActive={false} />
                      <Bar dataKey="Costs" fill={CHART.orange} radius={[0, 3, 3, 0]} barSize={8} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Legend items={[{ label: 'Contract', color: CHART.slate }, { label: 'Billed', color: CHART.emerald }, { label: 'Costs', color: CHART.orange }]} />
              </Panel>
              <Panel title="Jobs by status">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2} isAnimationActive={false}>
                        {statusMix.map((s, i) => (
                          <Cell key={s.name} fill={statusColor[s.name] || SERIES[i % SERIES.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormat={(v) => `${v} job${v === 1 ? '' : 's'}`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Legend items={statusMix.map((s, i) => ({ label: `${s.name} (${s.value})`, color: statusColor[s.name] || SERIES[i % SERIES.length] }))} />
              </Panel>
            </div>
          ) : (
            <EmptyNote>No jobs match these filters.</EmptyNote>
          )}
        </Section>

        {watch.length > 0 && (
          <Section eyebrow="Attention" title="Watch list">
            <div className="grid gap-2 sm:grid-cols-2">
              {watch.slice(0, 10).map((w, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 text-sm break-inside-avoid ${w.tone === 'bad' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${w.tone === 'bad' ? 'text-rose-600' : 'text-amber-600'}`} />
                  <div>
                    <p className="font-semibold text-slate-900">{w.job}</p>
                    <p className="text-slate-600">{w.issue}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section eyebrow="Detail" title="Job by job">
          {rows.length ? (
            <ReportTable
              rows={rows}
              columns={[
                {
                  header: 'Job',
                  cell: (r) => (
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-slate-500">{[r.project_code, r.client, r.field_leader].filter(Boolean).join(' · ')}</p>
                    </div>
                  ),
                },
                { header: 'Status', cell: (r) => <span className="whitespace-nowrap text-xs font-medium" style={{ color: statusColor[r.status] || CHART.axis }}>● {r.status}</span> },
                {
                  header: 'Progress',
                  cell: (r) => (
                    <div className="w-24">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, r.completion_percentage || 0)}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{r.completion_percentage || 0}% done · {pct(r.billedPct)} billed</p>
                    </div>
                  ),
                },
                { header: 'Contract', align: 'right', cell: (r) => money(r.contract_value || 0) },
                { header: 'Billed', align: 'right', cell: (r) => money(r.billed) },
                { header: 'Costs', align: 'right', cell: (r) => money(r.costs) },
                {
                  header: 'Profit',
                  align: 'right',
                  cell: (r) => (
                    <div>
                      <p className={r.profit < 0 ? 'font-semibold text-rose-600' : 'font-semibold'}>{money(r.profit)}</p>
                      <p className="text-[11px] text-slate-500">{r.margin == null ? '—' : pct(r.margin)}</p>
                    </div>
                  ),
                },
                { header: 'Owed', align: 'right', cell: (r) => (r.owed ? money(r.owed) : <span className="text-slate-400">—</span>) },
              ]}
              footer={
                <tr>
                  <td className="px-4 py-3" colSpan={3}>
                    Totals ({rows.length} jobs)
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(t.contract)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(t.billed)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(t.costs)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${profit < 0 ? 'text-rose-600' : ''}`}>{money(profit)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(t.owed)}</td>
                </tr>
              }
            />
          ) : (
            <EmptyNote>No jobs match these filters.</EmptyNote>
          )}
        </Section>

        <Section eyebrow="Surety" title="Bonding" note={capacity.surety ? `Surety: ${capacity.surety}` : undefined}>
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Panel title="Capacity">
              {capacity.aggregate > 0 ? (
                <>
                  <p className="font-display text-3xl font-bold tabular-nums">{money(Math.max(0, capacity.aggregate - exposure.total))}</p>
                  <p className="text-xs text-slate-500">available of {money(capacity.aggregate)} aggregate</p>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${usedPct}%`, background: usedPct >= 100 ? CHART.rose : usedPct >= 80 ? CHART.amber : CHART.emerald }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {money(exposure.total)} bonded ({usedPct.toFixed(0)}%) · single-job limit {capacity.single ? money(capacity.single) : 'not set'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Bond capacity isn't set. Add it in Settings → Bonding.</p>
              )}
            </Panel>
            {bondRows.length ? (
              <ReportTable
                rows={bondRows}
                columns={[
                  { header: 'Job', cell: (b) => <span className="font-medium">{b.projects?.name || '—'}</span> },
                  { header: 'Bond', cell: (b) => `${b.bond_type}${b.bond_number ? ` #${b.bond_number}` : ''}` },
                  { header: 'Status', cell: (b) => b.status },
                  { header: 'Expires', cell: (b) => (b.expiration_date ? format(new Date(`${b.expiration_date}T00:00:00`), 'MMM d, yyyy') : '—') },
                  {
                    header: 'Amount',
                    align: 'right',
                    cell: (b) => (
                      <span className={capacity.single && Number(b.amount) > capacity.single ? 'font-semibold text-rose-600' : ''}>{money(Number(b.amount) || 0)}</span>
                    ),
                  },
                ]}
              />
            ) : (
              <EmptyNote>No active or requested bonds.</EmptyNote>
            )}
          </div>
        </Section>
      </ReportDocument>
    </div>
  );
};
