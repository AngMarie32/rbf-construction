import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import {
  Printer,
  Building2,
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  Clock,
  MapPin,
  CalendarDays,
  HardHat,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

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

interface ProjectReportProps {
  projects: Project[];
  totalExpenses: Record<string, number>;
  totalBilled: Record<string, number>;
  totalReceived: Record<string, number>;
}

// The report is a printable document, so it always uses light "paper" colors, even in dark mode.
const STATUS_STYLE: Record<string, { dot: string; chip: string }> = {
  active: { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  planning: { dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  'on hold': { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  completed: { dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700 ring-slate-500/20' },
  closed: { dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700 ring-slate-500/20' },
};
const statusStyle = (s: string) => STATUS_STYLE[(s || '').toLowerCase()] || STATUS_STYLE.closed;

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString()}`;
const compact = (n: number) => {
  const a = Math.abs(n || 0);
  const sign = n < 0 ? '-' : '';
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 10_000) return `${sign}$${Math.round(a / 1000).toLocaleString()}K`;
  return money(n);
};
const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const safeDate = (d?: string) => (d ? format(new Date(d), 'MMM d, yyyy') : '—');

const PENDING_STATUSES = ['Pending Field Approval', 'Pending Office Approval'];

export const ProjectReport: React.FC<ProjectReportProps> = ({ projects, totalExpenses, totalBilled, totalReceived }) => {
  const [selectedFieldLeader, setSelectedFieldLeader] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [companyInfo, setCompanyInfo] = useState<{ company_name?: string; address?: string; phone?: string; email?: string } | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [pendingExpenses, setPendingExpenses] = useState<Record<string, number>>({});

  const fieldLeaders = useMemo(() => [...new Set(projects.map((p) => p.field_leader).filter(Boolean))] as string[], [projects]);
  const statuses = useMemo(() => [...new Set(projects.map((p) => p.status).filter(Boolean))] as string[], [projects]);

  useEffect(() => {
    supabase
      .from('company_settings')
      .select('*')
      .maybeSingle()
      .then(({ data }) => setCompanyInfo(data));

    // Count every expense still waiting on approval (field or office).
    supabase
      .from('expenses')
      .select('project_id, amount')
      .in('status', PENDING_STATUSES)
      .then(({ data }) => {
        const byProject: Record<string, number> = {};
        (data || []).forEach((e) => {
          byProject[e.project_id] = (byProject[e.project_id] || 0) + (Number(e.amount) || 0);
        });
        setPendingExpenses(byProject);
      });
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (selectedFieldLeader !== 'all') list = list.filter((p) => p.field_leader === selectedFieldLeader);
    if (selectedStatus !== 'all') list = list.filter((p) => p.status === selectedStatus);
    if (dateRange?.from && dateRange?.to) {
      list = list.filter((p) => {
        const start = new Date(p.start_date);
        return start >= dateRange.from! && start <= dateRange.to!;
      });
    }
    return [...list].sort((a, b) => (b.contract_value || 0) - (a.contract_value || 0));
  }, [projects, selectedFieldLeader, selectedStatus, dateRange]);

  const t = useMemo(
    () =>
      filteredProjects.reduce(
        (acc, p) => ({
          contract: acc.contract + (p.contract_value || 0),
          costs: acc.costs + (totalExpenses[p.id] || 0),
          billed: acc.billed + (totalBilled[p.id] || 0),
          received: acc.received + (totalReceived[p.id] || 0),
          pending: acc.pending + (pendingExpenses[p.id] || 0),
        }),
        { contract: 0, costs: 0, billed: 0, received: 0, pending: 0 }
      ),
    [filteredProjects, totalExpenses, totalBilled, totalReceived, pendingExpenses]
  );

  const owed = t.billed - t.received;
  const leftToBill = Math.max(0, t.contract - t.billed);
  const billedMargin = pct(t.billed - t.costs, t.billed); // margin on the work billed so far
  const cashPosition = t.received - t.costs;
  const avgComplete = filteredProjects.length
    ? filteredProjects.reduce((s, p) => s + (p.completion_percentage || 0), 0) / filteredProjects.length
    : 0;

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    filteredProjects.forEach((p) => (c[p.status] = (c[p.status] || 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [filteredProjects]);

  const companyName = companyInfo?.company_name || 'RBF Construction';

  const kpis = [
    { label: 'Contract value', value: compact(t.contract), sub: `${filteredProjects.length} project${filteredProjects.length === 1 ? '' : 's'}`, icon: DollarSign, accent: 'bg-blue-600' },
    { label: 'Billed to date', value: compact(t.billed), sub: `${pct(t.billed, t.contract).toFixed(0)}% of contract`, icon: CreditCard, accent: 'bg-indigo-500' },
    { label: 'Received', value: compact(t.received), sub: `${pct(t.received, t.billed).toFixed(0)}% of billed collected`, icon: Wallet, accent: 'bg-emerald-500' },
    { label: 'Costs to date', value: compact(t.costs), sub: `${pct(t.costs, t.contract).toFixed(0)}% of contract`, icon: Receipt, accent: 'bg-orange-500' },
    { label: 'Owed to you', value: compact(owed), sub: 'Billed, not yet paid', icon: Clock, accent: 'bg-amber-500' },
    { label: 'Awaiting approval', value: compact(t.pending), sub: 'Expenses not yet approved', icon: Receipt, accent: 'bg-rose-500' },
  ];

  const bar = [
    { label: 'Received', value: t.received, color: 'bg-emerald-500' },
    { label: 'Billed, unpaid', value: Math.max(0, owed), color: 'bg-amber-400' },
    { label: 'Left to bill', value: leftToBill, color: 'bg-slate-200' },
  ];
  const barTotal = bar.reduce((s, b) => s + b.value, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Controls (hidden when printing) */}
      <Card className="p-4 print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start date between</label>
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-64" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Field leader</label>
              <Select value={selectedFieldLeader} onValueChange={setSelectedFieldLeader}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All field leaders" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All field leaders</SelectItem>
                  {fieldLeaders.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>
      </Card>

      {/* The report document */}
      <article
        id="project-report"
        className="report-print overflow-hidden rounded-2xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0"
      >
        {/* Cover band */}
        <header className="relative overflow-hidden bg-[hsl(222_47%_13%)] px-8 py-8 text-white sm:px-10">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
          />
          <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Project Portfolio Report</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{companyName}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-3 py-1">Generated {format(new Date(), 'MMMM d, yyyy')}</span>
                {selectedStatus !== 'all' && <span className="rounded-full bg-white/10 px-3 py-1">Status: {selectedStatus}</span>}
                {selectedFieldLeader !== 'all' && <span className="rounded-full bg-white/10 px-3 py-1">Field leader: {selectedFieldLeader}</span>}
                {dateRange?.from && dateRange?.to && (
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    Started {format(dateRange.from, 'MMM d, yyyy')} – {format(dateRange.to, 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-8 text-right">
              <div>
                <p className="text-xs text-white/60">Projects</p>
                <p className="font-display text-3xl font-bold">{filteredProjects.length}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">Avg. complete</p>
                <p className="font-display text-3xl font-bold">{avgComplete.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-10 px-8 py-8 sm:px-10">
          {/* Executive summary */}
          <section>
            <SectionTitle eyebrow="Overview" title="Executive summary" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 print:grid-cols-3">
              {kpis.map((k) => (
                <div key={k.label} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 break-inside-avoid">
                  <span className={`absolute inset-x-0 top-0 h-1 ${k.accent}`} />
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>{k.label}</span>
                    <k.icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight">{k.value}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Billing progress + health */}
            <div className="mt-4 grid gap-3 lg:grid-cols-[2fr_1fr] print:grid-cols-[2fr_1fr]">
              <div className="rounded-xl border border-slate-200 p-5 break-inside-avoid">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">Where the contract value stands</p>
                  <p className="text-xs text-slate-500">{money(t.contract)} total</p>
                </div>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
                  {bar.map((b) => (
                    <div key={b.label} className={b.color} style={{ width: `${(b.value / barTotal) * 100}%` }} title={`${b.label}: ${money(b.value)}`} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                  {bar.map((b) => (
                    <span key={b.label} className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-sm ${b.color}`} />
                      <span className="text-slate-500">{b.label}</span>
                      <span className="font-semibold tabular-nums">{money(b.value)}</span>
                      <span className="text-slate-400">({pct(b.value, barTotal).toFixed(0)}%)</span>
                    </span>
                  ))}
                </div>
                {statusCounts.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {statusCounts.map(([s, n]) => (
                      <span key={s} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle(s).chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusStyle(s).dot}`} />
                        {n} {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                <HealthTile
                  label="Margin on billed work"
                  value={t.billed > 0 ? `${billedMargin.toFixed(1)}%` : '—'}
                  hint={t.billed > 0 ? 'Billed minus costs, as a share of billed' : 'Nothing billed yet'}
                  good={billedMargin >= 0}
                />
                <HealthTile
                  label="Cash position"
                  value={money(cashPosition)}
                  hint="Received minus costs to date"
                  good={cashPosition >= 0}
                />
              </div>
            </div>
          </section>

          {/* Project details */}
          <section>
            <SectionTitle eyebrow="Detail" title="Projects" note="Largest contracts first" />
            {filteredProjects.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">No projects match the filters.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 print:overflow-visible">
                <table className="w-full min-w-[920px] text-sm print:min-w-0 print:text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="w-[34%] px-4 py-3">Project</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Complete</th>
                      <th className="px-4 py-3 text-right">Contract</th>
                      <th className="px-4 py-3 text-right">Billed</th>
                      <th className="px-4 py-3 text-right">Received</th>
                      <th className="px-4 py-3 text-right">Costs</th>
                      <th className="px-4 py-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.map((p) => {
                      const billed = totalBilled[p.id] || 0;
                      const received = totalReceived[p.id] || 0;
                      const costs = totalExpenses[p.id] || 0;
                      const pending = pendingExpenses[p.id] || 0;
                      const margin = billed > 0 ? pct(billed - costs, billed) : null;
                      const done = p.completion_percentage || 0;
                      const costPct = pct(costs, p.contract_value || 0);
                      const st = statusStyle(p.status);
                      return (
                        <tr key={p.id} className="align-top break-inside-avoid">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500">
                              {p.client || 'No client'}
                              {p.project_code ? ` · #${p.project_code}` : ''}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                              {p.address && <span className="inline-flex items-center gap-1 whitespace-nowrap"><MapPin className="h-3 w-3 shrink-0" />{p.address}</span>}
                              <span className="inline-flex items-center gap-1 whitespace-nowrap"><HardHat className="h-3 w-3 shrink-0" />{p.field_leader || 'No field leader'}</span>
                              <span className="inline-flex items-center gap-1 whitespace-nowrap"><CalendarDays className="h-3 w-3 shrink-0" />{p.start_date && p.due_date ? `${safeDate(p.start_date)} – ${safeDate(p.due_date)}` : p.due_date ? `Due ${safeDate(p.due_date)}` : p.start_date ? `Started ${safeDate(p.start_date)}` : 'No dates set'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${st.chip}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                              {p.status}
                            </span>
                            {pending > 0 && <p className="mt-1.5 whitespace-nowrap text-xs text-rose-600">{money(pending)} awaiting approval</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-28">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold tabular-nums">{done}%</span>
                                {costPct > done + 10 && <span className="text-rose-600" title="Costs are running ahead of progress">cost {costPct.toFixed(0)}%</span>}
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, done)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(p.contract_value)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{money(billed)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {money(received)}
                            {billed - received > 0 && <p className="text-xs text-amber-600">{money(billed - received)} owed</p>}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{money(costs)}</td>
                          <td className="px-4 py-3 text-right">
                            {margin == null ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {margin >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                {margin.toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                      <td className="px-4 py-3" colSpan={3}>Total · {filteredProjects.length} projects</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(t.contract)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(t.billed)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(t.received)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(t.costs)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${billedMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.billed > 0 ? `${billedMargin.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* Financial summary */}
          <section className="break-inside-avoid">
            <SectionTitle eyebrow="Totals" title="Financial summary" />
            <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
              <SummaryPanel
                title="Revenue"
                icon={Building2}
                rows={[
                  ['Total contract value', money(t.contract)],
                  ['Billed to date', money(t.billed)],
                  ['Received', money(t.received)],
                  ['Owed to you', money(owed), owed > 0 ? 'text-amber-600' : undefined],
                  ['Left to bill', money(leftToBill)],
                ]}
              />
              <SummaryPanel
                title="Costs & performance"
                icon={Receipt}
                rows={[
                  ['Costs to date', money(t.costs)],
                  ['Awaiting approval', money(t.pending), t.pending > 0 ? 'text-rose-600' : undefined],
                  ['Margin on billed work', t.billed > 0 ? `${billedMargin.toFixed(1)}%` : '—', billedMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'],
                  ['Cash position', money(cashPosition), cashPosition >= 0 ? 'text-emerald-600' : 'text-rose-600'],
                ]}
              />
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 px-8 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>Confidential. Prepared for internal use by {companyName}.</span>
          <span>© {new Date().getFullYear()} {companyName}</span>
        </footer>
      </article>
    </div>
  );
};

function SectionTitle({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">{eyebrow}</p>
        <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">{title}</h2>
      </div>
      {note && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function HealthTile({ label, value, hint, good }: { label: string; value: string; hint: string; good: boolean }) {
  return (
    <div className={`rounded-xl border p-4 break-inside-avoid ${good ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${good ? 'text-emerald-700' : 'text-rose-700'}`}>{value}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function SummaryPanel({ title, icon: Icon, rows }: { title: string; icon: React.ElementType; rows: [string, string, string?][] }) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-slate-400" /> {title}
      </p>
      <dl className="divide-y divide-slate-100 text-sm">
        {rows.map(([k, v, tone]) => (
          <div key={k} className="flex justify-between py-2">
            <dt className="text-slate-600">{k}</dt>
            <dd className={`font-semibold tabular-nums ${tone || 'text-slate-900'}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
