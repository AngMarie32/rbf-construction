import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, FileCheck, Clock, AlertTriangle, CheckCircle, CalendarCheck, Edit, Trash2, ClipboardCheck } from 'lucide-react';
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
  const [searchParams] = useSearchParams();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; status?: string | null }[]>([]);
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
      supabase.from('projects').select('id, name, status').is('archived_at', null),
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
    if (!confirm(`Delete the ${p.permit_type} permit${p.permit_number ? ` #${p.permit_number}` : ''} and its inspections?`)) return;
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
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete" onClick={() => remove(p)}>
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
    <Layout
      title="Permits"
      subtitle="Permit numbers, inspections and expiry dates for every job"
      actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> Add permit</Button>}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{s.label}</span>
                <s.icon className="h-4 w-4" />
              </div>
              <div className={cn('mt-2 text-2xl font-bold tabular-nums', s.tone)}>{s.value}</div>
            </Card>
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
      </div>

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
