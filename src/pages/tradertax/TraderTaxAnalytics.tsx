import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
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
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { tth } from '@/integrations/supabase/tradertax';
import {
  TthEngagement,
  TthFiling,
  TthIntake,
  TthLead,
  TthTimeEntry,
} from '@/types/tradertax';
import { computePracticeMetrics, PracticeMetrics } from '@/utils/traderTax/practiceMetrics';
import { money } from '@/utils/traderTax/labels';

/**
 * Chart palette. Both pairs pass the six-check validator against their own
 * surface — light on #ffffff, dark on the app's dark card — so the two series
 * stay separable under deuteranopia and protanopia as well as normal vision.
 */
const PALETTE = {
  light: { primary: '#2f7bf5', secondary: '#0f9488', grid: '#e6eaf0', axis: '#64748b', surface: '#ffffff' },
  dark: { primary: '#3b82f6', secondary: '#0d9488', grid: '#242c3a', axis: '#8a99ad', surface: '#121722' },
};

export default function TraderTaxAnalytics() {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === 'dark' ? PALETTE.dark : PALETTE.light;

  const [metrics, setMetrics] = useState<PracticeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState('12');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: engagements }, { data: filings }, { data: intakes }, { data: time }, { data: leads }] =
      await Promise.all([
        tth.from('tth_engagements').select('*'),
        tth.from('tth_filings').select('*'),
        tth.from('tth_intakes').select('*'),
        tth.from('tth_time_entries').select('*'),
        tth.from('tth_leads').select('*'),
      ]);

    setMetrics(
      computePracticeMetrics({
        engagements: (engagements ?? []) as TthEngagement[],
        filings: (filings ?? []) as TthFiling[],
        intakes: (intakes ?? []) as TthIntake[],
        timeEntries: (time ?? []) as TthTimeEntry[],
        leads: (leads ?? []) as TthLead[],
        months: Number(months),
      })
    );
    setLoading(false);
  }, [months]);

  useEffect(() => {
    load();
  }, [load]);

  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: c.surface,
      border: `1px solid ${c.grid}`,
      borderRadius: 8,
      fontSize: 12,
      color: resolvedTheme === 'dark' ? '#eaf0f7' : '#0b1220',
      boxShadow: '0 4px 12px rgba(15,23,42,.12)',
    }),
    [c, resolvedTheme]
  );

  const axisProps = {
    tick: { fill: c.axis, fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: c.grid },
  };

  if (loading || !metrics) {
    return (
      <Layout title="Practice analytics" subtitle="Loading…">
        <div className="flex items-center justify-center p-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      </Layout>
    );
  }

  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
  const rate = (v: number | null) => (v === null ? '—' : `${money(v)}/hr`);
  const hasHours = metrics.totalHours > 0;

  return (
    <Layout title="Practice analytics" subtitle="Revenue, realization, cycle time, and conversion">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Metrics read "—" rather than zero when the underlying data has not been recorded.
        </p>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 24 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {metrics.warnings.length > 0 && (
        <Card className="mt-4 border-amber-300 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-900">
              {metrics.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* --- Headline tiles ------------------------------------------------ */}
      <div className="mt-4 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="Active engagements" value={String(metrics.activeEngagements)} />
        <Tile label="Booked fees" value={money(metrics.bookedFees)} note={`avg ${money(metrics.averageFee)}`} />
        <Tile label="Billable hours" value={hasHours ? metrics.billableHours.toFixed(1) : '—'} note={hasHours ? `${pct(metrics.utilization)} of logged` : 'no time logged'} />
        <Tile label="Effective rate" value={rate(metrics.effectiveRate)} note="fees ÷ billable hours" />
        <Tile
          label="Filed on time"
          value={pct(metrics.onTimeRate)}
          note={metrics.filedCount ? `${metrics.lateCount} late of ${metrics.filedCount}` : 'nothing filed yet'}
          tone={metrics.lateCount > 0 ? 'warn' : undefined}
        />
        <Tile
          label="Lead conversion"
          value={pct(metrics.conversionRate)}
          note={metrics.medianDaysToConvert !== null ? `${metrics.medianDaysToConvert}d median` : 'no decided leads'}
        />
      </div>

      {/* --- Fees by month -------------------------------------------------- */}
      <Card className="mt-4 p-5">
        <h3 className="font-semibold">Fees booked by month</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Fee on each engagement, in the month it was opened.
        </p>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis
                {...axisProps}
                tickFormatter={(v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
                width={54}
              />
              <Tooltip
                cursor={{ fill: c.grid, fillOpacity: 0.35 }}
                contentStyle={tooltipStyle}
                formatter={(v: number) => [money(v), 'Fees']}
              />
              <Bar dataKey="fees" fill={c.primary} radius={[4, 4, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* --- Hours ---------------------------------------------------------- */}
      <Card className="mt-4 p-5">
        <h3 className="font-semibold">Hours logged by month</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Billable against everything else. Non-billable time is not waste — it is the number that
          tells you what a fixed fee really cost.
        </p>
        {hasHours ? (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={c.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={44} tickFormatter={(v: number) => `${v}h`} />
                <Tooltip
                  cursor={{ fill: c.grid, fillOpacity: 0.35 }}
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [`${Number(v).toFixed(1)} h`, name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: c.axis, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                {/* A 2px surface stroke separates the stacked segments. */}
                <Bar
                  dataKey="billableHours"
                  name="Billable"
                  stackId="h"
                  fill={c.primary}
                  stroke={c.surface}
                  strokeWidth={2}
                  maxBarSize={38}
                />
                <Bar
                  dataKey="nonBillableHours"
                  name="Non-billable"
                  stackId="h"
                  fill={c.secondary}
                  stroke={c.surface}
                  strokeWidth={2}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyPlot text="No time logged yet. Log time on an engagement and this fills in." />
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* --- Effective rate by service ----------------------------------- */}
        <Card className="p-5">
          <h3 className="font-semibold">Effective rate by service</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Fees divided by billable hours. This is the number that tells you what to reprice.
          </p>
          {metrics.byService.some((s) => s.effectiveRate !== null) ? (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={metrics.byService.filter((s) => s.effectiveRate !== null)}
                  margin={{ top: 8, right: 48, left: 8, bottom: 0 }}
                >
                  <CartesianGrid stroke={c.grid} horizontal={false} />
                  <XAxis type="number" {...axisProps} tickFormatter={(v: number) => `$${v}`} />
                  <YAxis type="category" dataKey="service" {...axisProps} width={140} />
                  <Tooltip
                    cursor={{ fill: c.grid, fillOpacity: 0.35 }}
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${money(v)}/hr`, 'Effective rate']}
                  />
                  <Bar dataKey="effectiveRate" fill={c.primary} radius={[0, 4, 4, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPlot text="Needs both a fee and logged hours on at least one engagement." />
          )}
        </Card>

        {/* --- Lead funnel --------------------------------------------------- */}
        <Card className="p-5">
          <h3 className="font-semibold">Lead funnel</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Where inquiries stop. The biggest drop is the one worth fixing.
          </p>
          {metrics.funnel[0].count > 0 ? (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={metrics.funnel}
                  margin={{ top: 8, right: 48, left: 8, bottom: 0 }}
                >
                  <CartesianGrid stroke={c.grid} horizontal={false} />
                  <XAxis type="number" {...axisProps} allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" {...axisProps} width={90} />
                  <Tooltip
                    cursor={{ fill: c.grid, fillOpacity: 0.35 }}
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [String(v), 'Leads']}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={26}>
                    {metrics.funnel.map((stage) => (
                      // Won is the outcome stage, so it carries the second hue;
                      // the rest are one series and share one hue.
                      <Cell key={stage.stage} fill={stage.stage === 'Won' ? c.secondary : c.primary} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPlot text="No leads yet. Share the inquiry link from the Leads page." />
          )}
        </Card>
      </div>

      {/* --- Cycle time ----------------------------------------------------- */}
      <Card className="mt-4 p-5">
        <h3 className="font-semibold">Cycle time</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Median days at each handoff. Sample size matters — a median over two engagements is an
          anecdote.
        </p>
        <div className="space-y-3">
          {metrics.cycle.map((stage) => {
            const max = Math.max(...metrics.cycle.map((s) => s.medianDays ?? 0), 1);
            const width = stage.medianDays === null ? 0 : (stage.medianDays / max) * 100;
            return (
              <div key={stage.stage}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{stage.stage}</span>
                  <span className="tabular-nums">
                    {stage.medianDays === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        <span className="font-medium">{stage.medianDays}d</span>
                        <span className="ml-2 text-xs text-muted-foreground">n={stage.sample}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${width}%`, backgroundColor: c.primary }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* --- Tables --------------------------------------------------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">By service</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-left font-medium">Service</th>
                  <th className="py-2 text-right font-medium">Count</th>
                  <th className="py-2 text-right font-medium">Fees</th>
                  <th className="py-2 text-right font-medium">Hours</th>
                  <th className="py-2 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byService.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No engagements yet.
                    </td>
                  </tr>
                ) : (
                  metrics.byService.map((s) => (
                    <tr key={s.service} className="border-b last:border-0">
                      <td className="py-2">{s.service}</td>
                      <td className="py-2 text-right tabular-nums">{s.engagements}</td>
                      <td className="py-2 text-right tabular-nums">{money(s.fees)}</td>
                      <td className="py-2 text-right tabular-nums">{s.hours || '—'}</td>
                      <td className="py-2 text-right tabular-nums">{rate(s.effectiveRate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Workload</h3>
          {metrics.byPerson.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No time logged.</p>
          ) : (
            <div className="space-y-2">
              {metrics.byPerson.map((p) => (
                <div key={p.person} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{p.person}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.engagements} engagement{p.engagements === 1 ? '' : 's'}
                    </div>
                  </div>
                  <span className="font-medium tabular-nums">{p.hours}h</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

function Tile({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'warn';
}) {
  return (
    <Card className="p-4">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {note && (
        <p className={`mt-1 text-xs ${tone === 'warn' ? 'text-amber-700' : 'text-muted-foreground'}`}>
          {note}
        </p>
      )}
    </Card>
  );
}

function EmptyPlot({ text }: { text: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed">
      <p className="max-w-xs text-center text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
