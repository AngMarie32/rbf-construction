import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboProject {
  id: string;
  name: string;
  client?: string | null;
  status?: string | null;
  project_code?: string | null;
  address?: string | null;
}

interface Props {
  projects: ComboProject[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Show a clear (x) button when a project is picked. */
  clearable?: boolean;
}

/**
 * Type-to-search project picker. Matches name, client, job number and address.
 * The list renders inline (no portal) so it works inside dialogs.
 */
export function ProjectCombobox({ projects, value, onChange, placeholder = 'Search for a project…', className, id, clearable }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const selected = projects.find((p) => p.id === value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    const words = q.split(/\s+/);
    return projects.filter((p) => {
      const hay = [p.name, p.client, p.project_code, p.address, p.status].filter(Boolean).join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [projects, query]);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (p: ComboProject) => {
    onChange(p.id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={wrap} className={cn('relative', className)}>
      {open ? (
        <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 ring-2 ring-ring ring-offset-2 ring-offset-background">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={input}
            id={id}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={selected ? selected.name : placeholder}
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded
            aria-autocomplete="list"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); if (matches[active]) pick(matches[active]); }
              else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          id={id}
          onClick={() => setOpen(true)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={cn('min-w-0 truncate', !selected && 'text-muted-foreground')}>
            {selected ? (
              <>
                {selected.name}
                {selected.client && <span className="text-muted-foreground"> · {selected.client}</span>}
              </>
            ) : (
              placeholder
            )}
          </span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {clearable && selected && (
              <X
                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </span>
        </button>
      )}

      {open && (
        <ul role="listbox" className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No project matches “{query}”</li>
          ) : (
            matches.map((p, i) => (
              <li
                key={p.id}
                role="option"
                aria-selected={p.id === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p);
                }}
                className={cn('flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm', i === active && 'bg-accent text-accent-foreground')}
              >
                <Check className={cn('mt-0.5 h-4 w-4 shrink-0', p.id === value ? 'opacity-100' : 'opacity-0')} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  {(p.client || p.project_code || p.status) && (
                    <span className="block truncate text-xs text-muted-foreground">{[p.project_code, p.client, p.status].filter(Boolean).join(' · ')}</span>
                  )}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
