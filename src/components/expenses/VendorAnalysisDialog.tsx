import { useEffect, useMemo, useState } from 'react';
import { endOfDay, endOfYear, format, startOfDay, startOfYear, subMonths, subYears } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Building2, Clock, PieChart as PieIcon, Search, Store, TrendingUp, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { AccentStat } from '@/components/ui/accent-stat';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { ExportMenu, downloadCsv } from '@/components/ui/export-menu';
import { ProjectCombobox } from '@/components/ui/project-combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART, ChartTooltip, axisProps, compact } from '@/components/reports/ReportKit';
import { fetchAll } from '@/lib/fetchAll';
import { cn } from '@/lib/utils';

interface VendorAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Array<{ id: string; name: string; client?: string | null }>;
}

interface Expense {
  id: string;
  project_id: string | null;
  vendor: string | null;
  amount: number;
  date: string;
  status: string | null;
  category: string | null;
  description: string | null;
}

type Period = 'ytd' | '12m' | 'last-year' | 'all' | 'custom';
const PERIODS: Record<Period, string> = { ytd: 'Year to date', '12m': 'Last 12 months', 'last-year': 'Last year', all: 'All time', custom: 'Custom dates' };

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const day = (v?: string | null) => (v ? new Date(`${v.slice(0, 10)}T00:00:00`) : null);
const PENDING = ['Pending Field Approval', 'Pending Office Approval'];

