import type { ElementType, ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const ACCENTS = {
  blue: 'bg-blue-600',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
} as const;

/** Stat card with a colored top bar, matching the report KPI cards. Theme-aware. */
export function AccentStat({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'blue',
  tone,
  delta,
  loading,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ElementType;
  accent?: keyof typeof ACCENTS;
  tone?: 'good' | 'bad' | 'warn';
  delta?: number | null;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-card p-4 sm:p-5', className)}>
      <span className={cn('absolute inset-x-0 top-0 h-1', ACCENTS[accent])} />
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span className="truncate">{label}</span>
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p
          className={cn(
            'mt-2 font-display text-2xl font-bold tabular-nums tracking-tight',
            tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
            tone === 'bad' && 'text-rose-600 dark:text-rose-400',
            tone === 'warn' && 'text-amber-600 dark:text-amber-400'
          )}
        >
          {value}
        </p>
      )}
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {delta != null && Number.isFinite(delta) && !loading && (
          <span className={cn('inline-flex items-center gap-0.5 font-medium', delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
        {hint && <span className="truncate">{loading ? ' ' : hint}</span>}
      </div>
    </div>
  );
}
