import type React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Building2, DollarSign, Gauge, AlertTriangle, CalendarClock, GitPullRequestArrow } from 'lucide-react';
import { format } from 'date-fns';
import type { buildProjectAnalytics } from '@/lib/analyticsData';
import { CHART, SERIES, ChartTooltip, EmptyNote, KpiGrid, Legend, Panel, ReportDocument, ReportTable, ReportToolbar, Section, axisProps, compact, money } from './ReportKit';

type Data = ReturnType<typeof buildProjectAnalytics>;

const STATE = {
  late: { label: 'Past due', chip: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
  behind: { label: 'Behind', chip: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  'at-risk': { label: 'Due soon', chip: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  'on-track': { label: 'On track', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
} as const;

export function ProjectReports({ data, actions }: { data: Data; actions?: React.ReactNode }) {
  const { statusDistribution, budget, schedule, coByMonth, totals } = data;
  const coTotal = coByMonth.reduce((s, m) => s + m.approved + m.pending, 0);

  return (
    <div className="space-y-4">
      <ReportToolbar>{actions}</ReportToolbar>
      <ReportDocument
        eyebrow="Project Performance Report"
        title="Projects"
        stats={[
          { label: 'Open jobs', value: String(totals.open) },
          { label: 'Avg. complete', value: `${totals.avgComplete.toFixed(0)}%` },
        ]}
      >
        <Section eyebrow="Overview" title="Performance at a glance">
          <KpiGrid
            items={[
              { label: 'All projects', value: String(totals.projects), sub: `${totals.open} open`, icon: Building2, accent: 'bg-blue-600' },
              { label: 'Open contract value', value: compact(totals.contract), sub: 'Original contracts', icon: DollarSign, accent: 'bg-indigo-500' },
              { label: 'Approved change orders', value: compact(totals.approvedCO), sub: 'Added to contracts', icon: GitPullRequestArrow, accent: 'bg-emerald-500' },
              { label: 'Average complete', value: `${totals.avgComplete.toFixed(0)}%`, sub: 'Across open jobs', icon: Gauge, accent: 'bg-orange-500' },
              { label: 'Past due', value: String(totals.late), sub: `${totals.behind} behind or due soon`, icon: CalendarClock, accent: 'bg-rose-500', tone: totals.late ? 'bad' : undefined },
              { label: 'Costs ahead of progress', value: String(totals.overBudget), sub: 'Cost % > complete % + 10', icon: AlertTriangle, accent: 'bg-amber-500', tone: totals.overBudget ? 'bad' : undefined },
            ]}
          />
        </Section>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr] print:grid-cols-[1fr_1.6fr]">
          <Panel title="Projects by status" note={`${totals.projects} total`}>
            {statusDistribution.length === 0 ? (
              <EmptyNote>No projects yet.</EmptyNote>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                        {statusDistribution.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueFormat={(v) => `${v} project${v === 1 ? '' : 's'}`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {statusDistribution.map((s, i) => (
                    <li key={s.name} className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
                        {s.name}
                      </span>
                      <span className="font-semibold tabular-nums">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Change orders by month" note={`Last 12 months · ${compact(coTotal)}`}>
            {coTotal === 0 ? (
              <EmptyNote>No change orders dated in the last 12 months.</EmptyNote>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coByMonth} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={CHART.grid} />
                      <XAxis dataKey="month" {...axisProps} />
                      <YAxis {...axisProps} tickFormatter={compact} width={56} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="approved" name="Approved" stackId="a" fill={CHART.emerald} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pending" name="Pending" stackId="a" fill={CHART.amber} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Legend items={[{ label: 'Approved', color: CHART.emerald }, { label: 'Draft / submitted', color: CHART.amber }]} />
              </>
            )}
          </Panel>
        </div>

        <Section eyebrow="Budget" title="Contract vs costs to date" note="Open jobs, contract includes approved change orders">
          {budget.length === 0 ? (
            <EmptyNote>No open projects.</EmptyNote>
          ) : (
            <>
              <Panel title="Costs as a share of contract, compared with work complete">
                <div style={{ height: Math.max(180, budget.slice(0, 10).length * 38) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budget.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barGap={2}>
                      <CartesianGrid horizontal={false} stroke={CHART.grid} />
                      <XAxis type="number" domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]} {...axisProps} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={170} {...axisProps} tick={{ fontSize: 11, fill: '#334155' }} />
                      <Tooltip content={<ChartTooltip valueFormat={(v) => `${v.toFixed(0)}%`} />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="done" name="Work complete" fill={CHART.blue} radius={[0, 4, 4, 0]} barSize={10} />
                      <Bar dataKey="costPct" name="Costs % of contract" fill={CHART.orange} radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Legend items={[{ label: 'Work complete', color: CHART.blue }, { label: 'Costs as % of contract', color: CHART.orange }]} />
              </Panel>
              <div className="mt-4">
                <ReportTable
                  rows={budget}
                  columns={[
                    { header: 'Project', className: 'w-[32%]', cell: (r) => <><p className="font-semibold">{r.name}</p><p className="text-xs text-slate-500">{r.client || 'No client'}</p></> },
                    { header: 'Contract', align: 'right', cell: (r) => money(r.contract) },
                    { header: 'Costs', align: 'right', cell: (r) => money(r.costs) },
                    { header: 'Left in budget', align: 'right', cell: (r) => <span className={r.contract - r.costs < 0 ? 'text-rose-600 font-semibold' : ''}>{money(r.contract - r.costs)}</span> },
                    { header: 'Complete', align: 'right', cell: (r) => `${r.done}%` },
                    { header: 'Cost %', align: 'right', cell: (r) => <span className={r.overrun > 10 ? 'font-semibold text-rose-600' : ''}>{r.costPct.toFixed(0)}%</span> },
                  ]}
                />
              </div>
            </>
          )}
        </Section>

        <Section eyebrow="Schedule" title="Deadlines and progress" note="Time used = share of planned duration already passed">
          {schedule.length === 0 ? (
            <EmptyNote>No open projects have a due date.</EmptyNote>
          ) : (
            <ReportTable
              rows={schedule}
              columns={[
                { header: 'Project', className: 'w-[30%]', cell: (r) => <><p className="font-semibold">{r.name}</p><p className="text-xs text-slate-500">{r.leader}</p></> },
                { header: 'Due', cell: (r) => <span className="whitespace-nowrap">{format(new Date(r.due), 'MMM d, yyyy')}</span> },
                { header: 'Days left', align: 'right', cell: (r) => <span className={r.daysLeft < 0 ? 'font-semibold text-rose-600' : ''}>{r.daysLeft < 0 ? `${-r.daysLeft} late` : r.daysLeft}</span> },
                {
                  header: 'Time used vs complete',
                  cell: (r) => (
                    <div className="w-44 space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500"><span>Time {r.timePct == null ? '—' : `${r.timePct.toFixed(0)}%`}</span><span>Done {r.done}%</span></div>
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-100">
                        {r.timePct != null && <div className="absolute inset-y-0 left-0 bg-slate-300" style={{ width: `${r.timePct}%` }} />}
                        <div className="absolute inset-y-0 left-0 rounded-full bg-blue-600" style={{ width: `${Math.min(100, r.done)}%` }} />
                      </div>
                    </div>
                  ),
                },
                { header: 'Status', cell: (r) => <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATE[r.state].chip}`}>{STATE[r.state].label}</span> },
              ]}
            />
          )}
        </Section>
      </ReportDocument>
    </div>
  );
}
