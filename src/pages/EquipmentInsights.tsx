import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Sparkles, Loader2, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FleetCostReport } from '@/components/equipment/FleetCostReport';
import { RepairInvoiceImportDialog } from '@/components/equipment/RepairInvoiceImportDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Equipment } from '@/types/equipment';

interface RepairLog {
  id: string;
  equipment_id: string;
  date: string;
  description: string | null;
  cost: number | null;
  next_due: string | null;
}

interface Valuation {
  estimated_value: number;
  value_range_low: number;
  value_range_high: number;
  confidence: string;
  condition_grade: string;
  recommendation: string;
  annual_repair_run_rate: number;
  cost_per_hour: number;
  summary: string;
  risk_factors?: string[];
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

const RANGES = [
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
  { value: '24', label: 'Last 24 months' },
  { value: '0', label: 'All time' },
  { value: 'custom', label: 'Custom date range' },
];

export default function EquipmentInsights() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [repairs, setRepairs] = useState<RepairLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('12');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('all');
  const [valuations, setValuations] = useState<Record<string, Valuation>>({});
  const [valuingId, setValuingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<string>('overview');

  useEffect(() => {
    const unit = searchParams.get('unit');
    const t = searchParams.get('tab');
    const r = searchParams.get('range');
    if (unit) setSelectedId(unit);
    if (t === 'report' || t === 'overview') setTab(t);
    if (r) setRange(r);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    const [eqRes, mlRes] = await Promise.all([
      supabase.from('equipment').select('*').order('name'),
      supabase.from('maintenance_logs').select('*').order('date', { ascending: true }),
    ]);
    if (eqRes.error) toast.error('Failed to load equipment');
    if (mlRes.error) toast.error('Failed to load repair history');
    setEquipment((eqRes.data || []) as Equipment[]);
    setRepairs((mlRes.data || []) as RepairLog[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cutoff = useMemo(() => {
    if (range === 'custom') return customStart ? new Date(customStart) : null;
    const months = Number(range);
    if (!months) return null;
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d;
  }, [range, customStart]);

  const endCap = useMemo(
    () => (range === 'custom' && customEnd ? new Date(`${customEnd}T23:59:59`) : null),
    [range, customEnd]
  );

  const scopedRepairs = useMemo(() => {
    return repairs.filter((r) => {
      if (selectedId !== 'all' && r.equipment_id !== selectedId) return false;
      if (cutoff && new Date(r.date) < cutoff) return false;
      if (endCap && new Date(r.date) > endCap) return false;
      return true;
    });
  }, [repairs, selectedId, cutoff, endCap]);

  const monthlySeries = useMemo(() => {
    const map = new Map<string, { month: string; cost: number; events: number }>();
    scopedRepairs.forEach((r) => {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key) || { month: key, cost: 0, events: 0 };
      entry.cost += Number(r.cost || 0);
      entry.events += 1;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [scopedRepairs]);

  const rows = useMemo(() => {
    return equipment
      .filter((eq) =>
        search ? eq.name.toLowerCase().includes(search.toLowerCase()) : true
      )
      .map((eq) => {
        const logs = scopedRepairs.filter((r) => r.equipment_id === eq.id);
        const spend = logs.reduce((s, r) => s + Number(r.cost || 0), 0);
        const lifetime = repairs
          .filter((r) => r.equipment_id === eq.id)
          .reduce((s, r) => s + Number(r.cost || 0), 0);
        const value = Number(eq.value || 0);
        const ratio = value > 0 ? (lifetime / value) * 100 : 0;
        const hours = Number(eq.total_hours_used || 0);
        const costPerHour = hours > 0 ? lifetime / hours : 0;
        return { eq, events: logs.length, spend, lifetime, ratio, costPerHour };
      })
      .sort((a, b) => b.lifetime - a.lifetime);
  }, [equipment, scopedRepairs, repairs, search]);

  const totals = useMemo(() => {
    const spend = scopedRepairs.reduce((s, r) => s + Number(r.cost || 0), 0);
    const fleetValue = equipment.reduce((s, eq) => s + Number(eq.value || 0), 0);
    const hours = equipment.reduce((s, eq) => s + Number(eq.total_hours_used || 0), 0);
    const flagged = rows.filter((r) => r.ratio >= 50).length;
    return {
      spend,
      events: scopedRepairs.length,
      perHour: hours > 0 ? spend / hours : 0,
      pctOfFleet: fleetValue > 0 ? (spend / fleetValue) * 100 : 0,
      flagged,
    };
  }, [scopedRepairs, equipment, rows]);

  const healthBadge = (ratio: number) => {
    if (ratio >= 50) return <Badge className="bg-yellow-500/15 text-yellow-600 border-0">Replace watch</Badge>;
    if (ratio >= 25) return <Badge className="bg-yellow-500/15 text-yellow-600 border-0">Monitor</Badge>;
    return <Badge className="bg-green-500/15 text-green-600 border-0">Healthy</Badge>;
  };

  const runValuation = async (eq: Equipment) => {
    setValuingId(eq.id);
    try {
      const logs = repairs.filter((r) => r.equipment_id === eq.id);
      const { data, error } = await supabase.functions.invoke('equipment-valuation', {
        body: {
          equipment: eq,
          repairs: logs.map((r) => ({
            date: r.date,
            description: r.description,
            cost: r.cost,
          })),
          usage: logs.length,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setValuations((prev) => ({ ...prev, [eq.id]: data as Valuation }));
      toast.success(`Valuation ready for ${eq.name}`);
    } catch (e: any) {
      toast.error(e?.message || 'Valuation failed');
    } finally {
      setValuingId(null);
    }
  };


  type EquipRow = (typeof rows)[number];
  const equipColumns: DataTableColumn<EquipRow>[] = [
    {
      id: 'name',
      header: 'Equipment',
      value: (r) => r.eq.name,
      cell: (r) => (
        <div>
          <div className="font-medium">{r.eq.name}</div>
          <div className="text-xs text-muted-foreground">
            {r.eq.category} {r.eq.year ? `• ${r.eq.year}` : ''} • {r.events} events
          </div>
        </div>
      ),
    },
    { id: 'value', header: 'Book value', align: 'right', value: (r) => Number(r.eq.value || 0), cell: (r) => currency(Number(r.eq.value || 0)) },
    { id: 'spend', header: 'Repairs (period)', align: 'right', value: (r) => r.spend, cell: (r) => currency(r.spend) },
    { id: 'lifetime', header: 'Lifetime repairs', align: 'right', value: (r) => r.lifetime, cell: (r) => currency(r.lifetime) },
    { id: 'ratio', header: '% of value', align: 'right', value: (r) => r.ratio, cell: (r) => `${r.ratio.toFixed(2)}%` },
    { id: 'cph', header: '$ / hour', align: 'right', value: (r) => r.costPerHour, cell: (r) => currency(r.costPerHour) },
    { id: 'health', header: 'Health', value: (r) => r.ratio, noExport: true, cell: (r) => healthBadge(r.ratio) },
    {
      id: 'est',
      header: 'Est. value',
      align: 'right',
      value: (r) => (valuations[r.eq.id] ? Number(valuations[r.eq.id].estimated_value || 0) : null),
      cell: (r) => (valuations[r.eq.id] ? currency(Number(valuations[r.eq.id].estimated_value || 0)) : '—'),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (r) => (
        <Button size="sm" variant="outline" disabled={valuingId === r.eq.id} onClick={() => runValuation(r.eq)} title="Run smart valuation">
          {valuingId === r.eq.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Value
        </Button>
      ),
    },
  ];

  return (
    <Layout title="Equipment Intelligence" subtitle="Repair history, cost trends and smart valuation">
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="report">Cost & Value Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All equipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All equipment</SelectItem>
              {equipment.map((eq) => (
                <SelectItem key={eq.id} value={eq.id}>
                  {eq.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-40"
              />
            </div>
          )}
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import Repair Invoice
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Repair spend</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{currency(totals.spend)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Repair events</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{totals.events}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Repair cost / hour</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{currency(totals.perHour)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Replace-watch units</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{totals.flagged}</CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Repair cost over time</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => currency(Number(v))} />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Repair frequency by month</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="events" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unit economics & smart valuation</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              className="rounded-none border-0"
              columns={equipColumns}
              rows={rows}
              getRowId={(r) => r.eq.id}
              loading={loading}
              searchable={false}
              exportFilename="equipment-economics"
              initialSort={{ id: 'ratio', desc: true }}
              empty={<div className="py-10 text-center text-sm text-muted-foreground">No equipment found.</div>}
              renderExpanded={({ eq }) => {
                const v = valuations[eq.id];
                if (!v) return null;
                return (
                  <div>
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Value range</div>
                        <div className="font-medium">
                          {currency(Number(v.value_range_low || 0))} – {currency(Number(v.value_range_high || 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Recommendation</div>
                        <div className="font-medium capitalize">{v.recommendation}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Condition</div>
                        <div className="font-medium">{v.condition_grade}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Annual repair run-rate</div>
                        <div className="font-medium">{currency(Number(v.annual_repair_run_rate || 0))}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Confidence</div>
                        <div className="font-medium capitalize">{v.confidence}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{v.summary}</p>
                    {v.risk_factors?.length ? (
                      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                        {v.risk_factors.map((rf, i) => <li key={i}>{rf}</li>)}
                      </ul>
                    ) : null}
                  </div>
                );
              }}
            />
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="report">
          <FleetCostReport equipment={equipment as any} repairs={repairs} />
        </TabsContent>
      </Tabs>

      <RepairInvoiceImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        equipment={equipment}
        onImported={load}
      />
    </Layout>
  );
}