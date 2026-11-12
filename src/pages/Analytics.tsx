import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { endOfDay, endOfYear, format, startOfDay, startOfMonth, startOfYear, subMonths, subYears } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { BarChart3, Building, Download, FileText, LayoutGrid, RotateCcw, Settings, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { PageHero } from '@/components/ui/page-hero';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectReports } from '@/components/reports/ProjectReports';
import { FinancialReports } from '@/components/reports/FinancialReports';
import { AnalyticsReportBuilder } from '@/components/reports/AnalyticsReportBuilder';
import { ProjectReport } from '@/components/reports/ProjectReport';
import { LaborReport } from '@/components/reports/LaborReport';
import { buildFinancialAnalytics, buildLaborAnalytics, buildProjectAnalytics, isOpenJob, type ATimeEntry } from '@/lib/analyticsData';
import { normalizeProjectStatus } from '@/lib/projectStatus';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { exportToCSV, exportToExcel, exportToPDF, type ExportData } from '@/utils/reportExports';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'snapshot' | 'project' | 'financial' | 'labor' | 'builder';
type Period = 'ytd' | 'this-month' | 'last-month' | '12m' | 'last-year' | 'all' | 'custom';
type Scope = 'open' | 'active-closed' | 'all';

const TABS: { id: Tab; label: string; icon: typeof FileText; blurb: string }[] = [
  { id: 'overview', label: 'All reports', icon: LayoutGrid, blurb: 'Pick a report' },
  { id: 'snapshot', label: 'Job snapshot', icon: FileText, blurb: 'Every job on one page: contract, billing, costs, pending expenses' },
  { id: 'project', label: 'Projects', icon: Building, blurb: 'Status, budget vs. actual, schedule and change orders' },
  { id: 'financial', label: 'Financial', icon: Wallet, blurb: 'Billed vs. costs by month, profit by job, cost categories' },
  { id: 'labor', label: 'Labor', icon: Users, blurb: 'Hours, overtime and labor cost by crew member and job' },
  { id: 'builder', label: 'Report builder', icon: Settings, blurb: 'Build your own report from any data' },
];
const PERIODS: Record<Period, string> = {
  ytd: 'Year to date',
  'this-month': 'This month',
  'last-month': 'Last month',
  '12m': 'Last 12 months',
  'last-year': 'Last year',
  all: 'All time',
  custom: 'Custom dates',
};
const SCOPES: Record<Scope, string> = {
  open: 'Open jobs (active & on hold)',
  'active-closed': 'Active & closed jobs',
  all: 'All jobs',
};

function periodRange(p: Period, custom?: DateRange): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (p) {
    case 'ytd': return { from: startOfYear(now), to: endOfDay(now) };
    case 'this-month': return { from: startOfMonth(now), to: endOfDay(now) };
    case 'last-month': { const m = subMonths(now, 1); return { from: startOfMonth(m), to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)) }; }
    case '12m': return { from: startOfDay(subMonths(now, 12)), to: endOfDay(now) };
    case 'last-year': { const y = subYears(now, 1); return { from: startOfYear(y), to: endOfYear(y) }; }
    case 'custom': return { from: custom?.from ? startOfDay(custom.from) : null, to: custom?.to ? endOfDay(custom.to) : custom?.from ? endOfDay(custom.from) : null };
    default: return { from: null, to: null };
  }
}
/** "2026-03-01" as local midnight (new Date('2026-03-01') is UTC, a day early in the US). */
const day = (v?: string | null) => (v ? new Date(v.length <= 10 ? `${v}T00:00:00` : v) : null);

function ExportMenu({ onExport, disabled }: { onExport: (format: 'excel' | 'pdf' | 'csv') => void; disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport('excel')}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('pdf')}>PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('csv')}>CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface Raw {
  projects: any[];
  expenses: any[];
  billing: any[];
  changeOrders: any[];
  timeEntries: ATimeEntry[];
}

