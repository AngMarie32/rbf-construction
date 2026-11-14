import { coSovMessage, syncChangeOrderToSov } from '@/lib/changeOrderSov';
import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, FileText, GitPullRequestArrow, Hourglass, MoreHorizontal, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableCell } from '@/components/ui/table';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { supabase } from '@/integrations/supabase/client';
import { CreateChangeOrderDialog } from '@/components/change-orders/CreateChangeOrderDialog';
import { ChangeOrderTemplatesDialog } from '@/components/change-orders/ChangeOrderTemplatesDialog';
import { SendForSignatureButton } from '@/components/esign/SendForSignatureButton';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { cn } from '@/lib/utils';

interface ChangeOrder {
  id: string;
  project_id: string;
  number: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  created_at: string;
}

interface ProjectOption {
  id: string;
  name: string;
  status?: string | null;
  contract_value?: number | null;
}

const STATUSES = ['Draft', 'Submitted', 'Approved', 'Rejected'];
const STATUS_STYLE: Record<string, string> = {
  Draft: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300',
  Submitted: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300',
  Approved: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  Rejected: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300',
};

const money0 = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString()}`;
const money = (n: number) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d: string) => (d ? format(new Date(`${d.slice(0, 10)}T00:00:00`), 'MMM d, yyyy') : '');

export default function ChangeOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectFilter = searchParams.get('project') || 'all';
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(searchParams.get('new') === '1');
  const [editing, setEditing] = useState<ChangeOrder | null>(null);
  const [template, setTemplate] = useState<{ description: string; estimatedAmount: number } | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ChangeOrder | null>(null);

  const fetchChangeOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('change_orders').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load change orders');
    else setChangeOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchChangeOrders();
    supabase
      .from('projects')
      .select('id, name, status, contract_value')
      .is('archived_at', null)
      .then(({ data }) => setProjects(sortProjectsOpenFirst(data || [])));
  }, []);

  const setProjectFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('project');
    else next.set('project', value);
    next.delete('new');
    setSearchParams(next, { replace: true });
  };

  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
  const selectedProject = projectFilter !== 'all' ? projectById[projectFilter] : undefined;

  const inProject = changeOrders.filter((co) => projectFilter === 'all' || co.project_id === projectFilter);
  const rows = inProject.filter((co) => filterStatus === 'all' || co.status === filterStatus);

  const sum = (st: string) => inProject.filter((c) => c.status === st).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const count = (st: string) => inProject.filter((c) => c.status === st).length;
  const approved = sum('Approved');
  const pending = sum('Submitted');
  const contract = selectedProject ? Number(selectedProject.contract_value) || 0 : projects.reduce((s, p) => s + (Number(p.contract_value) || 0), 0);

  // Approved change orders by project (largest first)
  const byProject = Object.entries(
    inProject
      .filter((c) => c.status === 'Approved')
      .reduce<Record<string, number>>((a, c) => ((a[c.project_id] = (a[c.project_id] || 0) + (Number(c.amount) || 0)), a), {})
  )
    .map(([id, amt]) => ({ id, name: projectById[id]?.name || 'Unknown project', amt, pct: Number(projectById[id]?.contract_value) ? (amt / Number(projectById[id]?.contract_value)) * 100 : null }))
    .sort((a, b) => b.amt - a.amt)
    .slice(0, 6);

  const setStatus = async (co: ChangeOrder, status: string) => {
    const { error } = await supabase.from('change_orders').update({ status }).eq('id', co.id);
    if (error) return toast.error(`Couldn't update: ${error.message}`);
    setChangeOrders((list) => list.map((c) => (c.id === co.id ? { ...c, status } : c)));
    toast.success(`CO #${co.number} marked ${status}`);
    const sync = await syncChangeOrderToSov({ ...(co as any), status });
    const msg = coSovMessage(sync, co.number);
    if (msg) (msg.tone === 'warn' ? toast.warning : toast.success)(msg.text);
  };

  const remove = async (co: ChangeOrder) => {
    const { error } = await supabase.from('change_orders').delete().eq('id', co.id);
    if (!error) await syncChangeOrderToSov({ ...(co as any), status: 'Deleted' });
    if (error) return toast.error(`Couldn't delete: ${error.message}`);
    setChangeOrders((list) => list.filter((c) => c.id !== co.id));
    toast.success(`CO #${co.number} deleted`);
  };

  const openNew = () => {
    setEditing(null);
    setTemplate(null);
    setCreateDialogOpen(true);
  };

  const columns: DataTableColumn<ChangeOrder>[] = [
    {
      id: 'number',
      header: 'CO #',
      value: (c) => c.number,
      cell: (c) => <span className="font-mono text-sm font-semibold">#{c.number}</span>,
    },
    ...(projectFilter === 'all'
      ? [
          {
            id: 'project',
            header: 'Project',
            value: (c: ChangeOrder) => projectById[c.project_id]?.name || '',
            cell: (c: ChangeOrder) => (
              <Link to={`/projects/${c.project_id}?tab=change-orders`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                {projectById[c.project_id]?.name || '—'}
              </Link>
            ),
          },
        ]
      : []),
    {
      id: 'description',
      header: 'Change',
      value: (c) => c.description,
      cell: (c) => <p className="line-clamp-2 max-w-md text-sm">{c.description}</p>,
    },
    { id: 'date', header: 'Date', value: (c) => c.date, cell: (c) => <span className="whitespace-nowrap">{fmtDate(c.date)}</span> },
    {
      id: 'status',
      header: 'Status',
      value: (c) => c.status,
      cell: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Select value={c.status} onValueChange={(v) => setStatus(c, v)}>
            <SelectTrigger className={cn('h-7 w-[120px] rounded-full border-0 px-2.5 text-xs font-medium ring-1 ring-inset', STATUS_STYLE[c.status])}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      value: (c) => Number(c.amount) || 0,
      cell: (c) => <span className={cn('font-semibold tabular-nums', Number(c.amount) < 0 && 'text-rose-600 dark:text-rose-400')}>{money(c.amount)}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      cell: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <SendForSignatureButton
            source="change_order"
            sourceId={c.id}
            projectId={c.project_id}
            title={`Change Order ${c.number}`}
            documentType="Change Order"
            iconOnly
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => { setEditing(c); setTemplate(null); setCreateDialogOpen(true); }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Mark as</DropdownMenuLabel>
              {STATUSES.filter((s) => s !== c.status).map((s) => (
                <DropdownMenuItem key={s} onSelect={() => setStatus(c, s)}>
                  {s}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(c)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <Layout hideTitle title="Change Orders">
      <div className="space-y-6">
        {selectedProject && (
          <Link to={`/projects/${projectFilter}?tab=change-orders`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to {selectedProject.name}
          </Link>
        )}

        <PageHero
          eyebrow={selectedProject ? selectedProject.name : 'Financial'}
          title="Change Orders"
          subtitle="Track extra work and price changes, and get them signed by the owner."
          actions={
            <>
              <button type="button" className={heroButtonPrimary} onClick={openNew}>
                <Plus className="h-4 w-4" /> New change order
              </button>
              <button type="button" className={heroButton} onClick={() => setTemplatesOpen(true)}>
                <FileText className="h-4 w-4" /> From a template
              </button>
            </>
          }
          stats={[
            { label: 'Approved', value: loading ? '…' : money0(approved), tone: 'good' },
            { label: 'Waiting on owner', value: loading ? '…' : money0(pending), tone: pending ? 'warn' : undefined },
          ]}
        >
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full max-w-sm border-white/15 bg-white/10 text-white">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageHero>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {(
            [
              { key: 'Approved', label: 'Approved', icon: CheckCircle2, accent: 'emerald', hint: contract ? `${((approved / contract) * 100).toFixed(1)}% of contract value` : 'Added to contracts' },
              { key: 'Submitted', label: 'Waiting on owner', icon: Hourglass, accent: 'blue', hint: 'Submitted, not signed' },
              { key: 'Draft', label: 'Drafts', icon: Pencil, accent: 'slate', hint: 'Not sent yet' },
              { key: 'Rejected', label: 'Rejected', icon: XCircle, accent: 'rose', hint: 'Declined by owner' },
            ] as const
          ).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilterStatus(filterStatus === c.key ? 'all' : c.key)}
              className={cn('rounded-xl text-left transition-shadow hover:shadow-md', filterStatus === c.key && 'ring-2 ring-orange-500')}
            >
              <AccentStat label={`${c.label} (${count(c.key)})`} value={money0(sum(c.key))} icon={c.icon} accent={c.accent} loading={loading} hint={c.hint} />
            </button>
          ))}
        </div>

        {projectFilter === 'all' && byProject.length > 0 && (
          <Card className="p-5">
            <p className="mb-3 font-semibold">Approved changes by project</p>
            <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
              {byProject.map((p) => (
                <button key={p.id} type="button" className="block text-left" onClick={() => setProjectFilter(p.id)}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="tabular-nums">
                      {money0(p.amt)} {p.pct != null && <span className="text-xs text-muted-foreground">({p.pct >= 0 ? '+' : ''}{p.pct.toFixed(1)}%)</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(Math.abs(p.amt) / Math.abs(byProject[0].amt || 1)) * 100}%` }} />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          totalCount={inProject.length}
          getRowId={(c) => c.id}
          loading={loading}
          searchPlaceholder="Search number or description…"
          exportFilename={selectedProject ? `change-orders-${selectedProject.name}` : 'change-orders'}
          initialSort={{ id: 'date', desc: true }}
          onRowClick={(c) => {
            setEditing(c);
            setTemplate(null);
            setCreateDialogOpen(true);
          }}
          filters={
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          footer={(shown) =>
            shown.length ? (
              <>
                <TableCell colSpan={projectFilter === 'all' ? 5 : 4} className="text-right text-sm text-muted-foreground">
                  Total of {shown.length} shown
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(shown.reduce((s, c) => s + (Number(c.amount) || 0), 0))}</TableCell>
                <TableCell />
              </>
            ) : null
          }
          empty={
            <EmptyState
              icon={GitPullRequestArrow}
              filtered={filterStatus !== 'all' && inProject.length > 0}
              onClearFilters={() => setFilterStatus('all')}
              title={selectedProject ? `No change orders on ${selectedProject.name} yet` : 'Create your first change order'}
              description="When the owner asks for extra work or the scope changes, write it up here. Price it, send it for e-signature, and keep a clear record of every approved change on the job."
              action={{ label: 'New change order', onClick: openNew, icon: Plus }}
              secondaryAction={{ label: 'Start from a template', icon: FileText, onClick: () => setTemplatesOpen(true) }}
              steps={['Describe the change and price it', 'Send it to the owner for signature', 'Mark it Approved to add it to the contract']}
            />
          }
        />
      </div>

      <CreateChangeOrderDialog
        open={createDialogOpen}
        onOpenChange={(o) => {
          setCreateDialogOpen(o);
          if (!o) {
            setEditing(null);
            setTemplate(null);
          }
        }}
        projectId={projectFilter !== 'all' ? projectFilter : null}
        changeOrder={editing}
        template={template}
        onSave={fetchChangeOrders}
      />

      <ChangeOrderTemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelectTemplate={(t) => {
          setEditing(null);
          setTemplate({ description: t.description, estimatedAmount: t.estimatedAmount });
          setCreateDialogOpen(true);
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete change order #{confirmDelete?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.status === 'Approved'
                ? 'This change order is approved. Deleting it removes it from the contract totals and reports. To keep the record, mark it Rejected instead.'
                : 'It will be removed permanently.'}
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
    </Layout>
  );
}
