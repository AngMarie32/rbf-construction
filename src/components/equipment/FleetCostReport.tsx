import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Printer, Download, RotateCcw, Mail } from 'lucide-react';
import { FleetReportScheduleDialog } from './FleetReportScheduleDialog';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  REPAIR_TYPES,
  TYPE_MAP,
  classifyRepair,
  buildReport,
  DEFAULT_OPTIONS,
  type ReportOptions,
  type RepairRecord,
  type RepairTypeKey,
  type EquipmentLike,
  type UnitAnalysis,
} from '@/utils/equipmentReportEngine';

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

const SECTION_DEFS = [
  { key: 'summary', label: 'Executive summary' },
  { key: 'charts', label: 'Charts' },
  { key: 'mix', label: 'Repair mix by type' },
  { key: 'units', label: 'Unit scorecard' },
  { key: 'drivers', label: 'Risk drivers & actions' },
  { key: 'ledger', label: 'Repair ledger detail' },
] as const;
type SectionKey = (typeof SECTION_DEFS)[number]['key'];

const KPI_DEFS = [
  { key: 'periodSpend', label: 'Repair spend (period)' },
  { key: 'lifetimeSpend', label: 'Lifetime repairs' },
  { key: 'events', label: 'Repair events' },
  { key: 'costPerHour', label: 'Cost / hour' },
  { key: 'runRate', label: 'Annual run-rate' },
  { key: 'fleetBookValue', label: 'Fleet value (book)' },
  { key: 'fleetValue', label: 'Fleet value (depreciated)' },
  { key: 'pctOfFleet', label: 'Repairs % of book value' },
  { key: 'avgHealth', label: 'Avg health score' },
  { key: 'replaceWatch', label: 'Replace / watch' },
  { key: 'unitCount', label: 'Units in scope' },
] as const;
type KpiKey = (typeof KPI_DEFS)[number]['key'];

const UNIT_COL_DEFS = [
  { key: 'adjustedValue', label: 'Adj. value' },
  { key: 'bookValue', label: 'Book value' },
  { key: 'hours', label: 'Hours (est.)' },
  { key: 'periodSpend', label: 'Period spend' },
  { key: 'lifetimeSpend', label: 'Lifetime spend' },
  { key: 'weightedSpend', label: 'Weighted spend' },
  { key: 'events', label: 'Events' },
  { key: 'ratio', label: 'Weighted %' },
  { key: 'costPerHour', label: '$ / hr' },
  { key: 'annualRunRate', label: 'Run-rate' },
  { key: 'trendPct', label: 'Trend' },
  { key: 'majorShare', label: 'Major %' },
  { key: 'healthScore', label: 'Score' },
  { key: 'verdict', label: 'Verdict' },
  { key: 'residualValue', label: 'Residual' },
] as const;
type UnitColKey = (typeof UNIT_COL_DEFS)[number]['key'];

const CHART_DEFS = [
  { key: 'monthly', label: 'Repair spend by month', types: ['bar', 'line', 'area', 'composed'] },
  { key: 'type', label: 'Spend by repair type', types: ['bar', 'horizontal', 'pie'] },
  { key: 'health', label: 'Health score by unit', types: ['bar', 'line'] },
  { key: 'unitSpend', label: 'Lifetime spend by unit', types: ['bar', 'horizontal', 'pie'] },
] as const;
type ChartKey = (typeof CHART_DEFS)[number]['key'];

const PIE_COLORS = [
  'hsl(217 91% 60%)',
  'hsl(142 71% 45%)',
  'hsl(45 93% 47%)',
  'hsl(262 83% 62%)',
  'hsl(12 76% 61%)',
  'hsl(199 89% 48%)',
  'hsl(340 75% 55%)',
  'hsl(84 60% 45%)',
  'hsl(28 90% 55%)',
  'hsl(280 60% 60%)',
];

interface Props {
  equipment: EquipmentLike[];
  repairs: RepairRecord[];
}

const verdictBadge = (v: string) => {
  const cls =
    v === 'Healthy'
      ? 'bg-green-500/15 text-green-600'
      : v === 'Replace'
      ? 'bg-blue-500/15 text-blue-600'
      : 'bg-yellow-500/15 text-yellow-600';
  return <Badge className={`${cls} border-0`}>{v}</Badge>;
};

