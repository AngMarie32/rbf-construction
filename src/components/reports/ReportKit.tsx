/**
 * Shared building blocks so every Analytics report matches the Snapshot report:
 * a printable "paper" document with a navy cover band, accent KPI cards and
 * consistent chart styling. Always light colors (it prints), even in dark mode.
 */
import React from 'react';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CHART = {
  blue: '#2563eb',
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  orange: '#f97316',
  rose: '#e11d48',
  slate: '#94a3b8',
  grid: '#e2e8f0',
  axis: '#64748b',
};
export const SERIES = [CHART.blue, CHART.emerald, CHART.amber, CHART.indigo, CHART.orange, CHART.rose, '#06b6d4', CHART.slate];

export const money = (v: number) => `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v || 0)).toLocaleString()}`;
export const compact = (v: number) => {
  const a = Math.abs(v || 0);
  const sign = v < 0 ? '-' : '';
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}M`;
  if (a >= 1_000) return `${sign}$${Math.round(a / 1000).toLocaleString()}K`;
  return `${sign}$${Math.round(a)}`;
};
export const hours = (v: number) => `${Math.round(v || 0).toLocaleString()} h`;

export const axisProps = { stroke: CHART.axis, fontSize: 11, tickLine: false, axisLine: false } as const;

/** Tooltip box matching the report style. */
export function ChartTooltip({ active, payload, label, valueFormat = money }: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  valueFormat?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold text-slate-900">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold tabular-nums text-slate-900">{valueFormat(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

export function ReportToolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
      {children}
      <Button onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </Button>
    </div>
  );
}

export function ReportDocument({ eyebrow, title, chips = [], stats = [], children, companyName = 'RBF Construction' }: {
  eyebrow: string;
  title: string;
  chips?: string[];
  stats?: { label: string; value: string }[];
  children: React.ReactNode;
  companyName?: string;
}) {
  return (
    <article className="report-print overflow-hidden rounded-2xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
      <header className="relative overflow-hidden bg-[hsl(222_47%_13%)] px-8 py-8 text-white sm:px-10">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">{eyebrow}</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-3 py-1">{companyName} · Generated {format(new Date(), 'MMMM d, yyyy')}</span>
              {chips.map((c) => <span key={c} className="rounded-full bg-white/10 px-3 py-1">{c}</span>)}
            </div>
          </div>
          {stats.length > 0 && (
            <div className="flex gap-8 text-right">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-xs text-white/60">{s.label}</p>
                  <p className="font-display text-3xl font-bold tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>
      <div className="space-y-10 px-8 py-8 sm:px-10">{children}</div>
      <footer className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 px-8 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <span>Confidential. Prepared for internal use by {companyName}. Figures come from recorded billing, expenses and time entries.</span>
        <span>© {new Date().getFullYear()} {companyName}</span>
      </footer>
    </article>
  );
}

export function Section({ eyebrow, title, note, children, className = '' }: { eyebrow: string; title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">{eyebrow}</p>
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        </div>
        {note && <p className="text-right text-xs text-slate-500">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export interface KpiItem { label: string; value: string; sub?: string; icon: React.ElementType; accent: string; tone?: 'good' | 'bad' }

export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 print:grid-cols-3">
      {items.map((k) => (
        <div key={k.label} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 break-inside-avoid">
          <span className={`absolute inset-x-0 top-0 h-1 ${k.accent}`} />
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{k.label}</span>
            <k.icon className="h-4 w-4 text-slate-400" />
          </div>
          <p className={`mt-2 font-display text-2xl font-bold tabular-nums tracking-tight ${k.tone === 'bad' ? 'text-rose-600' : k.tone === 'good' ? 'text-emerald-600' : ''}`}>{k.value}</p>
          {k.sub && <p className="mt-0.5 text-xs text-slate-500">{k.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, note, children, className = '' }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 p-5 break-inside-avoid ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {note && <p className="text-xs text-slate-500">{note}</p>}
      </div>
      {children}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">{children}</p>;
}

/** Simple report table with a consistent look; columns align right for numbers. */
export function ReportTable<T>({ rows, columns, footer }: {
  rows: T[];
  columns: { header: string; cell: (r: T) => React.ReactNode; align?: 'right'; className?: string }[];
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 print:overflow-visible">
      <table className="w-full text-sm print:text-[11px]">
        <thead>
          <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {columns.map((c) => (
              <th key={c.header} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i} className="break-inside-avoid">
              {columns.map((c) => (
                <td key={c.header} className={`px-4 py-3 align-top ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.className || ''}`}>{c.cell(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">{footer}</tfoot>}
      </table>
    </div>
  );
}
