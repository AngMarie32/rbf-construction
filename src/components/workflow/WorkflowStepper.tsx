import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const WORKFLOW_STEPS = [
  { name: 'Bid Estimator', href: '/estimating' },
  { name: 'Bid Planner', href: '/bid-planner' },
  { name: 'Proposals', href: '/proposals' },
  { name: 'Schedule of Values', href: '/schedule-of-values' },
  { name: 'Payment Applications', href: '/payment-applications' },
];

export interface WorkflowAction {
  /** Button text, e.g. "Create proposal from this bid". */
  label: string;
  /** One line explaining what will be carried over. */
  description?: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  /** Shown instead of the description when the action can't run yet. */
  disabledReason?: string;
}

/**
 * Step-by-step workflow bar. Every step is clickable, so any step can be skipped,
 * and ?project= is carried forward. When a page passes `next`, a bar under the
 * steps offers to carry this step's work into the next one in one click.
 */
export function WorkflowStepper({
  projectId,
  next,
  alternatives = [],
}: {
  projectId?: string | null;
  next?: WorkflowAction;
  alternatives?: WorkflowAction[];
}) {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const project = projectId || params.get('project') || '';
  const current = WORKFLOW_STEPS.findIndex((s) => pathname.startsWith(s.href));
  const qs = project ? `?project=${project}` : '';
  const nextStep = current >= 0 ? WORKFLOW_STEPS[current + 1] : undefined;
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (a: WorkflowAction) => {
    setBusy(a.label);
    try {
      await a.onClick();
    } finally {
      setBusy(null);
    }
  };

  return (
    <nav aria-label="Project workflow" className="overflow-hidden rounded-xl border bg-card">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 px-3 py-2.5 text-sm">
        {WORKFLOW_STEPS.map((s, i) => (
          <li key={s.href} className="flex items-center gap-1.5">
            <Link
              to={s.href + qs}
              aria-current={i === current ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-accent',
                i === current ? 'bg-primary text-primary-foreground hover:bg-primary/90' : i < current ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                  i === current ? 'bg-white/20' : i < current ? 'bg-foreground/10' : 'bg-muted'
                )}
              >
                {i + 1}
              </span>
              <span className="whitespace-nowrap">{s.name}</span>
            </Link>
            {i < WORKFLOW_STEPS.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
          </li>
        ))}
        {nextStep && !next && (
          <li className="ml-auto">
            <Link to={nextStep.href + qs} className="text-sm text-muted-foreground hover:text-foreground">
              Skip to {nextStep.name} →
            </Link>
          </li>
        )}
      </ol>

      {next && nextStep && (
        <div className="flex flex-col gap-3 border-t bg-orange-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Next step: {nextStep.name}</p>
              <p className="text-xs text-muted-foreground">{next.disabled && next.disabledReason ? next.disabledReason : next.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {alternatives.map((a) => (
              <Button key={a.label} variant="ghost" size="sm" disabled={!!busy || a.disabled} onClick={() => run(a)} title={a.description}>
                {busy === a.label && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {a.label}
              </Button>
            ))}
            <Link to={nextStep.href + qs} className="px-2 text-xs text-muted-foreground hover:text-foreground">
              Skip, just open it
            </Link>
            <Button size="sm" className="bg-orange-500 text-white hover:bg-orange-600" disabled={!!busy || next.disabled} onClick={() => run(next)}>
              {busy === next.label ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {next.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
