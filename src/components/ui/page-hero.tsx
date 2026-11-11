import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Navy banner used at the top of the Dashboard, Owner Cockpit and reports. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  stats = [],
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  stats?: { label: string; value: ReactNode; tone?: 'good' | 'bad' | 'warn' }[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('relative overflow-hidden rounded-2xl bg-[hsl(222_47%_13%)] px-6 py-6 text-white shadow-sm sm:px-8 sm:py-7', className)}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />
      <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">{eyebrow}</p>}
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-white/65">{subtitle}</div>}
          {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
        </div>
        {stats.length > 0 && (
          <div className="flex flex-wrap gap-x-8 gap-y-3 lg:justify-end lg:text-right">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-xs text-white/60">{s.label}</p>
                <p
                  className={cn(
                    'font-display text-2xl font-bold tabular-nums sm:text-3xl',
                    s.tone === 'good' && 'text-emerald-300',
                    s.tone === 'bad' && 'text-rose-300',
                    s.tone === 'warn' && 'text-amber-300'
                  )}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      {children && <div className="relative mt-5">{children}</div>}
    </section>
  );
}

/** Glass-style button for use on the PageHero. */
export const heroButton = 'inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-medium text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/20';
export const heroButtonPrimary = 'inline-flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600';
