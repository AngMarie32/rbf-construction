import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Printer, Download, Mail, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  buildAnalytics, DEFAULT_ANALYTICS_OPTIONS, type AnalyticsOptions, type ProjectRow,
} from '@/utils/analyticsReportEngine';
import { AnalyticsReportScheduleDialog } from './AnalyticsReportScheduleDialog';

const money = (n: number) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${Number(n || 0).toFixed(2)}%`;

const KPI_DEFS = [
  { key: 'contractValue', label: 'Original contract', fmt: (t: any) => money(t.contractValue) },
  { key: 'changeOrders', label: 'Change orders', fmt: (t: any) => money(t.changeOrders) },
  { key: 'revisedContract', label: 'Revised contract', fmt: (t: any) => money(t.revisedContract) },
  { key: 'billed', label: 'Billed to date', fmt: (t: any) => money(t.billed) },
  { key: 'received', label: 'Cash received', fmt: (t: any) => money(t.received) },
  { key: 'outstanding', label: 'Outstanding A/R', fmt: (t: any) => money(t.outstanding) },
  { key: 'expenses', label: 'Costs to date', fmt: (t: any) => money(t.expenses) },
  { key: 'profit', label: 'Gross profit', fmt: (t: any) => money(t.profit) },
  { key: 'margin', label: 'Profit margin', fmt: (t: any) => pct(t.margin) },
  { key: 'backlog', label: 'Backlog (unbilled)', fmt: (t: any) => money(t.backlog) },
  { key: 'collectionRate', label: 'Collection rate', fmt: (t: any) => pct(t.collectionRate) },
  { key: 'burnPct', label: 'Contract burned', fmt: (t: any) => pct(t.burnPct) },
  { key: 'projectCount', label: 'Projects in scope', fmt: (t: any) => String(t.projectCount) },
  { key: 'activeProjects', label: 'Active projects', fmt: (t: any) => String(t.activeProjects) },
  { key: 'avgCompletion', label: 'Avg completion', fmt: (t: any) => pct(t.avgCompletion) },
  { key: 'changeOrderCount', label: 'Change order count', fmt: (t: any) => String(t.changeOrderCount) },
];

const COL_DEFS: { key: keyof ProjectRow | string; label: string; num?: boolean; get: (r: ProjectRow) => string }[] = [
  { key: 'client', label: 'Client', get: (r) => r.client },
  { key: 'status', label: 'Status', get: (r) => r.status },
  { key: 'fieldLeader', label: 'Field leader', get: (r) => r.fieldLeader },
  { key: 'completion', label: '% complete', num: true, get: (r) => pct(r.completion) },
  { key: 'contractValue', label: 'Contract', num: true, get: (r) => money(r.contractValue) },
  { key: 'changeOrders', label: 'Change orders', num: true, get: (r) => money(r.changeOrders) },
  { key: 'revisedContract', label: 'Revised contract', num: true, get: (r) => money(r.revisedContract) },
  { key: 'billed', label: 'Billed', num: true, get: (r) => money(r.billed) },
  { key: 'received', label: 'Received', num: true, get: (r) => money(r.received) },
  { key: 'outstanding', label: 'Outstanding', num: true, get: (r) => money(r.outstanding) },
  { key: 'expenses', label: 'Costs', num: true, get: (r) => money(r.expenses) },
  { key: 'profit', label: 'Profit', num: true, get: (r) => money(r.profit) },
  { key: 'margin', label: 'Margin', num: true, get: (r) => pct(r.margin) },
  { key: 'backlog', label: 'Backlog', num: true, get: (r) => money(r.backlog) },
  { key: 'burnPct', label: 'Burn %', num: true, get: (r) => pct(r.burnPct) },
];

const SECTION_DEFS = [
  { key: 'kpis', label: 'Executive KPIs' },
  { key: 'charts', label: 'Charts' },
  { key: 'projects', label: 'Project scorecard' },
  { key: 'categories', label: 'Cost by category' },
  { key: 'aging', label: 'Receivables aging' },
  { key: 'leaders', label: 'Field leader summary' },
  { key: 'vendors', label: 'Top vendors' },
  { key: 'changeOrders', label: 'Change order log' },
];

const CHART_DEFS = [
  { key: 'monthly', label: 'Billed vs costs by month', types: ['bar', 'line', 'area'] },
  { key: 'profitByProject', label: 'Profit by project', types: ['bar', 'hbar'] },
  { key: 'categoryMix', label: 'Cost category mix', types: ['pie', 'bar', 'hbar'] },
  { key: 'statusMix', label: 'Projects by status', types: ['pie', 'bar'] },
  { key: 'agingChart', label: 'Receivables aging', types: ['bar', 'hbar'] },
];

const PALETTE = ['hsl(var(--primary))', '#16a34a', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#0ea5e9', '#64748b'];

export interface AnalyticsReportConfig {
  title: string;
  options: AnalyticsOptions;
  sections: string[];
  kpis: string[];
  columns: string[];
  charts: string[];
  chartTypes: Record<string, string>;
  chartLimit: number;
  showGrandTotals: boolean;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export const DEFAULT_ANALYTICS_CONFIG: AnalyticsReportConfig = {
  title: 'Business Analytics Report',
  options: { ...DEFAULT_ANALYTICS_OPTIONS },
  sections: ['kpis', 'charts', 'projects', 'categories', 'aging'],
  kpis: ['revisedContract', 'billed', 'received', 'outstanding', 'expenses', 'profit', 'margin', 'backlog'],
  columns: ['status', 'completion', 'revisedContract', 'billed', 'received', 'outstanding', 'expenses', 'profit', 'margin'],
  charts: ['monthly', 'profitByProject', 'categoryMix'],
  chartTypes: { monthly: 'bar', profitByProject: 'bar', categoryMix: 'pie', statusMix: 'pie', agingChart: 'bar' },
  chartLimit: 10,
  showGrandTotals: true,
  sortBy: 'revisedContract',
  sortDir: 'desc',
};

export function AnalyticsReportBuilder() {
  const [raw, setRaw] = useState<{ projects: any[]; expenses: any[]; billing: any[]; changeOrders: any[] }>({
    projects: [], expenses: [], billing: [], changeOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<AnalyticsReportConfig>(() => {
    try {
      const saved = localStorage.getItem('analytics-report-config');
      if (saved) return { ...DEFAULT_ANALYTICS_CONFIG, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return DEFAULT_ANALYTICS_CONFIG;
  });
  const [scheduleOpen, setScheduleOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('analytics-report-config', JSON.stringify(cfg));
  }, [cfg]);

  const load = async () => {
    setLoading(true);
    const [p, e, b, c] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('project_billing').select('*'),
      supabase.from('change_orders').select('*'),
    ]);
    setRaw({
      projects: p.data || [],
      expenses: e.data || [],
      billing: b.data || [],
      changeOrders: c.data || [],
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const report = useMemo(() => buildAnalytics(raw, cfg.options), [raw, cfg.options]);

  const sortedRows = useMemo(() => {
    const rows = [...report.rows];
    const dir = cfg.sortDir === 'asc' ? 1 : -1;
    rows.sort((a: any, b: any) => {
      const va = a[cfg.sortBy], vb = b[cfg.sortBy];
      if (typeof va === 'string') return String(va).localeCompare(String(vb)) * dir;
      return ((va || 0) - (vb || 0)) * dir;
    });
    return rows;
  }, [report.rows, cfg.sortBy, cfg.sortDir]);

  const statuses = useMemo(
    () => Array.from(new Set(raw.projects.map((p) => p.status).filter(Boolean))) as string[],
    [raw.projects]
  );
  const leaders = useMemo(
    () => Array.from(new Set(raw.projects.map((p) => p.field_leader).filter(Boolean))) as string[],
    [raw.projects]
  );

  const toggleIn = (list: string[], key: string) =>
    list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

  const t = report.totals;
  const activeCols = COL_DEFS.filter((c) => cfg.columns.includes(String(c.key)));

  const grandTotal = (key: string): string => {
    switch (key) {
      case 'contractValue': return money(t.contractValue);
      case 'changeOrders': return money(t.changeOrders);
      case 'revisedContract': return money(t.revisedContract);
      case 'billed': return money(t.billed);
      case 'received': return money(t.received);
      case 'outstanding': return money(t.outstanding);
      case 'expenses': return money(t.expenses);
      case 'profit': return money(t.profit);
      case 'margin': return pct(t.margin);
      case 'backlog': return money(t.backlog);
      case 'burnPct': return pct(t.burnPct);
      case 'completion': return pct(t.avgCompletion);
      default: return '';
    }
  };

  const exportCsv = () => {
    const head = ['Project', ...activeCols.map((c) => c.label)];
    const lines = [head.join(',')];
    sortedRows.forEach((r) => {
      lines.push([r.name, ...activeCols.map((c) => c.get(r))].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });
    if (cfg.showGrandTotals) {
      lines.push(['TOTAL', ...activeCols.map((c) => grandTotal(String(c.key)))].map((v) => `"${v}"`).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${cfg.title.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printReport = () => {
    const node = document.getElementById('analytics-report-print');
    if (!node) return;
    const win = window.open('', '_blank', 'width=1100,height=900');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${cfg.title}</title><style>
      body{font-family:'DM Sans',system-ui,sans-serif;color:#111;margin:32px;}
      h1{font-size:22px;margin:0 0 4px;} h2{font-size:15px;margin:24px 0 8px;}
      .muted{color:#666;font-size:12px;}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;}
      th,td{padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:left;}
      th{background:#f6f6f6;font-weight:600;}
      td.num,th.num{text-align:right;}
      svg{max-width:100%;height:auto;}
      .chart{page-break-inside:avoid;margin-top:12px;}
    </style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const rangeLabel =
    cfg.options.startDate || cfg.options.endDate
      ? `${cfg.options.startDate || 'start'} → ${cfg.options.endDate || 'today'}`
      : 'All time';

  const chartData = (key: string): any[] => {
    switch (key) {
      case 'monthly': return report.monthly;
      case 'profitByProject':
        return sortedRows.slice(0, cfg.chartLimit).map((r) => ({ name: r.name, profit: r.profit, costs: r.expenses }));
      case 'categoryMix':
        return report.categories.slice(0, cfg.chartLimit).map((c) => ({ name: c.label, value: c.total }));
      case 'statusMix':
        return report.statusCounts.map((s) => ({ name: s.label, value: s.value }));
      case 'agingChart':
        return report.aging.map((a) => ({ name: a.label, value: a.total }));
      default: return [];
    }
  };

  const renderChart = (key: string) => {
    const type = cfg.chartTypes[key] || 'bar';
    const data = chartData(key);
    if (!data.length) return <p className="text-sm text-muted-foreground">No data in scope.</p>;
    const series =
      key === 'monthly'
        ? [{ k: 'billed', c: PALETTE[3] }, { k: 'expenses', c: PALETTE[4] }, { k: 'profit', c: PALETTE[1] }]
        : key === 'profitByProject'
        ? [{ k: 'profit', c: PALETTE[1] }, { k: 'costs', c: PALETTE[4] }]
        : [{ k: 'value', c: PALETTE[0] }];
    const xKey = key === 'monthly' ? 'month' : 'name';

    return (
      <ResponsiveContainer width="100%" height={280}>
        {type === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey={series[0].k} nameKey="name" outerRadius={100} label>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v: any) => money(Number(v))} />
            <Legend />
          </PieChart>
        ) : type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => money(Number(v))} />
            <Legend />
            {series.map((s) => <Line key={s.k} type="monotone" dataKey={s.k} stroke={s.c} strokeWidth={2} />)}
          </LineChart>
        ) : type === 'area' ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => money(Number(v))} />
            <Legend />
            {series.map((s) => <Area key={s.k} type="monotone" dataKey={s.k} stroke={s.c} fill={s.c} fillOpacity={0.25} />)}
          </AreaChart>
        ) : (
          <BarChart data={data} layout={type === 'hbar' ? 'vertical' : 'horizontal'}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            {type === 'hbar' ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey={xKey} width={140} tick={{ fontSize: 11 }} />
              </>
            ) : (
              <>
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
              </>
            )}
            <Tooltip formatter={(v: any) => money(Number(v))} />
            <Legend />
            {series.map((s) => <Bar key={s.k} dataKey={s.k} fill={s.c} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        )}
      </ResponsiveContainer>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
      {/* Configuration */}
      <Card className="h-fit xl:sticky xl:top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Report title</Label>
            <Input value={cfg.title} onChange={(e) => setCfg({ ...cfg, title: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start date</Label>
              <Input
                type="date"
                value={cfg.options.startDate || ''}
                onChange={(e) => setCfg({ ...cfg, options: { ...cfg.options, startDate: e.target.value || null } })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">End date</Label>
              <Input
                type="date"
                value={cfg.options.endDate || ''}
                onChange={(e) => setCfg({ ...cfg, options: { ...cfg.options, endDate: e.target.value || null } })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Field leader</Label>
            <Select
              value={cfg.options.fieldLeader || 'all'}
              onValueChange={(v) => setCfg({ ...cfg, options: { ...cfg.options, fieldLeader: v === 'all' ? null : v } })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All leaders</SelectItem>
                {leaders.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Project status</Label>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={cfg.options.statuses.includes(s)}
                    onCheckedChange={() =>
                      setCfg({ ...cfg, options: { ...cfg.options, statuses: toggleIn(cfg.options.statuses, s) } })
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Nothing selected = all statuses.</p>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">Include archived projects</Label>
            <Switch
              checked={cfg.options.includeArchived}
              onCheckedChange={(v) => setCfg({ ...cfg, options: { ...cfg.options, includeArchived: v } })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Sections</Label>
            {SECTION_DEFS.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={cfg.sections.includes(s.key)}
                  onCheckedChange={() => setCfg({ ...cfg, sections: toggleIn(cfg.sections, s.key) })}
                />
                {s.label}
              </label>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">KPI tiles</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {KPI_DEFS.map((k) => (
                <label key={k.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={cfg.kpis.includes(k.key)}
                    onCheckedChange={() => setCfg({ ...cfg, kpis: toggleIn(cfg.kpis, k.key) })}
                  />
                  {k.label}
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Charts</Label>
            {CHART_DEFS.map((c) => (
              <div key={c.key} className="space-y-1">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={cfg.charts.includes(c.key)}
                    onCheckedChange={() => setCfg({ ...cfg, charts: toggleIn(cfg.charts, c.key) })}
                  />
                  {c.label}
                </label>
                {cfg.charts.includes(c.key) && (
                  <Select
                    value={cfg.chartTypes[c.key] || c.types[0]}
                    onValueChange={(v) => setCfg({ ...cfg, chartTypes: { ...cfg.chartTypes, [c.key]: v } })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {c.types.map((ty) => (
                        <SelectItem key={ty} value={ty}>
                          {ty === 'hbar' ? 'Horizontal bar' : ty.charAt(0).toUpperCase() + ty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
            <div className="space-y-1 pt-2">
              <Label className="text-xs text-muted-foreground">Items per chart: {cfg.chartLimit}</Label>
              <Slider
                min={3}
                max={25}
                step={1}
                value={[cfg.chartLimit]}
                onValueChange={([v]) => setCfg({ ...cfg, chartLimit: v })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Scorecard columns</Label>
            {COL_DEFS.map((c) => (
              <label key={String(c.key)} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={cfg.columns.includes(String(c.key))}
                  onCheckedChange={() => setCfg({ ...cfg, columns: toggleIn(cfg.columns, String(c.key)) })}
                />
                {c.label}
              </label>
            ))}
            <div className="flex items-center justify-between pt-2">
              <Label className="text-sm">Show grand totals row</Label>
              <Switch
                checked={cfg.showGrandTotals}
                onCheckedChange={(v) => setCfg({ ...cfg, showGrandTotals: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sort by</Label>
                <Select value={cfg.sortBy} onValueChange={(v) => setCfg({ ...cfg, sortBy: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Project name</SelectItem>
                    {COL_DEFS.map((c) => (
                      <SelectItem key={String(c.key)} value={String(c.key)}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Direction</Label>
                <Select value={cfg.sortDir} onValueChange={(v) => setCfg({ ...cfg, sortDir: v as 'asc' | 'desc' })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Button className="w-full" onClick={printReport}>
              <Printer className="w-4 h-4 mr-2" /> Print / PDF
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={exportCsv}>
                <Download className="w-4 h-4 mr-2" /> CSV
              </Button>
              <Button variant="outline" onClick={load}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setScheduleOpen(true)}>
              <Mail className="w-4 h-4 mr-2" /> Email &amp; schedule
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setCfg(DEFAULT_ANALYTICS_CONFIG)}>
              Reset to defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report preview */}
      <div id="analytics-report-print" className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{cfg.title}</h1>
          <p className="muted text-sm text-muted-foreground">
            RBF Construction &bull; {new Date().toLocaleDateString('en-US')} &bull; {rangeLabel} &bull;{' '}
            {report.rows.length} projects
          </p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading data…</p>}

        {cfg.sections.includes('kpis') && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Executive summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {KPI_DEFS.filter((k) => cfg.kpis.includes(k.key)).map((k) => (
                  <div key={k.key} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{k.label}</div>
                    <div className="text-lg font-semibold">{k.fmt(t)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {cfg.sections.includes('charts') &&
          CHART_DEFS.filter((c) => cfg.charts.includes(c.key)).map((c) => (
            <Card key={c.key} className="chart">
              <CardHeader className="pb-2"><CardTitle className="text-base">{c.label}</CardTitle></CardHeader>
              <CardContent>{renderChart(c.key)}</CardContent>
            </Card>
          ))}

        {cfg.sections.includes('projects') && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Project scorecard</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-2">Project</th>
                    {activeCols.map((c) => (
                      <th key={String(c.key)} className={c.num ? 'num text-right py-2' : 'text-left py-2'}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 font-medium">{r.name}</td>
                      {activeCols.map((c) => (
                        <td key={String(c.key)} className={c.num ? 'num text-right py-2' : 'py-2'}>{c.get(r)}</td>
                      ))}
                    </tr>
                  ))}
                  {cfg.showGrandTotals && (
                    <tr className="border-t font-semibold">
                      <td className="py-2">Grand total</td>
                      {activeCols.map((c) => (
                        <td key={String(c.key)} className={c.num ? 'num text-right py-2' : 'py-2'}>
                          {grandTotal(String(c.key))}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {cfg.sections.includes('categories') && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Cost by category</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground">
                  <th className="text-left py-2">Category</th>
                  <th className="num text-right py-2">Spend</th>
                  <th className="num text-right py-2">% of total</th>
                </tr></thead>
                <tbody>
                  {report.categories.map((c) => (
                    <tr key={c.label} className="border-t">
                      <td className="py-2">{c.label}</td>
                      <td className="num text-right py-2">{money(c.total)}</td>
                      <td className="num text-right py-2">{pct(c.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {cfg.sections.includes('aging') && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Receivables aging</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {report.aging.map((a) => (
                  <div key={a.label} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{a.label} days</div>
                    <div className="text-base font-semibold">{money(a.total)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {cfg.sections.includes('leaders') && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Field leader summary</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground">
                  <th className="text-left py-2">Leader</th>
                  <th className="num text-right py-2">Projects</th>
                  <th className="num text-right py-2">Contract</th>
                  <th className="num text-right py-2">Billed</th>
                  <th className="num text-right py-2">Costs</th>
                  <th className="num text-right py-2">Profit</th>
                </tr></thead>
                <tbody>
                  {report.leaders.map((l) => (
                    <tr key={l.leader} className="border-t">
                      <td className="py-2">{l.leader}</td>
                      <td className="num text-right py-2">{l.projects}</td>
                      <td className="num text-right py-2">{money(l.contract)}</td>
                      <td className="num text-right py-2">{money(l.billed)}</td>
                      <td className="num text-right py-2">{money(l.expenses)}</td>
                      <td className="num text-right py-2">{money(l.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {cfg.sections.includes('vendors') && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Top vendors</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground">
                  <th className="text-left py-2">Vendor</th>
                  <th className="num text-right py-2">Spend</th>
                </tr></thead>
                <tbody>
                  {report.vendors.map((v) => (
                    <tr key={v.label} className="border-t">
                      <td className="py-2">{v.label}</td>
                      <td className="num text-right py-2">{money(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {cfg.sections.includes('changeOrders') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Change order log <Badge variant="secondary" className="ml-2">{report.changeOrderRows.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground">
                  <th className="text-left py-2">#</th>
                  <th className="text-left py-2">Project</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Status</th>
                  <th className="num text-right py-2">Amount</th>
                </tr></thead>
                <tbody>
                  {report.changeOrderRows.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="py-2">{c.number}</td>
                      <td className="py-2">{c.project}</td>
                      <td className="py-2">{c.description}</td>
                      <td className="py-2">{c.date}</td>
                      <td className="py-2">{c.status}</td>
                      <td className="num text-right py-2">{money(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      <AnalyticsReportScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        config={cfg as unknown as Record<string, unknown>}
        defaultName={cfg.title}
      />
    </div>
  );
}