const unitCellValue = (u: UnitAnalysis, key: UnitColKey): string => {
  switch (key) {
    case 'adjustedValue': return currency(u.adjustedValue);
    case 'bookValue': return currency(u.bookValue);
    case 'hours': return u.effectiveHours.toFixed(0);
    case 'events': return String(u.events);
    case 'weightedSpend': return currency(u.weightedSpend);
    case 'periodSpend': return currency(u.periodSpend);
    case 'lifetimeSpend': return currency(u.lifetimeSpend);
    case 'ratio': return `${u.ratio.toFixed(2)}%`;
    case 'costPerHour': return currency(u.costPerHour);
    case 'annualRunRate': return currency(u.annualRunRate);
    case 'trendPct': return `${u.trendPct.toFixed(2)}%`;
    case 'majorShare': return `${u.majorShare.toFixed(2)}%`;
    case 'healthScore': return u.healthScore.toFixed(2);
    case 'residualValue': return currency(u.residualValue);
    default: return '';
  }
};

const SUMMABLE: UnitColKey[] = [
  'adjustedValue',
  'bookValue',
  'hours',
  'events',
  'periodSpend',
  'lifetimeSpend',
  'weightedSpend',
  'annualRunRate',
  'residualValue',
];

const grandTotalValue = (units: UnitAnalysis[], key: UnitColKey): string => {
  if (!units.length) return '';
  const sum = (fn: (u: UnitAnalysis) => number) => units.reduce((s, u) => s + fn(u), 0);
  const avg = (fn: (u: UnitAnalysis) => number) => sum(fn) / units.length;
  switch (key) {
    case 'adjustedValue': return currency(sum((u) => u.adjustedValue));
    case 'bookValue': return currency(sum((u) => u.bookValue));
    case 'hours': return sum((u) => u.effectiveHours).toFixed(0);
    case 'events': return String(sum((u) => u.events));
    case 'periodSpend': return currency(sum((u) => u.periodSpend));
    case 'lifetimeSpend': return currency(sum((u) => u.lifetimeSpend));
    case 'weightedSpend': return currency(sum((u) => u.weightedSpend));
    case 'annualRunRate': return currency(sum((u) => u.annualRunRate));
    case 'residualValue': return currency(sum((u) => u.residualValue));
    case 'ratio': return `${avg((u) => u.ratio).toFixed(2)}% avg`;
    case 'costPerHour': {
      const hrs = sum((u) => u.effectiveHours);
      return currency(hrs > 0 ? sum((u) => u.lifetimeSpend) / hrs : 0);
    }
    case 'trendPct': return `${avg((u) => u.trendPct).toFixed(2)}% avg`;
    case 'majorShare': return `${avg((u) => u.majorShare).toFixed(2)}% avg`;
    case 'healthScore': return `${avg((u) => u.healthScore).toFixed(2)} avg`;
    default: return '';
  }
};

