import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, FileCheck, Clock, AlertTriangle, CheckCircle, CalendarCheck, Edit, Trash2, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { PageHero, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BondsPanel } from '@/components/permits/BondsPanel';
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
import { Layout } from '@/components/layout/Layout';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { PermitFormDialog } from '@/components/permits/PermitFormDialog';
import { PermitInspectionsDialog } from '@/components/permits/PermitInspectionsDialog';
import { PERMIT_STATUSES, PERMIT_TYPES, daysUntil, nextInspection, type Permit } from '@/types/permits';
import { supabase } from '@/integrations/supabase/client';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusTone: Record<string, 'success' | 'info' | 'warning' | 'destructive' | 'secondary'> = {
  Issued: 'success',
  Approved: 'info',
  'Under Review': 'warning',
  'Application Submitted': 'warning',
  Rejected: 'destructive',
  Expired: 'destructive',
};

const fmt = (d: string) => format(new Date(`${d}T00:00:00`), 'MMM d, yyyy');

export default function Permits() {
  const [searchParams, setTabParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'bonds' ? 'bonds' : 'permits');
  const [addBond, setAddBond] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Permit | null>(null);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; status?: string | null; contract_value?: number | null; client?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') || 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Permit | null>(null);
  const [inspectingId, setInspectingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: p, error }, { data: proj }] = await Promise.all([
      (supabase as any)
        .from('permits')
        .select('*, projects(name), permit_inspections(*)')
        .order('created_at', { ascending: false }),
      supabase.from('projects').select('id, name, status, contract_value, client').is('archived_at', null),
    ]);
    if (error) {
      console.error(error);
      toast.error('Could not load permits.');
    }
    setPermits((p as unknown as Permit[]) || []);
    setProjects(sortProjectsOpenFirst(proj || []));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      permits.filter(
        (p) =>
          (projectFilter === 'all' || p.project_id === projectFilter) &&
          (typeFilter === 'all' || p.permit_type === typeFilter) &&
          (statusFilter === 'all' ||
            p.status === statusFilter ||
            (statusFilter === 'expiring' && !!p.expiration_date && daysUntil(p.expiration_date) <= 30))
      ),
    [permits, projectFilter, typeFilter, statusFilter]
  );

  const upcoming = useMemo(
    () =>
      permits
        .flatMap((p) => (p.permit_inspections || []).map((i) => ({ ...i, permit: p })))
        .filter((i) => i.result === 'Scheduled' && daysUntil(i.scheduled_date) >= 0 && daysUntil(i.scheduled_date) <= 7)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [permits]
  );

  const stats = [
    { label: 'Permits', value: permits.length, icon: FileCheck, tone: '' },
    { label: 'Issued', value: permits.filter((p) => p.status === 'Issued').length, icon: CheckCircle, tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Waiting on the city', value: permits.filter((p) => ['Application Submitted', 'Under Review'].includes(p.status)).length, icon: Clock, tone: '' },
    {
      label: 'Expiring within 30 days',
      value: permits.filter((p) => p.expiration_date && daysUntil(p.expiration_date) <= 30 && daysUntil(p.expiration_date) >= 0).length,
      icon: AlertTriangle,
      tone: 'text-amber-600 dark:text-amber-400',
    },
  ];

  const remove = async (p: Permit) => {
    const { error } = await (supabase as any).from('permits').delete().eq('id', p.id);
    if (error) return toast.error('Could not delete the permit.');
    toast.success('Permit deleted.');
    load();
  };

  const columns: DataTableColumn<Permit>[] = [
    {
      id: 'permit',
      header: 'Permit',
      value: (p) => `${p.permit_type} ${p.permit_number || ''}`,
      cell: (p) => (
        <div className="min-w-[180px]">
          <div className="font-medium">{p.permit_type}{p.permit_number && <span className="ml-1 text-muted-foreground">#{p.permit_number}</span>}</div>
          {p.description && <div className="max-w-[260px] truncate text-xs text-muted-foreground">{p.description}</div>}
        </div>
      ),
    },
    {
      id: 'project',
      header: 'Job',
      value: (p) => p.projects?.name,
      cell: (p) => <Link to={`/projects/${p.project_id}`} className="hover:text-primary">{p.projects?.name || '—'}</Link>,
    },
    { id: 'status', header: 'Status', value: (p) => p.status, cell: (p) => <Badge variant={statusTone[p.status] || 'secondary'} className="whitespace-nowrap">{p.status}</Badge> },
    { id: 'authority', header: 'Authority', value: (p) => p.issuing_authority, cell: (p) => p.issuing_authority || '—' },
    {
      id: 'next',
      header: 'Next inspection',
      value: (p) => nextInspection(p)?.scheduled_date ?? null,
      cell: (p) => {
        const n = nextInspection(p);
        if (!n) return <span className="text-muted-foreground">—</span>;
        const d = daysUntil(n.scheduled_date);
        return (
          <div>
            <div className={cn('font-medium', d <= 1 && 'text-blue-600 dark:text-blue-400')}>{d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : fmt(n.scheduled_date)}</div>
            <div className="text-xs text-muted-foreground">{n.inspection_type}</div>
          </div>
        );
      },
    },
    {
      id: 'expires',
      header: 'Expires',
      value: (p) => p.expiration_date,
      cell: (p) => {
        if (!p.expiration_date) return <span className="text-muted-foreground">—</span>;
        const d = daysUntil(p.expiration_date);
        if (d < 0) return <Badge variant="destructive">Expired {fmt(p.expiration_date)}</Badge>;
        if (d <= 30) return <Badge variant="warning">In {d} day{d === 1 ? '' : 's'}</Badge>;
        return <span className="whitespace-nowrap">{fmt(p.expiration_date)}</span>;
      },
    },
    {
      id: 'fee',
      header: 'Fee',
      align: 'right',
      value: (p) => p.fee_amount ?? null,
      cell: (p) =>
        p.fee_amount != null ? (
          <span>
            ${p.fee_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className={cn('ml-1 text-xs', p.fee_paid ? 'text-emerald-600' : 'text-muted-foreground')}>{p.fee_paid ? 'paid' : 'due'}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (p) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="sm" className="px-2" onClick={() => setInspectingId(p.id)} title="Inspections" aria-label="Inspections">
            <ClipboardCheck className="h-4 w-4" />{p.permit_inspections?.length ? p.permit_inspections.length : ''}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit" onClick={() => { setEditing(p); setFormOpen(true); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete" onClick={() => setConfirmDelete(p)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const inspecting = permits.find((p) => p.id === inspectingId) || null;

  return (
    <Layout hideTitle title="Permits & Bonds">
      <div className="space-y-6">
        <PageHero
          eyebrow="Project management"
          title="Permits & Bonds"
          subtitle="Permit numbers, inspections and expiry dates, plus surety bonds and how much bonding capacity is left."
          actions={
            <button
              type="button"
              className={heroButtonPrimary}
              onClick={() => (tab === 'bonds' ? setAddBond((n) => n + 1) : openNew())}
            >
              <Plus className="h-4 w-4" /> {tab === 'bonds' ? 'Add bond' : 'Add permit'}
            </button>
          }
          stats={[
            { label: 'Permits issued', value: loading ? '…' : `${permits.filter((p) => p.status === 'Issued').length}/${permits.length}` },
            { label: 'Inspections this week', value: loading ? '…' : upcoming.length },
          ]}
        />

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            const next = new URLSearchParams(window.location.search);
            if (v === 'bonds') next.set('tab', 'bonds');
            else next.delete('tab');
            setTabParams(next, { replace: true });
          }}
        >
          <TabsList>
            <TabsTrigger value="permits" className="gap-2">
              <FileCheck className="h-4 w-4" /> Permits
            </TabsTrigger>
            <TabsTrigger value="bonds" className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Bonds
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bonds" className="mt-6">
            <BondsPanel projects={projects} projectFilter={projectFilter} onProjectFilter={setProjectFilter} addSignal={addBond} />
          </TabsContent>

          <TabsContent value="permits" className="mt-6 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <AccentStat
              key={s.label}
              label={s.label}
              value={s.value}
              icon={s.icon}
              loading={loading}
              accent={(['blue', 'emerald', 'indigo', 'amber'] as const)[i]}
              tone={i === 3 && Number(s.value) > 0 ? 'warn' : undefined}
            />
          ))}
        </div>

        {upcoming.length > 0 && (
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <CalendarCheck className="h-4 w-4 text-primary" /> Inspections in the next 7 days
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {upcoming.map((i) => {
                const d = daysUntil(i.scheduled_date);
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setInspectingId(i.permit.id)}
                    className={cn('rounded-lg border p-3 text-left hover:bg-muted/40', d <= 1 && 'border-blue-500/40 bg-blue-500/5')}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : format(new Date(`${i.scheduled_date}T00:00:00`), 'EEE, MMM d')}
                      {i.scheduled_time ? ` · ${i.scheduled_time}` : ''}
                    </div>
                    <div className="mt-1 font-medium">{i.inspection_type}</div>
                    <div className="text-xs text-muted-foreground">{i.permit.projects?.name} · {i.permit.permit_type} permit</div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        <DataTable
          columns={columns}
          rows={filtered}
          totalCount={permits.length}
          getRowId={(p) => p.id}
          loading={loading}
          searchPlaceholder="Search permit #, job, authority…"
          exportFilename="permits"
          initialSort={{ id: 'next' }}
          filters={
            <>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All jobs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jobs</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {PERMIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="expiring">Expiring within 30 days</SelectItem>
                  {PERMIT_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          }
          empty={
            <EmptyState
              icon={FileCheck}
              title="Track your first permit"
              description="Log building, electrical, plumbing and other permits with their numbers, inspections and expiry dates. You'll get a reminder the day before each inspection."
              action={{ label: 'Add your first permit', onClick: openNew }}
              steps={['Add the permit and its number', 'Schedule inspections as you book them', 'Get reminded before inspections and expiry']}
            />
          }
        />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this permit?</AlertDialogTitle>
            <AlertDialogDescription>
              The {confirmDelete?.permit_type} permit{confirmDelete?.permit_number ? ` #${confirmDelete.permit_number}` : ''} and its inspections will be removed.
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

      <PermitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        projects={projects}
        permit={editing}
        defaultProjectId={projectFilter !== 'all' ? projectFilter : undefined}
        onSaved={load}
      />
      <PermitInspectionsDialog permit={inspecting} onOpenChange={(o) => !o && setInspectingId(null)} onChanged={load} />
    </Layout>
  );
}
