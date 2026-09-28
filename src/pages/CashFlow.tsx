import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { buildCashFlow, CashFlowMonth } from '@/utils/cashFlowMath';
import { OverheadFrequency } from '@/utils/overheadMath';

const money = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const compact = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n) >= 1000 ? `${(Math.abs(n) / 1000).toFixed(0)}k` : Math.abs(n).toFixed(0)}`;

export default function CashFlow() {
  const { selectedIds, activeCompanies, loading: companiesLoading } = useCompanies();
  const [loading, setLoading] = useState(true);
  const [historyMonths, setHistoryMonths] = useState(6);
  const [projectMonths, setProjectMonths] = useState(6);
  const [startingCash, setStartingCash] = useState(0);
  const [projectRepairs, setProjectRepairs] = useState(true);
  const [projectEquipment, setProjectEquipment] = useState(false);

  const [equipment, setEquipment] = useState<{ date: string | null; amount: number }[]>([]);
  const [repairs, setRepairs] = useState<{ date: string | null; amount: number }[]>([]);
  const [overhead, setOverhead] = useState<{ amount: number; frequency: OverheadFrequency }[]>([]);
  const [loans, setLoans] = useState<{ start_date: string; principal_amount: number }[]>([]);
  const [loanPayments, setLoanPayments] = useState<
    {
      due_date: string;
      scheduled_amount: number;
      paid_amount: number;
      paid_date: string | null;
      status: string;
    }[]
  >([]);

  const companyIds = useMemo(
    () => (selectedIds.length ? selectedIds : activeCompanies.map((c) => c.id)),
    [selectedIds, activeCompanies]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eq, ml, oh, ln] = await Promise.all([
        supabase.from('equipment').select('purchase_date, value'),
        supabase.from('maintenance_logs').select('date, cost'),
        supabase.from('overhead_items').select('amount, frequency, company_id, is_active'),
        companyIds.length
          ? supabase
              .from('loans')
              .select('id, start_date, principal_amount, company_id')
              .in('company_id', companyIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (eq.error) throw eq.error;
      if (ml.error) throw ml.error;
      if (oh.error) throw oh.error;
      if (ln.error) throw ln.error;

      setEquipment(
        (eq.data ?? []).map((e: any) => ({ date: e.purchase_date, amount: Number(e.value) || 0 }))
      );
      setRepairs((ml.data ?? []).map((m: any) => ({ date: m.date, amount: Number(m.cost) || 0 })));
      setOverhead(
        (oh.data ?? [])
          .filter(
            (o: any) =>
              o.is_active &&
              (o.company_id === null || companyIds.length === 0 || companyIds.includes(o.company_id))
          )
          .map((o: any) => ({ amount: Number(o.amount) || 0, frequency: o.frequency as OverheadFrequency }))
      );

      const loanRows = (ln.data ?? []) as any[];
      setLoans(
        loanRows.map((l) => ({
          start_date: l.start_date,
          principal_amount: Number(l.principal_amount) || 0,
        }))
      );

      if (loanRows.length) {
        const { data: pays, error: payErr } = await supabase
          .from('loan_payments')
          .select('due_date, scheduled_amount, paid_amount, paid_date, status')
          .in(
            'loan_id',
            loanRows.map((l) => l.id)
          );
        if (payErr) throw payErr;
        setLoanPayments(
          (pays ?? []).map((p: any) => ({
            due_date: p.due_date,
            scheduled_amount: Number(p.scheduled_amount) || 0,
            paid_amount: Number(p.paid_amount) || 0,
            paid_date: p.paid_date,
            status: p.status,
          }))
        );
      } else {
        setLoanPayments([]);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Could not load cash flow data');
    } finally {
      setLoading(false);
    }
  }, [companyIds]);

  useEffect(() => {
    if (!companiesLoading) load();
  }, [companiesLoading, load]);

  const result = useMemo(
    () =>
      buildCashFlow({
        months: historyMonths,
        projectMonths,
        startingCash,
        equipment,
        repairs,
        overhead,
        loans,
        loanPayments,
        projectRepairs,
        projectEquipment,
      }),
    [
      historyMonths,
      projectMonths,
      startingCash,
      equipment,
      repairs,
      overhead,
      loans,
      loanPayments,
      projectRepairs,
      projectEquipment,
    ]
  );

  const { rows, overheadMonthly, avgRepairs, lowestCash, totals } = result;
  const projected = rows.filter((r) => r.projected);
  const projectedNeed = projected.reduce((s, r) => s + r.outflow, 0);
  const projectedIn = projected.reduce((s, r) => s + r.inflow, 0);
  const shortfall = lowestCash && lowestCash.cumulative < 0 ? Math.abs(lowestCash.cumulative) : 0;

  const kpi = (label: string, value: string, hint?: string) => (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-display font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );

  return (
    <Layout title="Cash Flow">
      <div className="space-y-6">
        {/* Controls */}
        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-1.5">
              <Label>History</Label>
              <Select value={String(historyMonths)} onValueChange={(v) => setHistoryMonths(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 6, 12, 24, 36, 48].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Last {m} months
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Projection</Label>
              <Select value={String(projectMonths)} onValueChange={(v) => setProjectMonths(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 6, 12, 24].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Next {m} months
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Starting cash on hand</Label>
              <Input
                type="number"
                step="0.001"
                value={startingCash === 0 ? '' : startingCash}
                placeholder="0.00"
                onChange={(e) => setStartingCash(Number(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={projectRepairs} onCheckedChange={setProjectRepairs} id="pr" />
              <Label htmlFor="pr" className="cursor-pointer">
                Project repair spend
              </Label>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={projectEquipment} onCheckedChange={setProjectEquipment} id="pe" />
              <Label htmlFor="pe" className="cursor-pointer">
                Project equipment buys
              </Label>
            </div>
          </div>
        </Card>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          {kpi('Operating cost', money(overheadMonthly), 'per month from overhead')}
          {kpi('Avg repair spend', money(avgRepairs), 'monthly average')}
          {kpi(
            `Cash needed (next ${projectMonths}m)`,
            money(projectedNeed),
            `${money(projectedIn)} expected in`
          )}
          {kpi(
            shortfall > 0 ? 'Projected shortfall' : 'Lowest projected cash',
            money(lowestCash ? lowestCash.cumulative : 0),
            lowestCash ? `in ${lowestCash.label}` : '—'
          )}
        </div>

        {shortfall > 0 && (
          <Card className="p-4 bg-yellow-500/10">
            <div className="text-sm">
              Cash runs short by <strong>{money(shortfall)}</strong> around{' '}
              <strong>{lowestCash?.label}</strong>. Raise starting cash, delay equipment purchases, or
              increase collections before then.
            </div>
          </Card>
        )}

        {/* Chart */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-semibold">Money in and out by month</h2>
            <Badge variant="secondary">
              {loading ? 'Loading…' : `${rows.length} months`}
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={62} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(v: number, name) => [money(Number(v)), name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar dataKey="equipment" name="Equipment deposits" stackId="out" fill="hsl(var(--muted-foreground))" />
              <Bar dataKey="repairs" name="Repairs" stackId="out" fill="hsl(var(--destructive))" />
              <Bar dataKey="overhead" name="Operating costs" stackId="out" fill="hsl(var(--primary))" fillOpacity={0.55} />
              <Bar dataKey="loanOut" name="Loans issued" stackId="out" fill="hsl(var(--accent-foreground))" fillOpacity={0.4} />
              <Bar dataKey="loanIn" name="Loan payments in" stackId="in" fill="hsl(var(--primary))" />
              <Line type="monotone" dataKey="cumulative" name="Cash on hand" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="p-3">Month</th>
                <th className="p-3 text-right">Equipment</th>
                <th className="p-3 text-right">Repairs</th>
                <th className="p-3 text-right">Operating</th>
                <th className="p-3 text-right">Loans issued</th>
                <th className="p-3 text-right">Loan payments in</th>
                <th className="p-3 text-right">Net</th>
                <th className="p-3 text-right">Cash on hand</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: CashFlowMonth) => (
                <tr key={r.key} className={r.projected ? 'border-b bg-muted/30' : 'border-b'}>
                  <td className="p-3 font-medium">
                    {r.label}
                    {r.projected && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        projected
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">{money(r.equipment)}</td>
                  <td className="p-3 text-right">{money(r.repairs)}</td>
                  <td className="p-3 text-right">{money(r.overhead)}</td>
                  <td className="p-3 text-right">{money(r.loanOut)}</td>
                  <td className="p-3 text-right">{money(r.loanIn)}</td>
                  <td className={`p-3 text-right ${r.net < 0 ? 'text-destructive' : ''}`}>
                    {money(r.net)}
                  </td>
                  <td className={`p-3 text-right font-medium ${r.cumulative < 0 ? 'text-destructive' : ''}`}>
                    {money(r.cumulative)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right" colSpan={4}>
                  Out {money(totals.outflow)}
                </td>
                <td className="p-3 text-right">{money(totals.inflow)}</td>
                <td className="p-3 text-right">{money(totals.net)}</td>
                <td className="p-3 text-right">
                  {money(rows.length ? rows[rows.length - 1].cumulative : startingCash)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>
    </Layout>
  );
}
