import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

interface Counts {
  tasks: number;
  documents: number;
  expenses: number;
  billing: number;
  changeOrders: number;
}

interface ProjectNextStepsProps {
  project: Project;
  counts: Counts;
  onEditProject: () => void;
  onOpenTab: (tab: string) => void;
}

interface Step {
  key: string;
  title: string;
  why: string;
  done: boolean;
  cta: string;
  to?: string;
  onClick?: () => void;
}

/**
 * Guides a user through the life of a job: set up → schedule → paperwork → costs → billing.
 * Each step is checked off from real data, and the first unfinished one is promoted as "Next step".
 */
export function ProjectNextSteps({ project, counts, onEditProject, onOpenTab }: ProjectNextStepsProps) {
  const qs = `?project=${project.id}`;
  const steps: Step[] = [
    {
      key: 'details',
      title: 'Fill in job details',
      why: 'Add the client, site address and contract value so reports and profit numbers are right.',
      done: Boolean(project.client && project.address && (project.contractValue || 0) > 0),
      cta: 'Edit job details',
      onClick: onEditProject,
    },
    {
      key: 'schedule',
      title: 'Build the schedule',
      why: 'Lay out phases and tasks so the crew knows what happens when and you can spot delays early.',
      done: counts.tasks > 0,
      cta: 'Open schedule',
      onClick: () => onOpenTab('schedule'),
    },
    {
      key: 'documents',
      title: 'Upload the contract and drawings',
      why: 'Keep the signed contract, plans and permits with the job so everyone works from the latest set.',
      done: counts.documents > 0,
      cta: 'Upload documents',
      to: `/documents${qs}`,
    },
    {
      key: 'costs',
      title: 'Start tracking costs',
      why: 'Log receipts and sub invoices (or import from QuickBooks) to see real-time job profit.',
      done: counts.expenses > 0,
      cta: 'Add an expense',
      to: `/expenses${qs}`,
    },
    {
      key: 'billing',
      title: 'Bill the client',
      why: 'Send your first invoice or pay application as work is completed to keep cash flowing.',
      done: counts.billing > 0,
      cta: 'Create a bill',
      to: `/billing${qs}`,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  if (!next) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="font-medium">This job is fully set up.</span>
          <span className="text-muted-foreground">
            Keep costs and billing current, and log a change order whenever the scope changes.
          </span>
        </CardContent>
      </Card>
    );
  }

  const NextButton = () =>
    next.to ? (
      <Button asChild><Link to={next.to}>{next.cta}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
    ) : (
      <Button onClick={next.onClick}>{next.cta}<ArrowRight className="ml-2 h-4 w-4" /></Button>
    );

  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        {/* Next step */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" /> Next step
          </div>
          <h3 className="mt-2 font-display text-xl font-bold">{next.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">{next.why}</p>
          <div className="mt-5"><NextButton /></div>
          <div className="mt-6 max-w-xs">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>Job setup</span>
              <span>{doneCount} of {steps.length} done</span>
            </div>
            <Progress value={(doneCount / steps.length) * 100} className="h-1.5" />
          </div>
        </div>

        {/* Checklist */}
        <ol className="divide-y">
          {steps.map((s, i) => {
            const isNext = s.key === next.key;
            const content = (
              <>
                {s.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className={cn('h-5 w-5 shrink-0', isNext ? 'text-primary' : 'text-muted-foreground/40')} />
                )}
                <span className={cn('flex-1 text-sm', s.done ? 'text-muted-foreground line-through' : 'font-medium')}>
                  {i + 1}. {s.title}
                </span>
                {!s.done && <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
              </>
            );
            const cls = cn('group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40', isNext && 'bg-primary/5');
            return (
              <li key={s.key}>
                {s.to ? (
                  <Link to={s.to} className={cls}>{content}</Link>
                ) : (
                  <button type="button" onClick={s.onClick} className={cls}>{content}</button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
