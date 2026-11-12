import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Pencil, Plus, Settings2, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { AccentStat } from '@/components/ui/accent-stat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BondFormDialog } from './BondFormDialog';
import { BOND_STATUSES, BOND_TYPES, bondedExposure, loadBondCapacity, type Bond, type BondCapacity } from '@/types/bonds';
import { daysUntil } from '@/types/permits';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const money0 = (n: number) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmt = (d: string) => format(new Date(`${d}T00:00:00`), 'MMM d, yyyy');
const statusTone: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = { Active: 'success', Requested: 'warning', Released: 'secondary', Expired: 'destructive' };

export function BondsPanel({
  projects,
  projectFilter,
  onProjectFilter,
  addSignal,
}: {
  projects: { id: string; name: string; contract_value?: number | null; client?: string | null }[];
  projectFilter: string;
  onProjectFilter: (v: string) => void;
  /** Increment to open the "Add bond" dialog from outside (e.g. the page header). */
  addSignal: number;
}) {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [capacity, setCapacity] = useState<BondCapacity>({ single: 0, aggregate: 0 });
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bond | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Bond | null>(null);

  const load = useCallback(async () => {
    const [{ data, error }, cap] = await Promise.all([
      (supabase as any).from('project_bonds').select('*, projects(name, contract_value, status, client)').order('created_at', { ascending: false }),
      loadBondCapacity(supabase),
    ]);
    if (error) {
      setMissingTable(/relation|does not exist|schema cache/i.test(error.message));
      if (!/relation|does not exist|schema cache/i.test(error.message)) toast.error('Could not load bonds.');
    } else setMissingTable(false);
    setBonds((data as Bond[]) || []);
    setCapacity(cap);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (addSignal > 0) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [addSignal]);

  const exposure = useMemo(() => bondedExposure(bonds), [bonds]);
  const available = capacity.aggregate > 0 ? capacity.aggregate - exposure.total : null;
  const usedPct = capacity.aggregate > 0 ? Math.min(100, (exposure.total / capacity.aggregate) * 100) : 0;
  const expiring = bonds.filter((b) => b.status === 'Active' && b.expiration_date && daysUntil(b.expiration_date) <= 30);
  const premiumsDue = bonds.filter((b) => b.premium && !b.premium_paid).reduce((s, b) => s + (Number(b.premium) || 0), 0);

  /** Bonded work after this bond is saved with `amount` (a job counts once, at its largest bond). */
  const exposureAfter = useCallback(
    (projectId: string, bondId: string | undefined, amount: number) => {
      const others = bondedExposure(bonds.filter((b) => b.id !== bondId));
      const job = others.byJob.get(projectId) || 0;
      return others.total - job + Math.max(job, amount);
    },
    [bonds]
  );

  const filtered = bonds.filter(
    (b) =>
      (projectFilter === 'all' || b.project_id === projectFilter) &&
      (typeFilter === 'all' || b.bond_type === typeFilter) &&
      (statusFilter === 'all' || b.status === statusFilter || (statusFilter === 'expiring' && expiring.includes(b)))
  );

  const remove = async (b: Bond) => {
    const { error } = await (supabase as any).from('project_bonds').delete().eq('id', b.id);
    if (error) return toast.error(`Could not delete the bond: ${error.message}`);
    toast.success('Bond deleted');
    load();
  };

  const columns: DataTableColumn<Bond>[] = [
    {
      id: 'bond',
      header: 'Bond',
      value: (b) => `${b.bond_type} ${b.bond_number || ''}`,
      cell: (b) => (
        <div className="min-w-[170px]">
          <div className="font-medium">{b.bond_type}</div>
          <div className="text-xs text-muted-foreground">{[b.bond_number && `#${b.bond_number}`, b.surety].filter(Boolean).join(' · ') || '—'}</div>
        </div>
      ),
    },
    {
      id: 'job',
      header: 'Job',
      value: (b) => b.projects?.name,
      cell: (b) => (
        <Link to={`/projects/${b.project_id}`} className="hover:text-primary">
          {b.projects?.name || '—'}
        </Link>
      ),
    },
    { id: 'obligee', header: 'Obligee', value: (b) => b.obligee, cell: (b) => b.obligee || b.projects?.client || <span className="text-muted-foreground">—</span> },
    { id: 'status', header: 'Status', value: (b) => b.status, cell: (b) => <Badge variant={statusTone[b.status] || 'secondary'}>{b.status}</Badge> },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      value: (b) => Number(b.amount) || 0,
      cell: (b) => (
        <div className="text-right">
          <div className="font-semibold tabular-nums">{money0(b.amount)}</div>
          {capacity.single > 0 && Number(b.amount) > capacity.single && ['Performance', 'Payment', 'Performance & Payment'].includes(b.bond_type) && (
            <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Over single-job limit</div>
          )}
        </div>
      ),
    },
    {
      id: 'expires',
      header: 'Expires',
      value: (b) => b.expiration_date,
      cell: (b) => {
        if (!b.expiration_date) return <span className="text-muted-foreground">—</span>;
        const d = daysUntil(b.expiration_date);
        if (b.status === 'Active' && d < 0) return <Badge variant="destructive">Expired {fmt(b.expiration_date)}</Badge>;
        if (b.status === 'Active' && d <= 30) return <Badge variant="warning">In {d} day{d === 1 ? '' : 's'}</Badge>;
        return <span className="whitespace-nowrap">{fmt(b.expiration_date)}</span>;
      },
    },
    {
      id: 'premium',
      header: 'Premium',
      align: 'right',
      value: (b) => b.premium ?? null,
      cell: (b) =>
        b.premium != null ? (
          <span>
            {money0(b.premium)}
            <span className={cn('ml-1 text-xs', b.premium_paid ? 'text-emerald-600' : 'text-muted-foreground')}>{b.premium_paid ? 'paid' : 'due'}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      cell: (b) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Edit"
            onClick={() => {
              setEditing(b);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete" onClick={() => setConfirmDelete(b)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (missingTable) {
    return (
      <EmptyState
        icon={Landmark}
        title="Bonds need a quick database update"
        description="Bond tracking and bond capacity are new. Ask an admin to run the “bonds and capacity” update in Supabase, then reload this page."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Capacity */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold">Bonding capacity</p>
            <p className="text-xs text-muted-foreground">
              Active and requested performance / payment bonds count against your aggregate program.
              {capacity.surety ? ` Surety: ${capacity.surety}.` : ''}
              {capacity.agent ? ` Agent: ${capacity.agent}${capacity.agentPhone ? `, ${capacity.agentPhone}` : ''}.` : ''}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings?tab=bonding">
              <Settings2 className="mr-1.5 h-4 w-4" /> {capacity.aggregate ? 'Edit capacity' : 'Set capacity'}
            </Link>
          </Button>
        </div>
        <div className="px-5 pb-5">
          {capacity.aggregate > 0 ? (
            <>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', usedPct >= 100 ? 'bg-rose-500' : usedPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  <span className="font-semibold tabular-nums">{money0(exposure.total)}</span> bonded of {money0(capacity.aggregate)} ({usedPct.toFixed(0)}%)
                </span>
                <span className={cn('font-semibold', (available ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>
                  {(available ?? 0) < 0 ? `${money0(-(available ?? 0))} over capacity` : `${money0(available ?? 0)} available`}
                </span>
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Add your single-job and aggregate bond limits in{' '}
              <Link to="/settings?tab=bonding" className="font-medium text-foreground underline">
                Settings → Bonding
              </Link>{' '}
              to see how much capacity is left before you bid the next bonded job.
            </p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <AccentStat label="Bonded work" value={money0(exposure.total)} icon={ShieldCheck} accent="blue" loading={loading} hint={`${exposure.byJob.size} job${exposure.byJob.size === 1 ? '' : 's'}`} />
        <AccentStat
          label="Available capacity"
          value={available == null ? '—' : money0(Math.max(0, available))}
          icon={Landmark}
          accent="emerald"
          tone={available != null && available < 0 ? 'bad' : undefined}
          loading={loading}
          hint={capacity.single ? `Single job limit ${money0(capacity.single)}` : 'Set limits in Settings'}
        />
        <AccentStat label="Expiring in 30 days" value={expiring.length} accent="amber" tone={expiring.length ? 'warn' : undefined} loading={loading} hint="Active bonds" />
        <AccentStat label="Premiums due" value={money0(premiumsDue)} accent="slate" loading={loading} hint="Not marked paid" />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        totalCount={bonds.length}
        getRowId={(b) => b.id}
        loading={loading}
        searchPlaceholder="Search bond #, job, surety…"
        exportFilename="bonds"
        initialSort={{ id: 'expires' }}
        onRowClick={(b) => {
          setEditing(b);
          setFormOpen(true);
        }}
        filters={
          <>
            <Select value={projectFilter} onValueChange={onProjectFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jobs</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {BOND_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="expiring">Expiring within 30 days</SelectItem>
                {BOND_STATUSES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="Track your first bond"
            description="Log bid, performance and payment bonds for each job with the surety, bond number, amount and expiry. Bonded work is checked against your bond capacity."
            action={{
              label: 'Add a bond',
              onClick: () => {
                setEditing(null);
                setFormOpen(true);
              },
              icon: Plus,
            }}
            secondaryAction={{ label: 'Set bond capacity', to: '/settings?tab=bonding' }}
          />
        }
      />

      <BondFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        projects={projects}
        bond={editing}
        defaultProjectId={projectFilter !== 'all' ? projectFilter : undefined}
        capacity={capacity}
        exposureAfter={exposureAfter}
        onSaved={load}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bond?</AlertDialogTitle>
            <AlertDialogDescription>
              The {confirmDelete?.bond_type} bond{confirmDelete?.bond_number ? ` #${confirmDelete.bond_number}` : ''} for {confirmDelete?.projects?.name} will be removed.
              To keep the history, set its status to Released instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) remove(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
