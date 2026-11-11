import { useState, type ElementType } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ExportOption {
  label: string;
  /** Short note under the label, e.g. "Client-ready PDF". */
  hint?: string;
  format?: 'pdf' | 'csv' | 'json';
  onSelect: () => void | Promise<void>;
  disabled?: boolean;
}

const ICON: Record<NonNullable<ExportOption['format']>, ElementType> = {
  pdf: FileText,
  csv: FileSpreadsheet,
  json: FileSpreadsheet,
};

/**
 * The one Export button used across Bidding, Proposals and the Schedule of Values.
 * Every download for a page lives in this menu instead of separate buttons.
 */
export function ExportMenu({
  options,
  label = 'Export',
  className,
  variant = 'outline',
  triggerClassName,
}: {
  options: ExportOption[];
  label?: string;
  className?: string;
  variant?: 'outline' | 'hero';
  triggerClassName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (o: ExportOption) => {
    setBusy(true);
    try {
      await o.onSelect();
    } finally {
      setBusy(false);
    }
  };
  const disabled = busy || options.every((o) => o.disabled);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {variant === 'hero' ? (
          <button
            type="button"
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-medium text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/20 disabled:opacity-50',
              triggerClassName
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {label}
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
        ) : (
          <Button variant="outline" className={cn('gap-2', triggerClassName)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {label}
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn('w-64', className)}>
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Download</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => {
          const Icon = ICON[o.format || 'pdf'];
          return (
            <DropdownMenuItem key={o.label} disabled={o.disabled} onSelect={() => run(o)} className="items-start gap-3 py-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{o.label}</span>
                {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Download rows as a CSV file. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const text = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  downloadText(filename.endsWith('.csv') ? filename : `${filename}.csv`, text, 'text/csv');
}

export function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
