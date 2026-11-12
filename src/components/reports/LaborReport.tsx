import type React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Line, ComposedChart } from 'recharts';
import { Users, DollarSign, Clock, Timer, Building2, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { buildLaborAnalytics } from '@/lib/analyticsData';
import { CHART, ChartTooltip, EmptyNote, KpiGrid, Legend, Panel, ReportDocument, ReportTable, ReportToolbar, Section, axisProps, compact, hours, money } from './ReportKit';

type Data = ReturnType<typeof buildLaborAnalytics>;

/** Tooltip for the monthly chart: hours lines in hours, the cost line in dollars. */
function LaborTip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-900">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold tabular-nums text-slate-900">{p.name === 'Labor cost' ? money(Number(p.value)) : `${Number(p.value).toFixed(1)} h`}</span>
        </p>
      ))}
    </div>
  );
}

export function LaborReport({ data, actions, chips }: { data: Data; actions?: React.ReactNode; chips?: string[] }) {
  const { monthly, byProject, byTrade, byPerson, totals } = data;

  if (totals.hours === 0) {
    return (
      <div className="space-y-4">
        <ReportToolbar>{actions}</ReportToolbar>
        <ReportDocument eyebrow="Labor Report"
        chips={chips ?? ["Open jobs: Active and On Hold"]} title="Crew hours and labor cost">
          <EmptyNote>
            No time entries yet. Log crew hours on the <Link to="/labor-costs" className="font-medium text-blue-600 hover:underline">Labor Costs</Link> page and this report fills in automatically.
          </EmptyNote>
        </ReportDocument>
      </div>
    );
  }

  const maxTrade = byTrade[0]?.cost || 1;

  return (
    <div className="space-y-4">
      <ReportToolbar>{actions}</ReportToolbar>
      <ReportDocument
        eyebrow="Labor Report"
        chips={chips ?? ["Open jobs: Active and On Hold"]}
        title="Crew hours and labor cost"
        stats={[
          { label: 'Hours', value: Math.round(totals.hours).toLocaleString() },
          { label: 'Labor cost', value: compact(totals.cost) },
        ]}
      >
        <Section eyebrow="Overview" title="Labor at a glance">
          <KpiGrid
            items={[
              { label: 'Labor cost', value: compact(totals.cost), sub: 'Incl. overtime and burden', icon: DollarSign, accent: 'bg-blue-600' },
              { label: 'Hours worked', value: Math.round(totals.hours).toLocaleString(), sub: `${Math.round(totals.hours - totals.otHours).toLocaleString()} regular`, icon: Clock, accent: 'bg-indigo-500' },
              { label: 'Overtime', value: `${totals.otShare.toFixed(1)}%`, sub: `${Math.round(totals.otHours).toLocaleString()} OT hours`, icon: Timer, accent: 'bg-amber-500', tone: totals.otShare > 15 ? 'bad' : undefined },
              { label: 'Blended cost per hour', value: `$${totals.blendedRate.toFixed(2)}`, sub: 'Total cost ÷ hours', icon: Gauge, accent: 'bg-emerald-500' },
              { label: 'People', value: String(totals.people), sub: 'With logged hours', icon: Users, accent: 'bg-orange-500' },
              { label: 'Jobs', value: String(totals.jobs), sub: 'With labor charged', icon: Building2, accent: 'bg-rose-500' },
            ]}
          />
        </Section>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] print:grid-cols-1">
          <Panel title="Hours and labor cost by month" note="Last 12 months">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthly} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis yAxisId="h" {...axisProps} width={44} />
                  <YAxis yAxisId="c" orientation="right" {...axisProps} tickFormatter={compact} width={56} />
                  <Tooltip content={<LaborTip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar yAxisId="h" dataKey="regular" name="Regular hours" stackId="h" fill={CHART.blue} barSize={16} />
                  <Bar yAxisId="h" dataKey="overtime" name="Overtime hours" stackId="h" fill={CHART.amber} radius={[4, 4, 0, 0]} barSize={16} />
                  <Line yAxisId="c" dataKey="cost" name="Labor cost" type="linear" stroke={CHART.emerald} strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[{ label: 'Regular hours', color: CHART.blue }, { label: 'Overtime hours', color: CHART.amber }, { label: 'Labor cost (right axis)', color: CHART.emerald }]} />
          </Panel>

          <Panel title="Labor cost by trade">
            <ul className="space-y-3 text-sm">
              {byTrade.slice(0, 8).map((t) => (
                <li key={t.name}>
                  <div className="flex justify-between">
                    <span className="font-medium">{t.name}</span>
                    <span className="tabular-nums font-semibold">{money(t.cost)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${(t.cost / maxTrade) * 100}%` }} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{hours(t.hours)} · {t.people} {t.people === 1 ? 'person' : 'people'} · ${t.rate.toFixed(2)}/h</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Section eyebrow="By job" title="Labor charged to each job">
          <Panel title="Labor cost by job" note="Top 10">
            <div style={{ height: Math.max(160, byProject.slice(0, 10).length * 34) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProject.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" {...axisProps} tickFormatter={compact} />
                  <YAxis type="category" dataKey="name" width={170} {...axisProps} tick={{ fontSize: 11, fill: '#334155' }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="cost" name="Labor cost" fill={CHART.indigo} radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Section>

        <Section eyebrow="By person" title="Crew hours" note="Most hours first">
          <ReportTable
            rows={[...byPerson].sort((a, b) => b.hours - a.hours)}
            columns={[
              { header: 'Person', className: 'w-[30%]', cell: (r) => <span className="font-semibold">{r.name}</span> },
              { header: 'Hours', align: 'right', cell: (r) => r.hours.toFixed(1) },
              { header: 'Overtime', align: 'right', cell: (r) => <span className={r.hours > 0 && r.ot / r.hours > 0.15 ? 'font-semibold text-amber-600' : ''}>{r.ot.toFixed(1)}</span> },
              { header: 'Cost / hour', align: 'right', cell: (r) => `$${r.rate.toFixed(2)}` },
              { header: 'Labor cost', align: 'right', cell: (r) => <span className="font-semibold">{money(r.cost)}</span> },
            ]}
            footer={
              <tr>
                <td className="px-4 py-3">Total · {totals.people} people</td>
                <td className="px-4 py-3 text-right tabular-nums">{totals.hours.toFixed(1)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{totals.otHours.toFixed(1)}</td>
                <td className="px-4 py-3 text-right tabular-nums">${totals.blendedRate.toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(totals.cost)}</td>
              </tr>
            }
          />
        </Section>
      </ReportDocument>
    </div>
  );
}
