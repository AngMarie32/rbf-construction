import { useState, useEffect, useMemo } from 'react';
import { normalizeProjectStatus } from '@/lib/projectStatus';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { FinancialDateFilter } from '@/components/dashboard/FinancialDateFilter';
import {
  Plus,
  Receipt,
  FolderKanban,
  DollarSign,
  CreditCard,
  Wallet,
  Clock,
  AlertTriangle,
  CalendarClock,
  ArrowRight,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { fetchReminders, type Reminder } from '@/lib/reminders';
import { monthBuckets } from '@/lib/analyticsData';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ShieldAlert, ClipboardCheck, FileCheck, TrendingUp } from 'lucide-react';

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  contract_value: number;
  completion_percentage: number;
  due_date: string | null;
  client: string | null;
  address: string | null;
  totalBilled: number;
  totalReceived: number;
  expensesPaid: number;
  pendingExpenses: number;
}

type FinancialFilter = {
  type: 'year' | 'month' | 'custom' | 'range';
  value?: string;
  startDate?: Date;
  endDate?: Date;
};

const PENDING = ['Pending Field Approval', 'Pending Office Approval'];
const PAID = ['Approved', 'Paid'];

const statusTone: Record<string, string> = {
  Active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Planning: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  'On Hold': 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

const money = (n: number) =>
  `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const compactMoney = (n: number) => {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `$${Math.round(n / 1000)}K`;
  return money(n);
};

/** Converts the period picker into an inclusive [start, end] ISO date pair, or null for "all time". */
function periodBounds(f: FinancialFilter): [string, string] | null {
  if (f.type === 'year' && f.value) return [`${f.value}-01-01`, `${f.value}-12-31`];
  if (f.type === 'month' && f.value) {
    const [y, m] = f.value.split('-');
    const last = new Date(parseInt(y), parseInt(m), 0).getDate();
    return [`${y}-${m}-01`, `${y}-${m}-${String(last).padStart(2, '0')}`];
  }
  if (f.type === 'range' && f.startDate && f.endDate) {
    return [f.startDate.toISOString().split('T')[0], f.endDate.toISOString().split('T')[0]];
  }
  return null;
}

function periodLabel(f: FinancialFilter) {
  if (f.type === 'year' && f.value) return f.value;
  if (f.type === 'month' && f.value) return format(new Date(`${f.value}-01T00:00:00`), 'MMMM yyyy');
  if (f.type === 'range' && f.startDate && f.endDate) return `${format(f.startDate, 'MMM d')} – ${format(f.endDate, 'MMM d, yyyy')}`;
  return 'All time';
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openProjects, setOpenProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<{ month: string; billed: number; received: number; costs: number }[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [financialFilter, setFinancialFilter] = useState<FinancialFilter>({
    type: 'year',
    value: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialFilter]);

  // Last 6 months of billing and costs for open jobs (real dates, independent of the period filter).
  useEffect(() => {
    if (openProjects.length === 0) {
      setTrend([]);
      return;
    }
    const ids = openProjects.map((p) => p.id);
    const months = monthBuckets(6);
    const start = `${months[0].key}-01`;
    Promise.all([
      supabase.from('project_billing').select('project_id, billed_amount, paid_amount, billing_period_end').in('project_id', ids).gte('billing_period_end', start),
      supabase.from('expenses').select('project_id, amount, date').in('project_id', ids).gte('date', start),
    ]).then(([b, e]) => {
      setTrend(
        months.map((m) => ({
          month: m.label,
          billed: (b.data || []).filter((r) => (r.billing_period_end || '').startsWith(m.key)).reduce((s, r) => s + (r.billed_amount || 0), 0),
          received: (b.data || []).filter((r) => (r.billing_period_end || '').startsWith(m.key)).reduce((s, r) => s + (r.paid_amount || 0), 0),
          costs: (e.data || []).filter((r) => (r.date || '').startsWith(m.key)).reduce((s, r) => s + (r.amount || 0), 0),
        }))
      );
    });
  }, [openProjects]);

  useEffect(() => {
    fetchReminders().then(setReminders).catch(() => setReminders([]));
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, status, contract_value, name, completion_percentage, due_date, client, address').is('archived_at', null);
      if (error) throw error;

      const open = (projects || []).map((p) => ({ ...p, status: normalizeProjectStatus(p.status) })).filter((p) => p.status !== 'Completed' && p.status !== 'Closed');
      const ids = open.map((p) => p.id);
      if (ids.length === 0) {
        setOpenProjects([]);
        return;
      }

      // Two batched queries for all open projects instead of two per project.
      let billingQuery = supabase
        .from('project_billing')
        .select('project_id, billed_amount, paid_amount')
        .in('project_id', ids);
      let expenseQuery = supabase
        .from('expenses')
        .select('project_id, amount, status')
        .in('project_id', ids);

      const bounds = periodBounds(financialFilter);
      if (bounds) {
        const [start, end] = bounds;
        billingQuery = billingQuery.gte('billing_period_start', start).lte('billing_period_end', end);
        expenseQuery = expenseQuery.gte('date', start).lte('date', end);
      }

      const [{ data: billing }, { data: expenses }] = await Promise.all([billingQuery, expenseQuery]);

      const totals: Record<string, { billed: number; received: number; paid: number; pending: number }> = {};
      ids.forEach((id) => (totals[id] = { billed: 0, received: 0, paid: 0, pending: 0 }));
      (billing || []).forEach((b) => {
        const t = totals[b.project_id];
        if (!t) return;
        t.billed += b.billed_amount || 0;
        t.received += b.paid_amount || 0;
      });
      (expenses || []).forEach((e) => {
        const t = totals[e.project_id];
        if (!t) return;
        if (PAID.includes(e.status)) t.paid += e.amount || 0;
        else if (PENDING.includes(e.status)) t.pending += e.amount || 0;
      });

      setOpenProjects(
        open.map((p) => ({
          ...p,
          contract_value: p.contract_value || 0,
          completion_percentage: p.completion_percentage || 0,
          totalBilled: totals[p.id].billed,
          totalReceived: totals[p.id].received,
          expensesPaid: totals[p.id].paid,
          pendingExpenses: totals[p.id].pending,
        }))
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const sum = (fn: (p: ProjectSummary) => number) => openProjects.reduce((s, p) => s + fn(p), 0);
    return {
      active: openProjects.filter((p) => p.status === 'Active').length,
      contract: sum((p) => p.contract_value),
      billed: sum((p) => p.totalBilled),
      received: sum((p) => p.totalReceived),
      paid: sum((p) => p.expensesPaid),
      pending: sum((p) => p.pendingExpenses),
    };
  }, [openProjects]);

  const outstanding = summary.billed - summary.received;

  const attention = useMemo(() => {
    const today = new Date();
    const items: { key: string; icon: typeof Clock; tone: string; title: string; detail: string; to: string }[] = [];
    openProjects.forEach((p) => {
      if (!p.due_date) return;
      const days = differenceInCalendarDays(new Date(p.due_date), today);
      if (days < 0 && p.completion_percentage < 100) {
        items.push({ key: `late-${p.id}`, icon: AlertTriangle, tone: 'text-red-600 dark:text-red-400 bg-red-500/10', title: `${p.name} is past due`, detail: `Due ${format(new Date(p.due_date), 'MMM d')} · ${p.completion_percentage}% complete`, to: `/projects/${p.id}` });
      } else if (days >= 0 && days <= 14 && p.completion_percentage < 90) {
        items.push({ key: `soon-${p.id}`, icon: CalendarClock, tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10', title: `${p.name} due in ${days} day${days === 1 ? '' : 's'}`, detail: `${p.completion_percentage}% complete`, to: `/projects/${p.id}?tab=schedule` });
      }
      const owed = p.totalBilled - p.totalReceived;
      if (owed > 0) {
        items.push({ key: `owed-${p.id}`, icon: CreditCard, tone: 'text-blue-600 dark:text-blue-400 bg-blue-500/10', title: `${money(owed)} unpaid on ${p.name}`, detail: 'Billed but not yet received', to: `/billing?project=${p.id}` });
      }
    });
    if (summary.pending > 0) {
      items.unshift({ key: 'pending', icon: Clock, tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10', title: `${money(summary.pending)} in expenses waiting for approval`, detail: 'Review and approve so job costs stay accurate', to: '/expenses' });
    }
    const ICON = { insurance_expired: ShieldAlert, insurance_expiring: ShieldAlert, inspection_soon: ClipboardCheck, permit_expiring: FileCheck, cost_spike: TrendingUp } as const;
    reminders
      .filter((r) => r.kind in ICON)
      .forEach((r) =>
        items.push({
          key: r.id,
          icon: ICON[r.kind as keyof typeof ICON],
          tone: r.severity === 'high' ? 'text-red-600 dark:text-red-400 bg-red-500/10' : 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
          title: r.title,
          detail: r.detail,
          to: r.to,
        })
      );
    return items.slice(0, 8);
  }, [openProjects, summary.pending, reminders]);

  const [nickname, setNickname] = useState('');
  const [profileName, setProfileName] = useState('');
  useEffect(() => {
    if (!user?.id) return;
    const load = () =>
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          setNickname(((data as any)?.nickname || '').trim());
          setProfileName((data as any)?.name || '');
        });
    load();
    window.addEventListener('rbf:profile-updated', load);
    return () => window.removeEventListener('rbf:profile-updated', load);
  }, [user?.id]);

  const kpis = [
    { label: 'Active jobs', value: String(summary.active), hint: `${openProjects.length} open in total`, icon: FolderKanban },
    { label: 'Open contract value', value: compactMoney(summary.contract), hint: `${compactMoney(Math.max(0, summary.contract - summary.billed))} left to bill`, icon: DollarSign },
    { label: 'Billed', value: compactMoney(summary.billed), hint: `${compactMoney(summary.received)} received`, icon: CreditCard },
    { label: 'Owed to you', value: compactMoney(outstanding), hint: 'Billed, not yet paid', icon: Wallet, tone: outstanding > 0 ? 'text-blue-600 dark:text-blue-400' : undefined },
    { label: 'Job costs paid', value: compactMoney(summary.paid), hint: summary.pending ? `${compactMoney(summary.pending)} pending approval` : 'Nothing pending', icon: Receipt },
  ];

  const firstName = nickname || (profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || '').split(' ')[0];

  return (
    <Layout title="Dashboard" hideTitle>
      <div className="space-y-6">
        <PageHero
          eyebrow={format(new Date(), 'EEEE, MMMM d')}
          title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
          subtitle={loading ? 'Loading your jobs…' : `${summary.active} active job${summary.active === 1 ? '' : 's'} · ${attention.length ? `${attention.length} thing${attention.length === 1 ? '' : 's'} need attention` : 'nothing needs attention'}`}
          actions={
            <>
              <button type="button" className={heroButtonPrimary} onClick={() => navigate('/projects')}>
                <Plus className="h-4 w-4" /> New project
              </button>
              <Link to="/expenses" className={heroButton}><Receipt className="h-4 w-4" /> Add expense</Link>
              <Link to="/billing" className={heroButton}><CreditCard className="h-4 w-4" /> New bill</Link>
            </>
          }
          stats={[
            { label: 'Owed to you', value: loading ? '…' : compactMoney(outstanding), tone: outstanding > 0 ? 'warn' : undefined },
            { label: 'Left to bill', value: loading ? '…' : compactMoney(Math.max(0, summary.contract - summary.billed)) },
            { label: 'Open contracts', value: loading ? '…' : compactMoney(summary.contract) },
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="w-max"><FinancialDateFilter currentFilter={financialFilter} onFilterChange={setFinancialFilter} /></div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {kpis.map((k, i) => (
            <AccentStat
              key={k.label}
              label={k.label}
              value={k.value}
              hint={k.hint}
              icon={k.icon}
              accent={(['blue', 'indigo', 'emerald', 'amber', 'orange'] as const)[i]}
              tone={k.tone ? 'warn' : undefined}
              loading={loading}
              className={i === kpis.length - 1 ? 'col-span-2 lg:col-span-1' : undefined}
            />
          ))}
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">Billing and cost figures for open jobs · {periodLabel(financialFilter)}</p>

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Billed vs costs, last 6 months</h2>
            <p className="text-xs text-muted-foreground">Open jobs · billing by period end, costs by expense date</p>
          </div>
          {trend.every((t) => !t.billed && !t.costs && !t.received) ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No billing or costs dated in the last 6 months.</p>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trend} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeOpacity={0.15} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={compactMoney} width={60} />
                    <Tooltip
                      formatter={(v: number, name: string) => [money(v), name]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      cursor={{ fillOpacity: 0.06 }}
                    />
                    <Bar dataKey="billed" name="Billed" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="costs" name="Costs" fill="#f97316" radius={[4, 4, 0, 0]} barSize={18} />
                    <Line dataKey="received" name="Received" type="linear" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />Billed</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />Costs</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Received</span>
              </div>
            </>
          )}
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          {/* Open projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Open jobs</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-primary">
                <Link to="/projects">All projects <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
                </div>
              ) : openProjects.length === 0 ? (
                <EmptyState
                  compact
                  icon={FolderKanban}
                  title="No open jobs"
                  description="Create a project for each job to track its schedule, costs, change orders and billing in one place."
                  action={{ label: 'Create your first project', to: '/projects' }}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {openProjects.map((p) => {
                    const costPct = p.contract_value > 0 ? (p.expensesPaid / p.contract_value) * 100 : 0;
                    const overBudget = costPct > p.completion_percentage + 10;
                    return (
                      <Link
                        key={p.id}
                        to={`/projects/${p.id}`}
                        className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate group-hover:text-primary">{p.name}</h3>
                            <p className="mt-0.5 text-xs text-muted-foreground truncate">
                              {p.client || 'No client'}
                              {p.due_date && ` · Due ${format(new Date(p.due_date), 'MMM d, yyyy')}`}
                            </p>
                          </div>
                          <Badge variant="secondary" className={statusTone[p.status] || ''}>{p.status}</Badge>
                        </div>
                        {p.address && (
                          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <MapPin className="h-3 w-3 shrink-0" />{p.address}
                          </p>
                        )}

                        <div className="mt-4 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Complete</span>
                            <span className="font-medium">{p.completion_percentage}%</span>
                          </div>
                          <Progress value={p.completion_percentage} className="h-1.5" />
                        </div>

                        <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                          <div>
                            <dt className="text-muted-foreground">Contract</dt>
                            <dd className="mt-0.5 font-semibold tabular-nums">{compactMoney(p.contract_value)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Billed</dt>
                            <dd className="mt-0.5 font-semibold tabular-nums">{compactMoney(p.totalBilled)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Costs</dt>
                            <dd className={cn('mt-0.5 font-semibold tabular-nums', overBudget && 'text-red-600 dark:text-red-400')}>
                              {compactMoney(p.expensesPaid)}
                            </dd>
                          </div>
                        </dl>
                        {overBudget && (
                          <p className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" /> Costs running ahead of progress
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Needs attention */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Needs attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {loading ? (
                [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)
              ) : attention.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <p className="mt-2 text-sm font-medium">You're all caught up</p>
                  <p className="text-xs text-muted-foreground">No overdue jobs, unpaid bills or pending approvals.</p>
                </div>
              ) : (
                attention.map((a) => (
                  <Link key={a.key} to={a.to} className="group -mx-2 flex items-start gap-3 rounded-lg p-2 hover:bg-muted/60">
                    <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', a.tone)}>
                      <a.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug">{a.title}</span>
                      <span className="block text-xs text-muted-foreground">{a.detail}</span>
                    </span>
                    <ArrowRight className="mt-2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