export default function Analytics() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'overview') as Tab;
  const setTab = (t: Tab) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', t); return n; }, { replace: true });

  const [period, setPeriod] = useState<Period>('ytd');
  const [custom, setCustom] = useState<DateRange | undefined>();
  const [scope, setScope] = useState<Scope>('open');
  const [leader, setLeader] = useState('all');
  const [raw, setRaw] = useState<Raw | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, e, b, c, t] = await Promise.all([
          supabase.from('projects').select('*').is('archived_at', null),
          supabase.from('expenses').select('*'),
          supabase.from('project_billing').select('*'),
          supabase.from('change_orders').select('*'),
          supabase.from('time_entries').select('project_id, work_date, employee_name, trade, regular_hours, overtime_hours, hourly_rate, ot_multiplier, burden_percent, total_cost'),
        ]);
        if (p.error) throw p.error;
        setRaw({
          projects: (p.data || []).map((x: any) => ({ ...x, status: normalizeProjectStatus(x.status) })),
          expenses: e.data || [],
          billing: b.data || [],
          changeOrders: c.data || [],
          timeEntries: (t.data || []) as ATimeEntry[],
        });
      } catch (err) {
        console.error(err);
        toast.error('Failed to load report data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const range = useMemo(() => periodRange(period, custom), [period, custom]);
  const leaders = useMemo(() => [...new Set((raw?.projects || []).map((p) => p.field_leader).filter(Boolean))].sort() as string[], [raw]);

  // One set of filters drives every tab.
  const view = useMemo(() => {
    if (!raw) return null;
    const inRange = (v?: string | null) => {
      const d = day(v);
      if (!d) return !range.from && !range.to;
      return (!range.from || d >= range.from) && (!range.to || d <= range.to);
    };
    const scoped = raw.projects.filter((p) => {
      if (leader !== 'all' && p.field_leader !== leader) return false;
      if (scope === 'open') return isOpenJob(p.status);
      if (scope === 'active-closed') return p.status === 'Active' || p.status === 'Closed';
      return true;
    });
    const ids = new Set(scoped.map((p) => p.id));
    const expenses = raw.expenses.filter((x) => ids.has(x.project_id) && inRange(x.date));
    const billing = raw.billing.filter((x) => ids.has(x.project_id) && inRange(x.invoice_date || x.billing_period_end));
    const changeOrders = raw.changeOrders.filter((x) => ids.has(x.project_id) && inRange(x.date));
    const timeEntries = raw.timeEntries.filter((x) => ids.has(x.project_id) && inRange(x.work_date));
    // Closed jobs only count when they had activity in the period.
    const active = new Set([...expenses, ...billing, ...changeOrders, ...timeEntries].map((x: any) => x.project_id));
    const projects = sortProjectsOpenFirst(
      scoped.filter((p) => p.status !== 'Closed' || (!range.from && !range.to) || active.has(p.id) || inRange(p.due_date))
    );
    const end = range.to && range.to < new Date() ? range.to : new Date();

    const sumBy = (rows: any[], key: string) =>
      rows.reduce<Record<string, number>>((a, r) => ((a[r.project_id] = (a[r.project_id] || 0) + (Number(r[key]) || 0)), a), {});
    const totalExpenses = sumBy(expenses, 'amount');
    const totalBilled = sumBy(billing, 'billed_amount');
    const totalReceived = sumBy(billing, 'paid_amount');

    return {
      projects,
      totalExpenses,
      totalBilled,
      totalReceived,
      project: buildProjectAnalytics(projects, expenses, changeOrders, end),
      financial: buildFinancialAnalytics(projects, expenses, billing, end),
      labor: buildLaborAnalytics(timeEntries, projects, end),
      snapshotRows: projects.map((p) => ({
        Job: p.name,
        Client: p.client || '',
        Status: p.status,
        'Field leader': p.field_leader || '',
        Contract: Number(p.contract_value) || 0,
        Billed: totalBilled[p.id] || 0,
        Received: totalReceived[p.id] || 0,
        Costs: totalExpenses[p.id] || 0,
        '% complete': Number(p.completion_percentage) || 0,
      })),
      counts: { jobs: projects.length, expenses: expenses.length, billing: billing.length, hours: timeEntries.length },
    };
  }, [raw, range, scope, leader]);

  const periodLabel =
    period === 'custom'
      ? range.from
        ? `${format(range.from, 'MMM d, yyyy')} – ${format(range.to || range.from, 'MMM d, yyyy')}`
        : 'All time'
      : period === 'ytd'
        ? `Jan 1 – ${format(new Date(), 'MMM d, yyyy')}`
        : period === 'last-year'
          ? String(new Date().getFullYear() - 1)
          : PERIODS[period];
  const filtersChanged = period !== 'ytd' || scope !== 'open' || leader !== 'all';
  const resetFilters = () => {
    setPeriod('ytd');
    setCustom(undefined);
    setScope('open');
    setLeader('all');
  };

  const handleExport = async (kind: Tab, fmt: 'excel' | 'pdf' | 'csv') => {
    if (!view) return;
    const rows =
      kind === 'snapshot' ? view.snapshotRows : kind === 'project' ? view.project.exportRows : kind === 'financial' ? view.financial.exportRows : kind === 'labor' ? (view.labor as any).exportRows : [];
    if (!rows?.length) {
      toast.error('Nothing to export for these filters');
      return;
    }
    const data: ExportData = {
      title: `${TABS.find((t) => t.id === kind)?.label} Report`,
      data: rows,
      metadata: {
        dateRange: `${PERIODS[period]} (${periodLabel})`,
        generatedBy: 'RBF Construction',
        generatedAt: new Date().toLocaleString(),
        filters: { jobs: SCOPES[scope], fieldLeader: leader === 'all' ? 'All' : leader },
      },
    };
    try {
      if (fmt === 'excel') exportToExcel(data);
      else if (fmt === 'pdf') await exportToPDF(data);
      else exportToCSV(data);
      toast.success(`Exported as ${fmt.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to export report');
    }
  };

  const fin = view?.financial.totals as any;
  const chips = [SCOPES[scope], `${PERIODS[period]}: ${periodLabel}`, ...(leader === 'all' ? [] : [`Field leader: ${leader}`])];

  return (
    <Layout hideTitle title="Analytics & Reports">
      <div className="space-y-4">
        <PageHero
          eyebrow="Overview"
          title="Analytics & Reports"
          subtitle="Company-wide reports on jobs, money and labor. The filters below apply to every report."
          stats={[
            { label: 'Jobs in view', value: loading || !view ? '…' : String(view.counts.jobs) },
            { label: PERIODS[period], value: periodLabel.length > 18 ? '' : periodLabel },
          ].filter((s) => s.value !== '')}
        />

        {/* Tabs and filters live in one bar so it's clear the filters drive the report below. */}
        <div className="sticky top-0 z-20 -mx-1 rounded-xl border bg-card/95 px-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <nav className="flex gap-1 overflow-x-auto border-b px-2 pt-2" aria-label="Reports">
            {TABS.map((t) => {
              const Icon = t.icon;
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                    on ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
          {tab !== 'builder' && (
            <div className="flex flex-wrap items-center gap-2 p-3">
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger className="h-9 w-40" aria-label="Period"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIODS) as Period[]).map((k) => <SelectItem key={k} value={k}>{PERIODS[k]}</SelectItem>)}
                </SelectContent>
              </Select>
              {period === 'custom' && <DatePickerWithRange date={custom} onDateChange={setCustom} />}
              <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                <SelectTrigger className="h-9 w-64" aria-label="Which jobs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SCOPES) as Scope[]).map((k) => <SelectItem key={k} value={k}>{SCOPES[k]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={leader} onValueChange={setLeader}>
                <SelectTrigger className="h-9 w-48" aria-label="Field leader"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All field leaders</SelectItem>
                  {leaders.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              {filtersChanged && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              )}
              <span className="ml-auto hidden text-xs text-muted-foreground md:inline">
                {view ? `${view.counts.jobs} job${view.counts.jobs === 1 ? '' : 's'} · ${periodLabel}` : ''}
              </span>
              {tab !== 'overview' && <ExportMenu onExport={(f) => handleExport(tab, f)} disabled={!view} />}
            </div>
          )}
        </div>

        {loading || !view ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        ) : tab === 'overview' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              { id: 'snapshot' as Tab, stat: `${view.counts.jobs} jobs`, sub: `${Object.values(view.totalBilled).reduce((a, b) => a + b, 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} billed` },
              { id: 'project' as Tab, stat: `${view.project.totals.open} open`, sub: `${view.project.totals.late} past due · ${view.project.totals.avgComplete.toFixed(0)}% avg. complete` },
              { id: 'financial' as Tab, stat: fin?.billed != null ? Number(fin.billed).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : `${view.counts.billing} bills`, sub: fin?.billed != null ? 'Billed in period' : 'In period' },
              { id: 'labor' as Tab, stat: `${view.counts.hours} entries`, sub: 'Time entries in period' },
              { id: 'builder' as Tab, stat: 'Custom', sub: 'Choose fields, filters and charts' },
            ].map((c) => {
              const t = TABS.find((x) => x.id === c.id)!;
              const Icon = t.icon;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setTab(c.id)}
                  className="group rounded-xl border bg-card p-5 text-left transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                    <span className="font-semibold">{t.label}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{t.blurb}</p>
                  <div className="mt-4 flex items-baseline justify-between border-t pt-3">
                    <span className="text-lg font-semibold tabular-nums">{c.stat}</span>
                    <span className="text-xs text-muted-foreground">{c.sub}</span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
                    <BarChart3 className="h-4 w-4" /> Open report
                  </span>
                </button>
              );
            })}
          </div>
        ) : tab === 'snapshot' ? (
          <ProjectReport projects={view.projects} totalExpenses={view.totalExpenses} totalBilled={view.totalBilled} totalReceived={view.totalReceived} chips={chips} />
        ) : tab === 'project' ? (
          <ProjectReports data={view.project} chips={chips} />
        ) : tab === 'financial' ? (
          <FinancialReports data={view.financial} chips={chips} />
        ) : tab === 'labor' ? (
          <LaborReport data={view.labor} chips={chips} />
        ) : (
          <AnalyticsReportBuilder />
        )}
      </div>
    </Layout>
  );
}
