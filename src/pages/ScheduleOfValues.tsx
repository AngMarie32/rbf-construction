import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Trash2, Plus, ListChecks, Building2, Target, ClipboardList, Percent, Wallet, Landmark, Coins, FileCheck2, Import } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateSOVDialog } from '@/components/schedule/CreateSOVDialog';
import { EditSOVItemDialog } from '@/components/schedule/EditSOVItemDialog';
import { PageHero, heroButton } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportMenu, downloadCsv } from '@/components/ui/export-menu';
import { TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { sendBidToSov, sovLineCounts } from '@/utils/proposalWorkflow';
import { generateSovReport, sovCompleted, sovContract, sovPercent } from '@/utils/sovPdfExport';
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

interface SovRow {
  id: string;
  project_id: string;
  item_number: string;
  category: string;
  subcategory: string | null;
  description: string;
  scheduled_value: number;
  change_orders: number;
  previous_applications: number;
  this_period: number;
  materials_stored: number;
  retainage_percentage: number;
  source_proposal_id?: string | null;
}

const money0 = (n: number) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money = (n: number) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function ScheduleOfValues() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sovItems, setSovItems] = useState<SovRow[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project') || '');
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [bidLines, setBidLines] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSOVItem, setSelectedSOVItem] = useState<SovRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SovRow | null>(null);
  const [confirmImport, setConfirmImport] = useState<{ total: number; billed: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client, status')
        .is('archived_at', null)
        .order('name');
      if (error) toast.error('Failed to load projects');
      setProjects(sortProjectsOpenFirst(data || []));
      setLoading(false);
    })();
  }, []);

  const fetchSOVItems = useCallback(async () => {
    if (!selectedProject) return;
    setItemsLoading(true);
    const [{ data, error }, { count }] = await Promise.all([
      supabase.from('sov_items').select('*').eq('project_id', selectedProject).order('item_number', { ascending: true }),
      supabase.from('bid_items').select('id', { count: 'exact', head: true }).eq('project_id', selectedProject),
    ]);
    if (error) toast.error('Failed to load the Schedule of Values');
    setSovItems(
      (data || []).map((i: any) => ({
        ...i,
        scheduled_value: Number(i.scheduled_value) || 0,
        change_orders: Number(i.change_orders) || 0,
        previous_applications: Number(i.previous_applications) || 0,
        this_period: Number(i.this_period) || 0,
        materials_stored: Number(i.materials_stored) || 0,
        retainage_percentage: Number(i.retainage_percentage) || 0,
      }))
    );
    setBidLines(count || 0);
    setItemsLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject) {
      setSovItems([]);
      setProject(null);
      return;
    }
    fetchSOVItems();
    supabase
      .from('projects')
      .select('*')
      .eq('id', selectedProject)
      .single()
      .then(({ data }) => setProject(data));
  }, [selectedProject, fetchSOVItems]);

  // Live refresh when a payment application or the SOV itself changes
  useEffect(() => {
    if (!selectedProject) return;
    const channel = supabase
      .channel(`sov-${selectedProject}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_applications_g702', filter: `project_id=eq.${selectedProject}` }, fetchSOVItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sov_items', filter: `project_id=eq.${selectedProject}` }, fetchSOVItems)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProject, fetchSOVItems]);

  const selectProject = (id: string) => {
    setSelectedProject(id);
    setSearchParams(id ? { project: id } : {}, { replace: true });
  };

  const totals = useMemo(() => {
    const scheduled = sovItems.reduce((s, i) => s + i.scheduled_value, 0);
    const changes = sovItems.reduce((s, i) => s + i.change_orders, 0);
    const contract = scheduled + changes;
    const completed = sovItems.reduce((s, i) => s + sovCompleted(i), 0);
    const stored = sovItems.reduce((s, i) => s + i.materials_stored, 0);
    const retainage = sovItems.reduce((s, i) => s + (sovCompleted(i) * i.retainage_percentage) / 100, 0);
    const cv = Number(project?.contingency_value) || 0;
    const contingency = project?.contingency_type === 'percentage' ? (scheduled * cv) / 100 : cv;
    return { scheduled, changes, contract, completed, stored, retainage, contingency, pct: contract ? (completed / contract) * 100 : 0 };
  }, [sovItems, project]);

  const deleteItem = async (row: SovRow) => {
    const { error } = await supabase.from('sov_items').delete().eq('id', row.id);
    if (error) return toast.error(`Couldn't delete the line: ${error.message}`);
    toast.success('Line deleted');
    fetchSOVItems();
  };

  const startImport = async () => {
    const counts = await sovLineCounts(selectedProject);
    if (counts.total === 0) return doImport();
    setConfirmImport(counts);
  };

  const doImport = async (replace = true) => {
    try {
      const r = await sendBidToSov(selectedProject, { replace });
      toast.success(`Added ${r.added} line${r.added === 1 ? '' : 's'} from the bid${r.kept ? ` · kept ${r.kept} billed line${r.kept === 1 ? '' : 's'}` : ''}`);
      fetchSOVItems();
    } catch (e: any) {
      toast.error(e.message || 'Could not pull the bid into the Schedule of Values');
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `schedule-of-values-${(project?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      ['Item', 'Category', 'Subcategory', 'Description', 'Scheduled value', 'Change orders', 'Previous applications', 'This period', 'Materials stored', 'Completed to date', '% complete', 'Balance to finish', 'Retainage %'],
      sovItems.map((i) => [
        i.item_number,
        i.category,
        i.subcategory || '',
        i.description,
        i.scheduled_value.toFixed(2),
        i.change_orders.toFixed(2),
        i.previous_applications.toFixed(2),
        i.this_period.toFixed(2),
        i.materials_stored.toFixed(2),
        sovCompleted(i).toFixed(2),
        sovPercent(i).toFixed(1),
        (sovContract(i) - sovCompleted(i)).toFixed(2),
        i.retainage_percentage,
      ])
    );

  const columns: DataTableColumn<SovRow>[] = [
    { id: 'item', header: '#', value: (r) => r.item_number, cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.item_number}</span> },
    {
      id: 'desc',
      header: 'Description of work',
      value: (r) => `${r.description} ${r.category} ${r.subcategory || ''}`,
      cell: (r) => (
        <div className="min-w-0 max-w-sm">
          <p className="truncate font-medium">{r.description}</p>
          <p className="truncate text-xs text-muted-foreground">{[r.category, r.subcategory].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    { id: 'scheduled', header: 'Scheduled', align: 'right', value: (r) => r.scheduled_value, cell: (r) => <span className="tabular-nums">{money(r.scheduled_value)}</span> },
    {
      id: 'changes',
      header: 'Changes',
      align: 'right',
      value: (r) => r.change_orders,
      cell: (r) => (r.change_orders ? <span className="tabular-nums">{money(r.change_orders)}</span> : <span className="text-muted-foreground">—</span>),
    },
    { id: 'completed', header: 'Completed', align: 'right', value: (r) => sovCompleted(r), cell: (r) => <span className="tabular-nums">{money(sovCompleted(r))}</span> },
    {
      id: 'pct',
      header: 'Progress',
      value: (r) => sovPercent(r),
      cell: (r) => {
        const p = sovPercent(r);
        return (
          <div className="flex min-w-[120px] items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full', p >= 100 ? 'bg-emerald-500' : 'bg-blue-600')} style={{ width: `${p}%` }} />
            </div>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{p.toFixed(0)}%</span>
          </div>
        );
      },
    },
    {
      id: 'balance',
      header: 'Balance',
      align: 'right',
      value: (r) => sovContract(r) - sovCompleted(r),
      cell: (r) => <span className="font-semibold tabular-nums">{money(sovContract(r) - sovCompleted(r))}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      cell: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Edit"
            onClick={() => {
              setSelectedSOVItem(r);
              setEditDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => setConfirmDelete(r)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout hideTitle title="Schedule of Values" subtitle="Manage project schedule of values and track completion">
      <div className="space-y-6">
        <PageHero
          eyebrow="Billing setup"
          title={project ? project.name : 'Schedule of Values'}
          subtitle={
            project
              ? [project.client, `${sovItems.length} line${sovItems.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')
              : 'Break the contract into billable lines. Each payment application bills progress against these lines.'
          }
          actions={
            selectedProject ? (
              <>
                <button type="button" className={heroButton} onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Add line
                </button>
                <button type="button" className={heroButton} onClick={startImport} disabled={!bidLines}>
                  <Import className="h-4 w-4" /> Pull from bid{bidLines ? ` (${bidLines})` : ''}
                </button>
                <ExportMenu
                  variant="hero"
                  options={[
                    {
                      label: 'Schedule of Values (PDF)',
                      hint: 'Client-ready, with progress and balance',
                      format: 'pdf',
                      disabled: !sovItems.length || !project,
                      onSelect: async () => {
                        await generateSovReport(project, sovItems, totals.contingency);
                        toast.success('Schedule of Values PDF downloaded');
                      },
                    },
                    { label: 'Lines (CSV)', hint: 'For Excel or your accountant', format: 'csv', disabled: !sovItems.length, onSelect: exportCsv },
                  ]}
                />
              </>
            ) : (
              <Link to="/payment-applications" className={heroButton}>
                <FileCheck2 className="h-4 w-4" /> Payment applications
              </Link>
            )
          }
          stats={
            project
              ? [
                  { label: 'Contract value', value: money0(totals.contract + totals.contingency) },
                  { label: 'Completed', value: money0(totals.completed), tone: totals.completed ? 'good' : undefined },
                  { label: 'Complete', value: `${totals.pct.toFixed(0)}%` },
                ]
              : []
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <Target className="h-4 w-4 text-orange-300" />
            {loading ? (
              <Skeleton className="h-10 w-full max-w-md bg-white/10" />
            ) : (
              <Select value={selectedProject} onValueChange={selectProject}>
                <SelectTrigger className="w-full max-w-md border-white/15 bg-white/10 text-white [&>span]:truncate">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.client || p.status}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </PageHero>

        <WorkflowStepper
          projectId={selectedProject}
          next={
            selectedProject
              ? {
                  label: 'Bill progress on these lines',
                  description: `Opens a new payment application with all ${sovItems.length} lines ready to fill in for this period.`,
                  disabled: !sovItems.length,
                  disabledReason: 'Add lines (or pull them from the bid) first, then bill progress against them.',
                  onClick: () => navigate(`/payment-applications/create/${selectedProject}`),
                }
              : undefined
          }
        />

        {!selectedProject ? (
          !loading && projects.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Create a project first"
              description="A Schedule of Values belongs to a project. Add the job, then set up its billing lines here."
              action={{ label: 'Go to Projects', to: '/projects', icon: Building2 }}
            />
          ) : (
            <EmptyState
              icon={ListChecks}
              title="Pick a project"
              description="Choose a project in the banner above to see and edit its Schedule of Values."
              steps={['Pick the project', 'Pull lines from the bid or approved proposal, or add them by hand', 'Bill progress with a payment application']}
            />
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
              <AccentStat label="Scheduled value" value={money0(totals.scheduled)} icon={ClipboardList} accent="blue" loading={itemsLoading} hint={`${sovItems.length} lines`} />
              <AccentStat
                label="Change orders"
                value={money0(totals.changes)}
                icon={Coins}
                accent="indigo"
                loading={itemsLoading}
                hint={totals.contingency ? `+ ${money0(totals.contingency)} contingency` : 'Approved changes'}
              />
              <AccentStat label="Completed & stored" value={money0(totals.completed)} icon={Wallet} accent="emerald" loading={itemsLoading} hint={`${money0(totals.stored)} materials stored`} />
              <AccentStat label="Balance to finish" value={money0(totals.contract + totals.contingency - totals.completed)} icon={Percent} accent="amber" loading={itemsLoading} hint={`${totals.pct.toFixed(1)}% complete`} />
              <AccentStat
                label="Retainage held"
                value={money0(totals.retainage)}
                icon={Landmark}
                accent="slate"
                loading={itemsLoading}
                hint="On work completed"
                className="col-span-2 lg:col-span-1"
              />
            </div>

            <DataTable
              columns={columns}
              rows={sovItems}
              getRowId={(r) => r.id}
              loading={itemsLoading}
              searchPlaceholder="Search lines…"
              initialSort={{ id: 'item' }}
              pageSize={50}
              onRowClick={(r) => {
                setSelectedSOVItem(r);
                setEditDialogOpen(true);
              }}
              footer={(rows) =>
                rows.length ? (
                  <>
                    <TableCell />
                    <TableCell>Totals</TableCell>
                    <TableCell className="text-right tabular-nums">{money(rows.reduce((s, r) => s + r.scheduled_value, 0))}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(rows.reduce((s, r) => s + r.change_orders, 0))}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(rows.reduce((s, r) => s + sovCompleted(r), 0))}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{totals.pct.toFixed(0)}% overall</TableCell>
                    <TableCell className="text-right tabular-nums">{money(rows.reduce((s, r) => s + sovContract(r) - sovCompleted(r), 0))}</TableCell>
                    <TableCell />
                  </>
                ) : null
              }
              empty={
                <EmptyState
                  icon={ListChecks}
                  title="No lines yet"
                  description={
                    bidLines
                      ? `This project has a bid with ${bidLines} line${bidLines === 1 ? '' : 's'}. Pull them in to start, or add lines by hand. Approved proposals tied to this project also add their lines here.`
                      : 'Add the billable lines for this contract, or build a bid in the Bid Planner and pull it in.'
                  }
                  action={bidLines ? { label: 'Pull lines from bid', onClick: startImport, icon: Import } : { label: 'Add line', onClick: () => setCreateDialogOpen(true), icon: Plus }}
                  secondaryAction={bidLines ? { label: 'Add line by hand', onClick: () => setCreateDialogOpen(true) } : { label: 'Open Bid Planner', to: `/bid-planner?project=${selectedProject}` }}
                />
              }
            />
          </>
        )}
      </div>

      <CreateSOVDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} projectId={selectedProject} onSave={fetchSOVItems} />
      <EditSOVItemDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} sovItem={selectedSOVItem} onSave={fetchSOVItems} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this line?</AlertDialogTitle>
            <AlertDialogDescription>
              Line {confirmDelete?.item_number}, "{confirmDelete?.description}", will be removed from the Schedule of Values.
              {confirmDelete && sovCompleted(confirmDelete) > 0 ? ' It already has billed progress, which will no longer show on future payment applications.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) deleteItem(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmImport} onOpenChange={(o) => !o && setConfirmImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pull the bid into this Schedule of Values?</AlertDialogTitle>
            <AlertDialogDescription>
              This project already has {confirmImport?.total} line{confirmImport?.total === 1 ? '' : 's'}.
              {confirmImport?.billed
                ? ` ${confirmImport.billed} of them have billed progress and will always be kept.`
                : ' None have been billed yet.'}{' '}
              Replace the unbilled lines with the current bid, or add the bid lines below them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmImport(null);
                doImport(false);
              }}
            >
              Add below
            </Button>
            <AlertDialogAction
              onClick={() => {
                setConfirmImport(null);
                doImport(true);
              }}
            >
              Replace unbilled lines
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