/** "HOME DEPOT #4521", "Home Depot " and "home depot" are one vendor. */
const vendorKey = (v?: string | null) =>
  (v || '')
    .toLowerCase()
    .replace(/#\s*\d+/g, '')
    .replace(/\b(inc|llc|co|corp|corporation|company|ltd)\b\.?/g, '')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'no vendor';

function periodRange(p: Period, custom?: DateRange) {
  const now = new Date();
  if (p === 'ytd') return { from: startOfYear(now), to: endOfDay(now) };
  if (p === '12m') return { from: startOfDay(subMonths(now, 12)), to: endOfDay(now) };
  if (p === 'last-year') {
    const y = subYears(now, 1);
    return { from: startOfYear(y), to: endOfYear(y) };
  }
  if (p === 'custom') return { from: custom?.from ? startOfDay(custom.from) : null, to: custom?.to ? endOfDay(custom.to) : custom?.from ? endOfDay(custom.from) : null };
  return { from: null as Date | null, to: null as Date | null };
}

interface VendorRow {
  key: string;
  name: string;
  total: number;
  paid: number;
  approved: number;
  pending: number;
  count: number;
  jobs: string[];
  categories: string[];
  first: string;
  last: string;
  prior: number;
  share: number;
  avg: number;
  expenses: Expense[];
}

export function VendorAnalysisDialog({ open, onOpenChange, projects }: VendorAnalysisDialogProps) {
  const [all, setAll] = useState<Expense[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('ytd');
  const [custom, setCustom] = useState<DateRange | undefined>();
  const [project, setProject] = useState('');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open || all) return;
    setLoading(true);
    fetchAll<Expense>('expenses', 'id, project_id, vendor, amount, date, status, category, description')
      .then((rows) => setAll(rows.filter((e) => e.status !== 'Rejected')))
      .catch((e) => toast.error(`Couldn't load expenses: ${e.message}`))
      .finally(() => setLoading(false));
  }, [open, all]);

  const projectName = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p.name])), [projects]);
  const range = useMemo(() => periodRange(period, custom), [period, custom]);
  const categories = useMemo(() => [...new Set((all || []).map((e) => e.category).filter(Boolean))].sort() as string[], [all]);

  const { rows, totals } = useMemo(() => {
    const base = (all || []).filter((e) => (!project || e.project_id === project) && (category === 'all' || e.category === category));
    const inRange = (e: Expense, from: Date | null, to: Date | null) => {
      const d = day(e.date);
      return !!d && (!from || d >= from) && (!to || d <= to);
    };
    const cur = base.filter((e) => inRange(e, range.from, range.to));
    // Same-length window just before the selected one, for the trend column.
    let prior: Expense[] = [];
    if (range.from && range.to) {
      const len = range.to.getTime() - range.from.getTime();
      const pTo = new Date(range.from.getTime() - 1);
      const pFrom = new Date(pTo.getTime() - len);
      prior = base.filter((e) => inRange(e, pFrom, pTo));
    }

    const map = new Map<string, VendorRow>();
    const names = new Map<string, Map<string, number>>();
    for (const e of cur) {
      const key = vendorKey(e.vendor);
      const amt = Number(e.amount) || 0;
      let r = map.get(key);
      if (!r) {
        r = { key, name: '', total: 0, paid: 0, approved: 0, pending: 0, count: 0, jobs: [], categories: [], first: e.date, last: e.date, prior: 0, share: 0, avg: 0, expenses: [] };
        map.set(key, r);
        names.set(key, new Map());
      }
      // Display the spelling used most often.
      const raw = (e.vendor || '').trim() || 'No vendor recorded';
      names.get(key)!.set(raw, (names.get(key)!.get(raw) || 0) + 1);
      r.total += amt;
      r.count++;
      if (e.status === 'Paid') r.paid += amt;
      else if (e.status === 'Approved') r.approved += amt;
      else if (PENDING.includes(e.status || '')) r.pending += amt;
      else r.pending += amt;
      const job = e.project_id ? projectName[e.project_id] || 'Unknown job' : 'Overhead / no job';
      if (!r.jobs.includes(job)) r.jobs.push(job);
      if (e.category && !r.categories.includes(e.category)) r.categories.push(e.category);
      if (e.date < r.first) r.first = e.date;
      if (e.date > r.last) r.last = e.date;
      r.expenses.push(e);
    }
    for (const e of prior) {
      const r = map.get(vendorKey(e.vendor));
      if (r) r.prior += Number(e.amount) || 0;
    }
    const total = [...map.values()].reduce((a, r) => a + r.total, 0);
    const list = [...map.values()]
      .map((r) => ({
        ...r,
        // Most-used spelling; ties go to the cleanest one (no store number, not ALL CAPS).
        name: [...names.get(r.key)!.entries()].sort(
          (a, b) => b[1] - a[1] || Number(/#|\d{3,}/.test(a[0])) - Number(/#|\d{3,}/.test(b[0])) || Number(a[0] === a[0].toUpperCase()) - Number(b[0] === b[0].toUpperCase())
        )[0][0],
        share: total ? (r.total / total) * 100 : 0,
        avg: r.count ? r.total / r.count : 0,
        expenses: r.expenses.sort((a, b) => b.date.localeCompare(a.date)),
      }))
      .sort((a, b) => b.total - a.total);
    const top5 = list.slice(0, 5).reduce((a, r) => a + r.total, 0);
    return {
      rows: list,
      totals: {
        total,
        vendors: list.length,
        unpaid: list.reduce((a, r) => a + r.approved + r.pending, 0),
        approved: list.reduce((a, r) => a + r.approved, 0),
        pending: list.reduce((a, r) => a + r.pending, 0),
        top5Share: total ? (top5 / total) * 100 : 0,
        priorTotal: prior.reduce((a, e) => a + (Number(e.amount) || 0), 0),
        hasPrior: !!(range.from && range.to),
        noVendor: list.find((r) => r.key === 'no vendor')?.total || 0,
      },
    };
  }, [all, range, project, category, projectName]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.key.includes(q)) : rows;
  }, [rows, search]);

  const detail = selected ? rows.find((r) => r.key === selected) : null;
  const periodLabel =
    period === 'custom' && range.from
      ? `${format(range.from, 'MMM d, yyyy')} – ${format(range.to || range.from, 'MMM d, yyyy')}`
      : period === 'ytd'
        ? `Jan 1 – ${format(new Date(), 'MMM d, yyyy')}`
        : PERIODS[period];
  const scopeLabel = [periodLabel, project ? projectName[project] : 'All jobs', category === 'all' ? null : category].filter(Boolean).join(' · ');

  const change = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
  /** Plain-language change; huge jumps off a tiny base read as "much higher" instead of 135626%. */
  const changeText = (c: number | null) => (c == null ? 'New this period' : c > 500 ? 'Much higher than the prior period' : `${c >= 0 ? '+' : ''}${c.toFixed(0)}% vs. prior period`);

  const exportCsv = () =>
    downloadCsv(
      `vendor-analysis-${format(new Date(), 'yyyy-MM-dd')}`,
      ['Vendor', 'Total', 'Share %', 'Paid', 'Approved (unpaid)', 'Pending approval', 'Expenses', 'Avg per expense', 'Prior period', 'Jobs', 'Categories', 'First purchase', 'Last purchase'],
      shown.map((r) => [
        r.name,
        r.total.toFixed(2),
        r.share.toFixed(1),
        r.paid.toFixed(2),
        r.approved.toFixed(2),
        r.pending.toFixed(2),
        r.count,
        r.avg.toFixed(2),
        totals.hasPrior ? r.prior.toFixed(2) : '',
        r.jobs.join('; '),
        r.categories.join('; '),
        r.first,
        r.last,
      ])
    );

  const exportPdf = async () => {
    const { DocKit, loadCompany, fmtDate, usd } = await import('@/utils/pdfDocKit');
    const company = await loadCompany();
    const doc = new DocKit(company, 'Vendor Spend Analysis', scopeLabel, 'landscape');
    doc.letterhead([
      { label: 'Printed', value: fmtDate(new Date()) },
      { label: 'Total spend', value: usd(totals.total, false) },
      { label: 'Vendors', value: String(totals.vendors) },
      { label: 'Unpaid', value: usd(totals.unpaid, false) },
    ]);
    doc.table(
      [
        { header: 'Vendor', width: 22 },
        { header: 'Total', width: 10, align: 'right' },
        { header: 'Share', width: 6, align: 'right' },
        { header: 'Paid', width: 10, align: 'right' },
        { header: 'Unpaid', width: 10, align: 'right' },
        { header: '#', width: 5, align: 'center' },
        { header: 'Jobs', width: 23 },
        { header: 'Last', width: 9 },
      ],
      shown.map((r) => [
        { text: r.name, bold: true },
        usd(r.total, false),
        `${r.share.toFixed(1)}%`,
        usd(r.paid, false),
        usd(r.approved + r.pending, false),
        String(r.count),
        r.jobs.slice(0, 4).join(', ') + (r.jobs.length > 4 ? ` +${r.jobs.length - 4}` : ''),
        format(day(r.last)!, 'MM/dd/yy'),
      ]),
      { fontSize: 8 }
    );
    doc.save(`vendor-analysis-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const columns: DataTableColumn<VendorRow>[] = [
    {
      id: 'vendor',
      header: 'Vendor',
      value: (r) => r.name,
      cell: (r) => (
        <div className="min-w-[180px]">
          <p className={cn('font-medium', r.key === 'no vendor' && 'italic text-muted-foreground')}>{r.name}</p>
          <p className="truncate text-xs text-muted-foreground">{r.categories.slice(0, 3).join(', ') || '—'}</p>
        </div>
      ),
    },
    {
      id: 'total',
      header: 'Total spend',
      align: 'right',
      value: (r) => r.total,
      cell: (r) => (
        <div>
          <p className="font-semibold tabular-nums">{money(r.total)}</p>
          <div className="ml-auto mt-1 h-1 w-20 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, r.share)}%` }} />
          </div>
        </div>
      ),
    },
    { id: 'share', header: 'Share', align: 'right', value: (r) => r.share, cell: (r) => <span className="tabular-nums text-muted-foreground">{r.share.toFixed(1)}%</span> },
    ...(totals.hasPrior
      ? [
          {
            id: 'trend',
            header: 'vs. prior',
            align: 'right' as const,
            value: (r: VendorRow) => change(r.total, r.prior) ?? -1e9,
            cell: (r: VendorRow) => {
              const c = change(r.total, r.prior);
              if (c == null) return <span className="text-xs text-muted-foreground">New</span>;
              if (c > 500) return <span className="text-xs font-medium text-rose-600">Much higher</span>;
              const up = c >= 0;
              return (
                <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium tabular-nums', up ? 'text-rose-600' : 'text-emerald-600')}>
                  {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(c).toFixed(0)}%
                </span>
              );
            },
          },
        ]
      : []),
    { id: 'paid', header: 'Paid', align: 'right', value: (r) => r.paid, cell: (r) => <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{money(r.paid)}</span> },
    {
      id: 'unpaid',
      header: 'Unpaid',
      align: 'right',
      value: (r) => r.approved + r.pending,
      cell: (r) =>
        r.approved + r.pending ? (
          <div className="tabular-nums">
            <p className="text-amber-600 dark:text-amber-400">{money(r.approved + r.pending)}</p>
            {r.pending > 0 && <p className="text-[11px] text-muted-foreground">{money(r.pending)} awaiting approval</p>}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { id: 'count', header: 'Expenses', align: 'right', value: (r) => r.count, cell: (r) => <span className="tabular-nums">{r.count}</span> },
    { id: 'jobs', header: 'Jobs', align: 'right', value: (r) => r.jobs.length, cell: (r) => <span title={r.jobs.join(', ')} className="tabular-nums">{r.jobs.length}</span> },
    { id: 'last', header: 'Last purchase', value: (r) => r.last, cell: (r) => <span className="whitespace-nowrap text-sm">{format(day(r.last)!, 'MMM d, yyyy')}</span> },
  ];

  const chartData = shown.slice(0, 10).map((r) => ({ name: r.name.length > 24 ? `${r.name.slice(0, 23)}…` : r.name, Paid: r.paid, Unpaid: r.approved + r.pending }));
  const totalChange = totals.hasPrior ? change(totals.total, totals.priorTotal) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setSelected(null);
          setAll(null);
        }
      }}
    >
      <DialogContent className="max-h-[94vh] max-w-7xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> Vendor analysis
          </DialogTitle>
          <DialogDescription>Who you spend with, how much is still unpaid, and which jobs it went to. Rejected expenses are left out.</DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-9 w-40" aria-label="Period"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIODS) as Period[]).map((k) => <SelectItem key={k} value={k}>{PERIODS[k]}</SelectItem>)}
            </SelectContent>
          </Select>
          {period === 'custom' && <DatePickerWithRange date={custom} onDateChange={setCustom} />}
          <ProjectCombobox className="w-full sm:w-60" projects={projects} value={project} onChange={setProject} placeholder="All jobs (type to search)" clearable />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-44" aria-label="Category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-muted-foreground">{scopeLabel}</span>
          <ExportMenu
            options={[
              { label: 'Vendor report (PDF)', hint: 'One page per ~25 vendors, landscape', format: 'pdf', onSelect: exportPdf, disabled: !shown.length },
              { label: 'Spreadsheet (CSV)', hint: 'Every column, including jobs and categories', format: 'csv', onSelect: exportCsv, disabled: !shown.length },
            ]}
          />
        </div>

        {loading || !all ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        ) : detail ? (
          /* ---------- Drill-down for one vendor ---------- */
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-4 w-4" /> All vendors
            </Button>
            <div>
              <h3 className="text-xl font-semibold">{detail.name}</h3>
              <p className="text-sm text-muted-foreground">
                {detail.count} expense{detail.count === 1 ? '' : 's'} · first {format(day(detail.first)!, 'MMM d, yyyy')} · last {format(day(detail.last)!, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <AccentStat label="Total spend" value={money(detail.total)} icon={Wallet} accent="blue" hint={`${detail.share.toFixed(1)}% of all vendor spend`} />
              <AccentStat label="Paid" value={money(detail.paid)} icon={TrendingUp} accent="emerald" hint={`Avg ${money(detail.avg)} per expense`} />
              <AccentStat label="Unpaid" value={money(detail.approved + detail.pending)} icon={Clock} accent="amber" hint={`${money(detail.pending)} awaiting approval`} tone={detail.approved + detail.pending ? 'warn' : undefined} />
              <AccentStat
                label="vs. prior period"
                value={!totals.hasPrior ? '—' : change(detail.total, detail.prior) == null ? 'New' : change(detail.total, detail.prior)! > 500 ? 'Much higher' : `${change(detail.total, detail.prior)!.toFixed(0)}%`}
                icon={PieIcon}
                accent="indigo"
                hint={totals.hasPrior ? `${money(detail.prior)} the period before` : 'Pick a period to compare'}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
              <div className="rounded-xl border">
                <p className="border-b px-4 py-3 text-sm font-semibold">By job</p>
                <ul className="divide-y text-sm">
                  {Object.entries(
                    detail.expenses.reduce<Record<string, number>>((a, e) => {
                      const j = e.project_id ? projectName[e.project_id] || 'Unknown job' : 'Overhead / no job';
                      a[j] = (a[j] || 0) + (Number(e.amount) || 0);
                      return a;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([j, v]) => (
                      <li key={j} className="flex items-center justify-between gap-3 px-4 py-2">
                        <span className="flex min-w-0 items-center gap-2 truncate">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {j}
                        </span>
                        <span className="tabular-nums">{money(v)}</span>
                      </li>
                    ))}
                </ul>
              </div>
              <div className="rounded-xl border">
                <p className="border-b px-4 py-3 text-sm font-semibold">Expenses</p>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      {detail.expenses.map((e) => (
                        <tr key={e.id}>
                          <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{format(day(e.date)!, 'MMM d, yyyy')}</td>
                          <td className="px-2 py-2">
                            <p className="line-clamp-1">{e.description || e.category}</p>
                            <p className="text-xs text-muted-foreground">{e.project_id ? projectName[e.project_id] : 'Overhead'}</p>
                          </td>
                          <td className="px-2 py-2">
                            <Badge variant="outline" className="whitespace-nowrap text-[10px]">{e.status}</Badge>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{money(Number(e.amount) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ---------- All vendors ---------- */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <AccentStat
                label="Vendor spend"
                value={money(totals.total)}
                icon={Wallet}
                accent="blue"
                hint={!totals.hasPrior ? 'All dates' : totalChange == null ? 'Nothing the period before' : changeText(totalChange)}
              />
              <AccentStat label="Vendors" value={totals.vendors} icon={Store} accent="indigo" hint={totals.vendors ? `Avg ${money(totals.total / totals.vendors)} each` : '—'} />
              <AccentStat
                label="Unpaid"
                value={money(totals.unpaid)}
                icon={Clock}
                accent="amber"
                tone={totals.unpaid ? 'warn' : 'good'}
                hint={`${money(totals.approved)} approved · ${money(totals.pending)} awaiting approval`}
              />
              <AccentStat
                label="Top 5 vendors"
                value={`${totals.top5Share.toFixed(0)}%`}
                icon={PieIcon}
                accent="emerald"
                hint={totals.vendors <= 5 ? `Only ${totals.vendors} vendor${totals.vendors === 1 ? '' : 's'} in this view` : totals.noVendor ? `${money(totals.noVendor)} has no vendor recorded` : 'Share of all vendor spend (concentration)'}
              />
            </div>

            {chartData.length > 0 && (
              <div className="rounded-xl border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Top {chartData.length} vendors</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: CHART.emerald }} /> Paid</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: CHART.amber }} /> Unpaid</span>
                  </div>
                </div>
                <div style={{ height: Math.max(160, chartData.length * 30) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 12 }}>
                      <CartesianGrid horizontal={false} stroke={CHART.grid} />
                      <XAxis type="number" {...axisProps} tickFormatter={compact} />
                      <YAxis type="category" dataKey="name" {...axisProps} width={170} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                      <Bar dataKey="Paid" stackId="a" fill={CHART.emerald} barSize={16} />
                      <Bar dataKey="Unpaid" stackId="a" fill={CHART.amber} radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <DataTable
              columns={columns}
              rows={shown}
              totalCount={rows.length}
              getRowId={(r) => r.key}
              searchable={false}
              initialSort={{ id: 'total', desc: true }}
              onRowClick={(r) => setSelected(r.key)}
              filters={
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Find a vendor…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
              }
              empty={<p className="py-10 text-center text-sm text-muted-foreground">No expenses for these filters.</p>}
            />
            <p className="text-xs text-muted-foreground">
              Click a vendor to see its jobs and every expense. Names are grouped ignoring capitals, store numbers and Inc/LLC, so "HOME DEPOT #4521" and "Home Depot" count as one vendor.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
