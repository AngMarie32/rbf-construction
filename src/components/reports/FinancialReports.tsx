import type React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, ReferenceLine, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, Wallet, Receipt, Clock, TrendingUp, Percent } from 'lucide-react';
import type { buildFinancialAnalytics } from '@/lib/analyticsData';
import { CHART, SERIES, ChartTooltip, EmptyNote, KpiGrid, Legend, Panel, ReportDocument, ReportTable, ReportToolbar, Section, axisProps, compact, money } from './ReportKit';

type Data = ReturnType<typeof buildFinancialAnalytics>;

export function FinancialReports({ data, actions, chips }: { data: Data; actions?: React.ReactNode; chips?: string[] }) {
  const { monthly, cumulative, byProject, costByCategory, totals } = data;
  const hasMonthly = monthly.some((m) => m.billed || m.costs || m.received);
  const catTotal = costByCategory.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-4">
      <ReportToolbar>{actions}</ReportToolbar>
      <ReportDocument
        eyebrow="Financial Report"
        chips={chips ?? ["Open jobs: Active and On Hold"]}
        title="Money in and out"
        stats={[
          { label: 'Billed', value: compact(totals.billed) },
          { label: 'Margin on billed', value: totals.margin == null ? '—' : `${totals.margin.toFixed(1)}%` },
        ]}
      >
        <Section eyebrow="Overview" title="Financial summary">
          <KpiGrid
            items={[
              { label: 'Billed to date', value: compact(totals.billed), sub: 'All billing records', icon: CreditCard, accent: 'bg-indigo-500' },
              { label: 'Received', value: compact(totals.received), sub: totals.collectRate == null ? 'Nothing billed yet' : `${totals.collectRate.toFixed(0)}% of billed collected`, icon: Wallet, accent: 'bg-emerald-500' },
              { label: 'Owed to you', value: compact(totals.owed), sub: 'Billed, not yet paid', icon: Clock, accent: 'bg-amber-500' },
              { label: 'Costs to date', value: compact(totals.costs), sub: 'All recorded expenses', icon: Receipt, accent: 'bg-orange-500' },
              { label: 'Gross profit on billed', value: compact(totals.profit), sub: 'Billed minus costs', icon: TrendingUp, accent: 'bg-blue-600', tone: totals.profit < 0 ? 'bad' : 'good' },
              { label: 'Avg. monthly net cash', value: compact(totals.avgMonthlyNet), sub: 'Received − costs, last 3 months', icon: Percent, accent: 'bg-rose-500', tone: totals.avgMonthlyNet < 0 ? 'bad' : 'good' },
            ]}
          />
        </Section>

        <Section eyebrow="Trend" title="Last 12 months" note="Billing is dated by its billing period end; costs by expense date">
          {!hasMonthly ? (
            <EmptyNote>No billing or expenses dated in the last 12 months.</EmptyNote>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] print:grid-cols-1">
              <Panel title="Billed, received and costs by month">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthly} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={CHART.grid} />
                      <XAxis dataKey="month" {...axisProps} />
                      <YAxis {...axisProps} tickFormatter={compact} width={60} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="billed" name="Billed" fill={CHART.indigo} radius={[4, 4, 0, 0]} barSize={14} />
                      <Bar dataKey="costs" name="Costs" fill={CHART.orange} radius={[4, 4, 0, 0]} barSize={14} />
                      <Line dataKey="received" name="Received" type="linear" stroke={CHART.emerald} strokeWidth={2.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <Legend items={[{ label: 'Billed', color: CHART.indigo }, { label: 'Costs', color: CHART.orange }, { label: 'Received', color: CHART.emerald }]} />
              </Panel>
              <Panel title="Cumulative net cash" note="Received minus costs, running total">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulative} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={CHART.blue} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke={CHART.grid} />
                      <XAxis dataKey="month" {...axisProps} />
                      <YAxis {...axisProps} tickFormatter={compact} width={60} />
                      <ReferenceLine y={0} stroke={CHART.slate} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area dataKey="cash" name="Net cash" type="linear" stroke={CHART.blue} strokeWidth={2.5} fill="url(#cashFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          )}
        </Section>

        <Section eyebrow="By project" title="Profit on billed work" note="Projects with billing or costs, largest billed first">
          {byProject.length === 0 ? (
            <EmptyNote>No billing or costs recorded yet.</EmptyNote>
          ) : (
            <ReportTable
              rows={byProject}
              columns={[
                { header: 'Project', className: 'w-[30%]', cell: (r) => <><p className="font-semibold">{r.name}</p><p className="text-xs text-slate-500">{r.status}</p></> },
                { header: 'Billed', align: 'right', cell: (r) => money(r.billed) },
                { header: 'Received', align: 'right', cell: (r) => <>{money(r.received)}{r.billed - r.received > 0 && <p className="text-xs text-amber-600">{money(r.billed - r.received)} owed</p>}</> },
                { header: 'Costs', align: 'right', cell: (r) => money(r.costs) },
                { header: 'Profit', align: 'right', cell: (r) => <span className={`font-semibold ${r.profit < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{money(r.profit)}</span> },
                {
                  header: 'Margin',
                  align: 'right',
                  cell: (r) =>
                    r.margin == null ? <span className="text-slate-400">Not billed</span> : (
                      <div className="ml-auto w-28">
                        <p className={`text-right font-semibold ${r.margin < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{r.margin.toFixed(1)}%</p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${r.margin < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.abs(r.margin))}%` }} />
                        </div>
                      </div>
                    ),
                },
              ]}
              footer={
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(totals.billed)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(totals.received)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(byProject.reduce((s, r) => s + r.costs, 0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(byProject.reduce((s, r) => s + r.profit, 0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.margin == null ? '—' : `${totals.margin.toFixed(1)}%`}</td>
                </tr>
              }
            />
          )}
        </Section>

        <Section eyebrow="Costs" title="Where the money goes" note="All recorded expenses by category" className="break-inside-avoid">
          {costByCategory.length === 0 ? (
            <EmptyNote>No expenses recorded yet.</EmptyNote>
          ) : (
            <Panel title={`${money(catTotal)} across ${costByCategory.length} categories`}>
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={costByCategory} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="none">
                        {costByCategory.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full flex-1 space-y-2 text-sm">
                  {costByCategory.slice(0, 8).map((c, i) => (
                    <li key={c.name}>
                      <div className="flex justify-between">
                        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />{c.name}</span>
                        <span className="tabular-nums"><span className="font-semibold">{money(c.value)}</span> <span className="text-slate-400">{((c.value / catTotal) * 100).toFixed(0)}%</span></span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${(c.value / catTotal) * 100}%`, background: SERIES[i % SERIES.length] }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          )}
        </Section>
      </ReportDocument>
    </div>
  );
}
