import { Fragment, useEffect, useMemo, useState } from 'react';
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
import { Sparkles, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FleetCostReport } from '@/components/equipment/FleetCostReport';
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
];

export default function EquipmentInsights() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [repairs, setRepairs] = useState<RepairLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('12');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('all');
  const [valuations, setValuations] = useState<Record<string, Valuation>>({});
  const [valuingId, setValuingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
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
    };
    load();
  }, []);

  const cutoff = useMemo(() => {
    const months = Number(range);
    if (!months) return null;
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d;
  }, [range]);

  const scopedRepairs = useMemo(() => {
    return repairs.filter((r) => {
      if (selectedId !== 'all' && r.equipment_id !== selectedId) return false;
      if (cutoff && new Date(r.date) < cutoff) return false;
      return true;
    });
  }, [repairs, selectedId, cutoff]);

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

  return (
    <Layout title="Equipment Intelligence" subtitle="Repair history, cost trends and smart valuation">
      <Tabs defaultValue="overview" className="space-y-6">
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
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead className="text-right">Book value</TableHead>
                  <TableHead className="text-right">Repairs (period)</TableHead>
                  <TableHead className="text-right">Lifetime repairs</TableHead>
                  <TableHead className="text-right">% of value</TableHead>
                  <TableHead className="text-right">$ / hour</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right">Est. value</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      No equipment found.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map(({ eq, events, spend, lifetime, ratio, costPerHour }) => {
                  const v = valuations[eq.id];
                  return (
                    <Fragment key={eq.id}>
                      <TableRow>
                        <TableCell>
                          <div className="font-medium">{eq.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {eq.category} {eq.year ? `• ${eq.year}` : ''} • {events} events
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{currency(Number(eq.value || 0))}</TableCell>
                        <TableCell className="text-right">{currency(spend)}</TableCell>
                        <TableCell className="text-right">{currency(lifetime)}</TableCell>
                        <TableCell className="text-right">{ratio.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{currency(costPerHour)}</TableCell>
                        <TableCell>{healthBadge(ratio)}</TableCell>
                        <TableCell className="text-right">
                          {v ? currency(Number(v.estimated_value || 0)) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={valuingId === eq.id}
                            onClick={() => runValuation(eq)}
                          >
                            {valuingId === eq.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {v && (
                        <TableRow className="bg-muted/40">
                          <TableCell colSpan={9}>
                            <div className="flex flex-wrap gap-6 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">Value range</div>
                                <div className="font-medium">
                                  {currency(Number(v.value_range_low || 0))} –{' '}
                                  {currency(Number(v.value_range_high || 0))}
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
                                <div className="font-medium">
                                  {currency(Number(v.annual_repair_run_rate || 0))}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Confidence</div>
                                <div className="font-medium capitalize">{v.confidence}</div>
                              </div>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">{v.summary}</p>
                            {v.risk_factors?.length ? (
                              <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5">
                                {v.risk_factors.map((rf, i) => (
                                  <li key={i}>{rf}</li>
                                ))}
                              </ul>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="report">
          <FleetCostReport equipment={equipment as any} repairs={repairs} />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}