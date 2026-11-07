import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  label: string;
  /** Either navigate to a route… */
  to?: string;
  /** …or run a handler (e.g. open a dialog). */
  onClick?: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** One or two sentences: what this page is for and why you'd use it. */
  description: ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /** Short "how it works" steps shown under the buttons. */
  steps?: string[];
  /** Custom action element, e.g. an existing dialog that renders its own trigger button. */
  actionSlot?: ReactNode;
  /** Use when a search/filter hides existing records, so we don't tell users to start from scratch. */
  filtered?: boolean;
  onClearFilters?: () => void;
  compact?: boolean;
  className?: string;
}

function ActionButton({ action, variant }: { action: EmptyStateAction; variant: 'default' | 'outline' }) {
  const Icon = action.icon ?? (variant === 'default' ? Plus : undefined);
  const content = (
    <>
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      {action.label}
    </>
  );
  if (action.to) {
    return (
      <Button asChild variant={variant}>
        <Link to={action.to}>{content}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} onClick={action.onClick}>
      {content}
    </Button>
  );
}

/**
 * Friendly placeholder for pages and tabs with no records yet.
 * Explains what the area is for and gives the next action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  steps,
  actionSlot,
  filtered = false,
  onClearFilters,
  compact = false,
  className,
}: EmptyStateProps) {
  if (filtered) {
    return (
      <div className={cn('flex flex-col items-center text-center py-10 px-4', className)}>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">Nothing matches your filters</h3>
        <p className="mt-1 text-sm text-muted-foreground">Try a different search or clear the filters to see everything.</p>
        {onClearFilters && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center px-4 rounded-xl border border-dashed border-border bg-muted/20',
        compact ? 'py-8' : 'py-12 sm:py-16',
        className
      )}
    >
      <div className={cn('mb-4 flex items-center justify-center rounded-2xl bg-primary/10 text-primary', compact ? 'h-12 w-12' : 'h-16 w-16')}>
        <Icon className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
      </div>
      <h3 className={cn('font-display font-bold text-foreground', compact ? 'text-base' : 'text-lg')}>{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>

      {(action || secondaryAction || actionSlot) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {actionSlot}
          {action && <ActionButton action={action} variant="default" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="outline" />}
        </div>
      )}

      {steps && steps.length > 0 && (
        <ol className="mt-8 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-3 rounded-lg bg-background/60 p-3 text-sm border border-border/60">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{s}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