export function FleetCostReport({ equipment, repairs }: Props) {
  const [options, setOptions] = useState<ReportOptions>(DEFAULT_OPTIONS);
  const [sections, setSections] = useState<SectionKey[]>([
    'summary',
    'charts',
    'mix',
    'units',
    'drivers',
  ]);
  const [kpis, setKpis] = useState<KpiKey[]>([
    'periodSpend',
    'lifetimeSpend',
    'events',
    'costPerHour',
    'runRate',
    'fleetBookValue',
    'avgHealth',
    'replaceWatch',
  ]);
  const [rangeMode, setRangeMode] = useState<string>('12');
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [title, setTitle] = useState('Equipment Cost & Value Report');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [showEstimatedHours, setShowEstimatedHours] = useState(true);
  const [showGrandTotals, setShowGrandTotals] = useState(true);
  const [charts, setCharts] = useState<ChartKey[]>(['monthly', 'type', 'health']);
  const [chartTypes, setChartTypes] = useState<Record<ChartKey, string>>({
    monthly: 'composed',
    type: 'horizontal',
    health: 'bar',
    unitSpend: 'horizontal',
  });
  const [chartUnitLimit, setChartUnitLimit] = useState(12);
  const [unitColumns, setUnitColumns] = useState<UnitColKey[]>([
    'adjustedValue',
    'periodSpend',
    'lifetimeSpend',
    'costPerHour',
    'healthScore',
    'verdict',
  ]);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const set = (patch: Partial<ReportOptions>) =>
    setOptions((prev) => ({ ...prev, ...patch }));

  const scopedEquipment = useMemo(
    () => (unitIds.length ? equipment.filter((e) => unitIds.includes(e.id)) : equipment),
    [equipment, unitIds]
  );

  const scopedRepairsAll = useMemo(
    () =>
      unitIds.length
        ? repairs.filter((r) => unitIds.includes(r.equipment_id))
        : repairs,
    [repairs, unitIds]
  );

  const report = useMemo(
    () => buildReport(scopedEquipment, scopedRepairsAll, options),
    [scopedEquipment, scopedRepairsAll, options]
  );

  const eqName = (id: string) => equipment.find((e) => e.id === id)?.name || 'Unknown';

  const ledgerRows = useMemo(() => {
    const q = ledgerSearch.toLowerCase();
    return scopedRepairsAll
      .filter((r) =>
        q
          ? (r.description || '').toLowerCase().includes(q) ||
            eqName(r.equipment_id).toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [scopedRepairsAll, ledgerSearch, equipment]);

  const toggleType = (key: RepairTypeKey) =>
    set({
      includedTypes: options.includedTypes.includes(key)
        ? options.includedTypes.filter((k) => k !== key)
        : [...options.includedTypes, key],
    });

  const toggleRepair = (id: string) =>
    set({
      excludedRepairIds: options.excludedRepairIds.includes(id)
        ? options.excludedRepairIds.filter((x) => x !== id)
        : [...options.excludedRepairIds, id],
    });

  const toggleSection = (key: SectionKey) =>
    setSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const toggleKpi = (key: KpiKey) =>
    setKpis((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const toggleUnitCol = (key: UnitColKey) =>
    setUnitColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const toggleChart = (key: ChartKey) =>
    setCharts((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const exportCsv = () => {
    const head = [
      'Equipment',
      'Category',
      'Year',
      'Adjusted value',
      'Period repairs',
      'Lifetime repairs',
      'Weighted repairs',
      '% of value',
      'Cost per hour',
      'Annual run rate',
      'Trend %',
      'Major share %',
      'Health score',
      'Verdict',
      'Residual value',
    ];
    const lines = report.units.map((u) =>
      [
        u.name,
        u.category,
        u.year ?? '',
        u.adjustedValue.toFixed(2),
        u.periodSpend.toFixed(2),
        u.lifetimeSpend.toFixed(2),
        u.weightedSpend.toFixed(2),
        u.ratio.toFixed(2),
        u.costPerHour.toFixed(2),
        u.annualRunRate.toFixed(2),
        u.trendPct.toFixed(2),
        u.majorShare.toFixed(2),
        u.healthScore.toFixed(2),
        u.verdict,
        u.residualValue.toFixed(2),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[head.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printReport = () => {
    const node = document.getElementById('fleet-report-print');
    if (!node) return;
    const win = window.open('', '_blank', 'width=1100,height=900');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${title}</title>
      <style>
        :root{--border:0 0% 88%;--muted-foreground:0 0% 40%;--primary:217 91% 55%;}
        body{font-family:'DM Sans',system-ui,sans-serif;color:#111;margin:32px;}
        h1{font-size:22px;margin:0 0 4px;} h2{font-size:15px;margin:24px 0 8px;}
        .muted{color:#666;font-size:12px;}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;}
        th,td{padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:left;}
        th{background:#f6f6f6;font-weight:600;}
        td.num,th.num{text-align:right;}
        .kpis{display:flex;flex-wrap:wrap;gap:16px;margin-top:12px;}
        .kpi{border:1px solid #e5e5e5;border-radius:8px;padding:10px 14px;min-width:150px;}
        .kpi span{display:block;font-size:11px;color:#666;}
        .kpi b{font-size:16px;}
        ul{font-size:12px;}
        svg{max-width:100%;height:auto;}
        .chart{page-break-inside:avoid;margin-top:12px;}
      </style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const t = report.totals;

  const rangeLabel =
    rangeMode === 'custom'
      ? `${options.startDate || 'start'} → ${options.endDate || 'today'}`
      : options.months
      ? `Last ${options.months} months`
      : 'All time';

  const kpiValue = (key: KpiKey): string => {
    switch (key) {
      case 'periodSpend': return currency(t.periodSpend);
      case 'lifetimeSpend': return currency(t.lifetimeSpend);
      case 'events': return String(t.events);
      case 'costPerHour': return currency(t.costPerHour);
      case 'runRate': return currency(t.runRate);
      case 'fleetBookValue': return currency(t.fleetBookValue);
      case 'fleetValue': return currency(t.fleetValue);
      case 'pctOfFleet': return `${t.pctOfFleet.toFixed(2)}%`;
      case 'avgHealth': return t.avgHealth.toFixed(2);
      case 'replaceWatch': return `${t.replaceCount} / ${t.watchCount}`;
      case 'unitCount': return String(report.units.length);
      default: return '';
    }
  };

  const monthlyChart = report.monthly.map((m) => ({
    month: m.month,
    cost: Number(m.cost.toFixed(2)),
    events: m.events,
  }));
  const typeChart = report.typeTotals.map((row) => ({
    label: row.label,
    total: Number(row.total.toFixed(2)),
  }));
  const unitChart = report.units.slice(0, 12).map((u) => ({
    name: u.name,
    score: Number(u.healthScore.toFixed(2)),
    spend: Number(u.lifetimeSpend.toFixed(2)),
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
      {/* Config */}
      <Card className="h-fit xl:sticky xl:top-4">
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Report setup</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOptions(DEFAULT_OPTIONS);
              setUnitIds([]);
              setRangeMode('12');
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Report title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">History window</Label>
            <Select
              value={rangeMode}
              onValueChange={(v) => {
                setRangeMode(v);
                if (v === 'custom') {
                  const s = new Date();
                  s.setMonth(s.getMonth() - 12);
                  set({
                    startDate: options.startDate || s.toISOString().slice(0, 10),
                    endDate: options.endDate || new Date().toISOString().slice(0, 10),
                  });
                } else {
                  set({ months: Number(v), startDate: undefined, endDate: undefined });
                }
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
                <SelectItem value="24">Last 24 months</SelectItem>
                <SelectItem value="36">Last 36 months</SelectItem>
                <SelectItem value="0">All time</SelectItem>
                <SelectItem value="custom">Custom date range</SelectItem>
              </SelectContent>
            </Select>
            {rangeMode === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={options.startDate || ''}
                    onChange={(e) => set({ startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={options.endDate || ''}
                    onChange={(e) => set({ endDate: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Repair types included</Label>
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {REPAIR_TYPES.map((t2) => (
                <label key={t2.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={options.includedTypes.includes(t2.key)}
                    onCheckedChange={() => toggleType(t2.key)}
                  />
                  <span className="flex-1">{t2.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    sev {t2.severity.toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Use logged hours</Label>
              <Switch
                checked={options.useHours}
                onCheckedChange={(v) => set({ useHours: v })}
              />
            </div>
            {!options.useHours && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Assumed annual hours: {options.assumedAnnualHours}
                </Label>
                <Slider
                  value={[options.assumedAnnualHours]}
                  min={200}
                  max={3000}
                  step={100}
                  onValueChange={([v]) => set({ assumedAnnualHours: v })}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Apply depreciation</Label>
              <Switch
                checked={options.useDepreciation}
                onCheckedChange={(v) => set({ useDepreciation: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Weight by repair type</Label>
              <Switch
                checked={options.useSeverityWeighting}
                onCheckedChange={(v) => set({ useSeverityWeighting: v })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Outlier cutoff:{' '}
                {options.outlierMultiple ? `${options.outlierMultiple}x median` : 'Off'}
              </Label>
              <Slider
                value={[options.outlierMultiple]}
                min={0}
                max={10}
                step={1}
                onValueChange={([v]) => set({ outlierMultiple: v })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Replace threshold: {options.replaceThreshold}% of value
              </Label>
              <Slider
                value={[options.replaceThreshold]}
                min={20}
                max={120}
                step={5}
                onValueChange={([v]) => set({ replaceThreshold: v })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Sections</Label>
            {SECTION_DEFS.map((s) => (
              <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={sections.includes(s.key)}
                  onCheckedChange={() => toggleSection(s.key)}
                />
                {s.label}
              </label>
            ))}
          </div>

          {sections.includes('summary') && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Executive summary items ({kpis.length})
                </Label>
                <div className="space-y-2 max-h-56 overflow-auto pr-1">
                  {KPI_DEFS.map((k) => (
                    <label key={k.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={kpis.includes(k.key)}
                        onCheckedChange={() => toggleKpi(k.key)}
                      />
                      {k.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {sections.includes('units') && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show estimated hours</Label>
                  <Switch
                    checked={showEstimatedHours}
                    onCheckedChange={setShowEstimatedHours}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Unit summary columns ({unitColumns.length})
                  </Label>
                  <div className="space-y-2 max-h-56 overflow-auto pr-1">
                    {UNIT_COL_DEFS.map((c) => (
                      <label
                        key={c.key}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={unitColumns.includes(c.key)}
                          onCheckedChange={() => toggleUnitCol(c.key)}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Units ({unitIds.length ? unitIds.length : 'all'})
            </Label>
            <ScrollArea className="h-40 rounded border p-2">
              {equipment.map((eq) => (
                <label key={eq.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                  <Checkbox
                    checked={unitIds.includes(eq.id)}
                    onCheckedChange={() =>
                      setUnitIds((prev) =>
                        prev.includes(eq.id)
                          ? prev.filter((i) => i !== eq.id)
                          : [...prev, eq.id]
                      )
                    }
                  />
                  <span className="truncate">{eq.name}</span>
                </label>
              ))}
            </ScrollArea>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={printReport}>
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setScheduleOpen(true)}>
            <Mail className="w-4 h-4 mr-2" />
            Automated email
          </Button>
        </CardContent>
      </Card>

      {/* Report */}
      <div className="space-y-6">
        <div id="fleet-report-print" className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="muted text-sm text-muted-foreground">
              RBF Construction • {new Date().toLocaleDateString()} •{' '}
              {rangeLabel} •{' '}
              {report.units.length} units •{' '}
              {options.includedTypes.length} of {REPAIR_TYPES.length} repair types •{' '}
              {options.excludedRepairIds.length} excluded entries •{' '}
              {options.useHours ? 'hours logged included' : 'hours estimated'}
            </p>
          </div>

          {sections.includes('summary') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Executive summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="kpis grid grid-cols-2 md:grid-cols-4 gap-4">
                  {KPI_DEFS.filter((k) => kpis.includes(k.key)).map((k) => (
                    <div key={k.key} className="kpi rounded-lg border p-3">
                      <span className="text-xs text-muted-foreground block">{k.label}</span>
                      <b className="text-lg font-semibold">{kpiValue(k.key)}</b>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Repairs consume {t.pctOfFleet.toFixed(2)}% of fleet book value.{' '}
                  {t.replaceCount > 0
                    ? `${t.replaceCount} unit(s) scored below 40 and should be evaluated for replacement.`
                    : 'No unit is currently in replacement territory.'}{' '}
                  Severity weighting is {options.useSeverityWeighting ? 'on' : 'off'}, so major
                  engine, drivetrain and hydraulic work{' '}
                  {options.useSeverityWeighting ? 'counts heavier' : 'counts at face value'} against
                  each unit.
                </p>
              </CardContent>
            </Card>
          )}

          {sections.includes('charts') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Charts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="chart">
                  <p className="text-sm font-medium mb-2">Repair spend by month</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={monthlyChart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number, n) => (n === 'Spend' ? currency(Number(v)) : v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="cost" name="Spend" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="events" name="Events" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart">
                  <p className="text-sm font-medium mb-2">Spend by repair type</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={typeChart} layout="vertical" margin={{ top: 8, right: 16, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number) => currency(Number(v))} />
                      <Bar dataKey="total" name="Spend" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart">
                  <p className="text-sm font-medium mb-2">Health score by unit (lowest 12)</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={unitChart} margin={{ top: 8, right: 8, left: -8, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip />
                      <Bar dataKey="score" name="Health score" radius={[3, 3, 0, 0]}>
                        {unitChart.map((u) => (
                          <Cell
                            key={u.name}
                            fill={
                              u.score >= 80
                                ? 'hsl(142 71% 45%)'
                                : u.score >= 60
                                ? 'hsl(45 93% 47%)'
                                : 'hsl(217 91% 60%)'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {sections.includes('mix') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Repair mix by type</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="num text-right">Spend</TableHead>
                      <TableHead className="num text-right">% of total</TableHead>
                      <TableHead className="num text-right">Severity</TableHead>
                      <TableHead className="num text-right">Treated as recurring</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.typeTotals.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className="num text-right">{currency(row.total)}</TableCell>
                        <TableCell className="num text-right">
                          {t.lifetimeSpend > 0
                            ? ((row.total / t.lifetimeSpend) * 100).toFixed(2)
                            : '0.00'}
                          %
                        </TableCell>
                        <TableCell className="num text-right">
                          {TYPE_MAP[row.key].severity.toFixed(2)}
                        </TableCell>
                        <TableCell className="num text-right">
                          {(TYPE_MAP[row.key].recurring * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {report.typeTotals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No repairs match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {sections.includes('units') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Unit scorecard</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      {UNIT_COL_DEFS.filter((c) => unitColumns.includes(c.key)).map((c) => (
                        <TableHead
                          key={c.key}
                          className={c.key === 'verdict' ? '' : 'num text-right'}
                        >
                          {c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.units.map((u) => {
                      const estimated = !(options.useHours && u.hours > 0);
                      const hoursText = estimated
                        ? showEstimatedHours
                          ? ` • ${u.effectiveHours.toFixed(0)} hrs (est.)`
                          : ''
                        : ` • ${u.effectiveHours.toFixed(0)} hrs`;
                      return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {u.category}
                            {u.year ? ` • ${u.year}` : ''} • {u.events} events
                            {hoursText}
                          </div>
                        </TableCell>
                        {UNIT_COL_DEFS.filter((c) => unitColumns.includes(c.key)).map((c) => (
                          <TableCell
                            key={c.key}
                            className={c.key === 'verdict' ? '' : 'num text-right'}
                          >
                            {c.key === 'verdict' ? verdictBadge(u.verdict) : unitCellValue(u, c.key)}
                          </TableCell>
                        ))}
                      </TableRow>
                      );
                    })}
                    {report.units.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={unitColumns.length + 1}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No units selected.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {sections.includes('drivers') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Risk drivers & recommended actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.units
                  .filter((u) => u.verdict !== 'Healthy')
                  .slice(0, 10)
                  .map((u) => (
                    <div key={u.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{u.name}</div>
                        {verdictBadge(u.verdict)}
                      </div>
                      <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5">
                        {u.drivers.length ? (
                          u.drivers.map((d, i) => <li key={i}>{d}</li>)
                        ) : (
                          <li>No single dominant driver — cumulative cost pressure.</li>
                        )}
                        <li>
                          {u.verdict === 'Replace'
                            ? `Replace: residual value ${currency(u.residualValue)} vs ${currency(
                                u.annualRunRate
                              )}/yr in repairs.`
                            : u.verdict === 'Repair watch'
                            ? `Cap further spend at ${currency(
                                u.adjustedValue * 0.25
                              )} before re-evaluating.`
                            : `Keep running; re-check after the next ${currency(
                                u.annualRunRate / 4
                              )} of repairs.`}
                        </li>
                      </ul>
                    </div>
                  ))}
                {report.units.every((u) => u.verdict === 'Healthy') && (
                  <p className="text-sm text-muted-foreground">
                    Every unit in scope scores healthy under the current assumptions.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {sections.includes('ledger') && (
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Repair ledger</CardTitle>
                <Input
                  placeholder="Search repairs..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-56"
                />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Use</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="num text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerRows.map((r) => {
                      const typeKey = classifyRepair(r.description);
                      const excluded = options.excludedRepairIds.includes(r.id);
                      const typeOff = !options.includedTypes.includes(typeKey);
                      return (
                        <TableRow key={r.id} className={excluded || typeOff ? 'opacity-40' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={!excluded}
                              onCheckedChange={() => toggleRepair(r.id)}
                            />
                          </TableCell>
                          <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                          <TableCell>{eqName(r.equipment_id)}</TableCell>
                          <TableCell className="max-w-[280px] truncate">
                            {r.description || '—'}
                          </TableCell>
                          <TableCell>{TYPE_MAP[typeKey].label}</TableCell>
                          <TableCell className="num text-right">
                            {currency(Number(r.cost || 0))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {ledgerRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No repair entries.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <FleetReportScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        defaultName={title}
        config={{
          title,
          options,
          sections,
          kpis,
          unitColumns,
          showEstimatedHours,
          unitIds,
        }}
      />
    </div>
  );
}
