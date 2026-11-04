import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const STEPS = [
  { name: 'Bid Estimator', href: '/estimating' },
  { name: 'Bid Planner', href: '/bid-planner' },
  { name: 'Proposals', href: '/proposals' },
  { name: 'Schedule of Values', href: '/schedule-of-values' },
  { name: 'Payment Applications', href: '/payment-applications' },
];

/** Step-by-step workflow bar. Every step is clickable, so any step can be skipped. Carries ?project= forward. */
export function WorkflowStepper({ projectId }: { projectId?: string | null }) {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const project = projectId || params.get('project') || '';
  const current = STEPS.findIndex((s) => pathname.startsWith(s.href));
  const qs = project ? `?project=${project}` : '';

  return (
    <nav aria-label="Project workflow" className="rounded-lg bg-muted/40 px-4 py-3">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s.href} className="flex items-center gap-2">
            <Link
              to={s.href + qs}
              aria-current={i === current ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent',
                i === current ? 'bg-primary text-primary-foreground hover:bg-primary/90' : i < current ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <span className="font-semibold">{i + 1}</span>
              <span>{s.name}</span>
            </Link>
            {i < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
          </li>
        ))}
        {current >= 0 && current < STEPS.length - 1 && (
          <li className="ml-auto">
            <Link to={STEPS[current + 1].href + qs} className="text-sm text-muted-foreground hover:text-foreground">
              Skip to next step →
            </Link>
          </li>
        )}
      </ol>
    </nav>
  );
}
