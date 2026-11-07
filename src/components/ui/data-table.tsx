import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  /** Unique id; also the CSV header fallback. */
  id: string;
  header: string;
  /** What to render in the cell. */
  cell: (row: T) => ReactNode;
  /** Value used for sorting, searching and CSV export. Omit to make the column unsortable and skip it in CSV. */
  value?: (row: T) => string | number | Date | null | undefined;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Exclude from CSV even if it has a value (e.g. action buttons). */
  noExport?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  /** Show the built-in search box (searches every column's value). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Page-specific filters (selects, date pickers) rendered next to the search box. */
  filters?: ReactNode;
  /** File name (without .csv) for the Export button. Omit to hide export. */
  exportFilename?: string;
  /** Shown when there are no rows at all. */
  empty?: ReactNode;
  /** Total rows before page filters, for "Showing x of y". */
  totalCount?: number;
  pageSize?: number;
  initialSort?: { id: string; desc?: boolean };
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  /** Footer row, e.g. totals. Receives the filtered rows. */
  footer?: (rows: T[]) => ReactNode;
  /** Row checkboxes. Pass both to enable; "select all" covers every row that matches the current search. */
  selectedIds?: Set<string>;
  onSelectedIdsChange?: (ids: Set<string>) => void;
  /** Shown in a bar above the table while rows are selected. */
  bulkActions?: ReactNode;
  /** Extra buttons at the right end of the toolbar (e.g. an export menu with more formats). */
  toolbarEnd?: ReactNode;
  className?: string;
  /** Optional full-width detail row shown under a row (return null for none). */
  renderExpanded?: (row: T) => ReactNode;
}

function toComparable(v: unknown): string | number {
  if (v == null || v === '') return '';
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? Date.parse(s) : NaN;
  return Number.isNaN(d) ? s.toLowerCase() : d;
}

function csvEscape(v: unknown) {
  if (v == null) return '';
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One consistent list table: toolbar (search, filters, export), sortable headers, paging. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search…',
  filters,
  exportFilename,
  empty,
  totalCount,
  pageSize = 25,
  initialSort,
  onRowClick,
  rowClassName,
  footer,
  selectedIds,
  onSelectedIdsChange,
  bulkActions,
  toolbarEnd,
  className,
  renderExpanded,
}: DataTableProps<T>) {
  const selectable = !!selectedIds && !!onSelectedIdsChange;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ id: string; desc: boolean } | null>(
    initialSort ? { id: initialSort.id, desc: !!initialSort.desc } : null
  );
  const [page, setPage] = useState(0);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      columns.some((c) => {
        const v = c.value?.(r);
        return v != null && String(v instanceof Date ? v.toLocaleDateString() : v).toLowerCase().includes(q);
      })
    );
  }, [rows, columns, query]);

  const sorted = useMemo(() => {
    if (!sort) return searched;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.value) return searched;
    return [...searched].sort((a, b) => {
      const av = toComparable(col.value!(a));
      const bv = toComparable(col.value!(b));
      if (av === bv) return 0;
      if (av === '') return 1;
      if (bv === '') return -1;
      const r = av < bv ? -1 : 1;
      return sort.desc ? -r : r;
    });
  }, [searched, sort, columns]);

  useEffect(() => setPage(0), [query, rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (id: string) =>
    setSort((s) => (s?.id !== id ? { id, desc: false } : s.desc ? null : { id, desc: true }));

  const exportCsv = () => {
    const cols = columns.filter((c) => c.value && !c.noExport);
    const lines = [cols.map((c) => csvEscape(c.header)).join(',')].concat(
      sorted.map((r) => cols.map((c) => csvEscape(c.value!(r))).join(','))
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFilename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const alignClass = (a?: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  const total = totalCount ?? rows.length;
  const showToolbar = searchable || filters || exportFilename || toolbarEnd;
  const allSelected = selectable && sorted.length > 0 && sorted.every((r) => selectedIds!.has(getRowId(r)));
  const someSelected = selectable && !allSelected && sorted.some((r) => selectedIds!.has(getRowId(r)));
  const toggleAll = () => onSelectedIdsChange!(allSelected ? new Set() : new Set(sorted.map(getRowId)));
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedIdsChange!(next);
  };

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card', className)}>
      {showToolbar && (
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center">
          {searchable && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className="pl-9" />
            </div>
          )}
          {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
          <div className="flex items-center gap-3 sm:ml-auto">
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {loading ? 'Loading…' : sorted.length === total ? `${total} ${total === 1 ? 'record' : 'records'}` : `${sorted.length} of ${total}`}
            </span>
            {toolbarEnd}
            {exportFilename && (
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading || sorted.length === 0}>
                <Download className="h-4 w-4" /> Export
              </Button>
            )}
          </div>
        </div>
      )}

      {selectable && selectedIds!.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">{selectedIds!.size} selected</span>
          {bulkActions}
          <Button size="sm" variant="ghost" onClick={() => onSelectedIdsChange!(new Set())}>Clear</Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : rows.length === 0 && empty ? (
        <div className="p-4">{empty}</div>
      ) : sorted.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nothing matches your search.
          {query && (
            <button className="ml-1 text-primary hover:underline" onClick={() => setQuery('')}>Clear search</button>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                {columns.map((c) => {
                  const active = sort?.id === c.id;
                  return (
                    <TableHead key={c.id} className={cn(alignClass(c.align), c.className)} aria-sort={active ? (sort!.desc ? 'descending' : 'ascending') : undefined}>
                      {c.value ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.id)}
                          className={cn('inline-flex items-center gap-1 uppercase hover:text-foreground', c.align === 'right' && 'flex-row-reverse', active && 'text-foreground')}
                        >
                          {c.header}
                          {active ? (sort!.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </button>
                      ) : (
                        c.header
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => {
                const detail = renderExpanded?.(r);
                return (
                <Fragment key={getRowId(r)}>
                <TableRow
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={cn(onRowClick && 'cursor-pointer', selectable && selectedIds!.has(getRowId(r)) && 'bg-primary/5', rowClassName?.(r))}
                >
                  {selectable && (
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedIds!.has(getRowId(r))} onCheckedChange={() => toggleOne(getRowId(r))} aria-label="Select row" />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.id} className={cn(alignClass(c.align), c.align === 'right' && 'tabular-nums', c.className)}>
                      {c.cell(r)}
                    </TableCell>
                  ))}
                </TableRow>
                {detail && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0)}>{detail}</TableCell>
                  </TableRow>
                )}
                </Fragment>
                );
              })}
              {footer && (
                <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40">
                  {selectable && <TableCell />}
                  {footer(sorted)}
                </TableRow>
              )}
            </TableBody>
          </Table>

          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                {page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)} of {sorted.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p - 1)} disabled={page === 0} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2">Page {page + 1} of {pageCount}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={page >= pageCount - 1} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
