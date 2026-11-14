import { useState, useEffect, useMemo } from 'react';
import { normalizeProjectStatus } from '@/lib/projectStatus';
import { EmptyState } from '@/components/ui/empty-state';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FolderOpen, Archive, LayoutGrid, List, FileBarChart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProfessionalProjectReport } from '@/components/reports/ProfessionalProjectReport';
import { toast } from 'sonner';
import { fetchAll } from '@/lib/fetchAll';
import { PageHero, heroButton } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { Briefcase, CircleDollarSign, Landmark, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** "2026-03-01" as local midnight; plain new Date() reads it as UTC and shows a day early in the US. */
/** Missing dates stay undefined: an Invalid Date makes date-fns format() throw and blanks the page. */
const parseDay = (v?: string | null): Date => (v ? new Date(`${v.slice(0, 10)}T00:00:00`) : (undefined as unknown as Date));
const hasDate = (d?: Date | null) => !!d && !isNaN(d.getTime()) && d.getFullYear() > 1970;
const STATUS_CHIPS = [
  ['Active', 'Active'],
  ['open', 'All open'],
  ['Planning', 'Planning'],
  ['On Hold', 'On hold'],
  ['Completed', 'Completed'],
  ['Closed', 'Closed'],
  ['all', 'Everything'],
] as const;
import type { Project } from '@/types';

const statusTone: Record<string, string> = {
  Active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Planning: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  'On Hold': 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

const money = (n: number) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [fieldLeaderFilter, setFieldLeaderFilter] = useState<string>('all');
  const [showReports, setShowReports] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();
  const [view, setView] = useState<'cards' | 'table'>(() => {
    try { return localStorage.getItem('rbf.projects.view') === 'table' ? 'table' : 'cards'; } catch { return 'cards'; }
  });
  const changeView = (v: 'cards' | 'table') => {
    setView(v);
    try { localStorage.setItem('rbf.projects.view', v); } catch { /* ignore */ }
  };

  const [projectExpenses, setProjectExpenses] = useState<Record<string, number>>({});
  const [projectBilled, setProjectBilled] = useState<Record<string, number>>({});
  const [projectReceived, setProjectReceived] = useState<Record<string, number>>({});
  const [entries, setEntries] = useState<{
    expenses: { project_id: string; amount: number; date: string | null }[];
    billing: { project_id: string; billed: number; paid: number; date: string | null }[];
    changeOrders?: { project_id: string; amount: number; status: string | null; date: string | null }[];
  }>();

  const fieldLeaders = useMemo(() => {
    const leaders = [...new Set(projects.map(p => p.fieldLeader).filter(Boolean))] as string[];
    return leaders;
  }, [projects]);

  useEffect(() => {
    fetchProjects();
    fetchFinancialData();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter, fieldLeaderFilter, showArchived]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        contractValue: item.contract_value || 0,
        status: normalizeProjectStatus(item.status) as Project['status'],
        startDate: parseDay(item.start_date),
        dueDate: parseDay(item.due_date),
        completionPercentage: item.completion_percentage || 0,
        address: item.address || '',
        projectCode: item.project_code || '',
        client: item.client || '',
        fieldLeader: item.field_leader || '',
        description: item.description || '',
        contingency_type: item.contingency_type || 'percentage',
        contingency_value: item.contingency_value || 0,
        estimatedProfit: (item as any).estimated_profit ?? null,
        archivedAt: (item as any).archived_at ? new Date((item as any).archived_at) : null,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      })) as Project[];

      setProjects(typedData);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialData = async () => {
    try {
      // Every row, not just the first 1,000 the API returns per request.
      const [allExpenses, billingData, coData] = await Promise.all([
        fetchAll<any>('expenses', 'id, project_id, amount, date, status'),
        fetchAll<any>('project_billing', 'id, project_id, billed_amount, paid_amount, invoice_date, billing_period_end'),
        fetchAll<any>('change_orders', 'id, project_id, amount, status, date').catch(() => [] as any[]),
      ]);
      // Rejected expenses aren't costs.
      const expensesData = allExpenses.filter((e: any) => e.status !== 'Rejected');

      setEntries({
        expenses: expensesData.map((e: any) => ({ project_id: e.project_id, amount: Number(e.amount) || 0, date: e.date })),
        changeOrders: coData.map((c: any) => ({ project_id: c.project_id, amount: Number(c.amount) || 0, status: c.status, date: c.date })),
        billing: (billingData || []).map((b: any) => ({
          project_id: b.project_id,
          billed: Number(b.billed_amount) || 0,
          paid: Number(b.paid_amount) || 0,
          date: b.invoice_date || b.billing_period_end,
        })),
      });

      const expensesByProject: Record<string, number> = {};
      const billedByProject: Record<string, number> = {};
      const receivedByProject: Record<string, number> = {};

      expensesData?.forEach(expense => {
        if (expense.project_id) {
          expensesByProject[expense.project_id] = (expensesByProject[expense.project_id] || 0) + (expense.amount || 0);
        }
      });

      billingData?.forEach(billing => {
        if (billing.project_id) {
          billedByProject[billing.project_id] = (billedByProject[billing.project_id] || 0) + (billing.billed_amount || 0);
          receivedByProject[billing.project_id] = (receivedByProject[billing.project_id] || 0) + (billing.paid_amount || 0);
        }
      });

      setProjectExpenses(expensesByProject);
      setProjectBilled(billedByProject);
      setProjectReceived(receivedByProject);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  };

  const filterProjects = () => {
    let filtered = projects.filter(p => showArchived ? !!p.archivedAt : !p.archivedAt);

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === 'open') {
      filtered = filtered.filter(project => project.status !== 'Completed' && project.status !== 'Closed');
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    if (fieldLeaderFilter !== 'all') {
      filtered = filtered.filter(project => project.fieldLeader === fieldLeaderFilter);
    }

    setFilteredProjects(filtered);
  };

  const handleArchiveProject = async (projectId: string, archive: boolean) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ archived_at: archive ? new Date().toISOString() : null } as any)
        .eq('id', projectId);
      if (error) throw error;
      toast.success(archive ? 'Project archived' : 'Project restored');
      fetchProjects();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update project');
    }
  };

  /** Tables that hang off a project. Only needed until the cascade migration is applied. */
  const PROJECT_CHILD_TABLES = [
    'project_billing', 'expenses', 'sov_items', 'tasks', 'equipment_reservations', 'project_subcontractors',
    'burn_records', 'budget_alerts', 'budget_forecasts', 'budget_variances', 'equipment_usage_logs',
    'change_orders', 'invoices', 'payment_applications_g702', 'payment_app_lien_waivers', 'bid_items',
    'bid_packages', 'subcontractor_groups', 'time_entries', 'permits', 'daily_logs', 'rfis', 'submittals', 'commitments',
  ] as const;
  const PROJECT_DETACH: [string, string][] = [
    ['documents', 'project_id'], ['calendar_events', 'project_id'], ['equipment', 'project_assignment_id'],
    ['proposals', 'project_id'], ['estimates', 'project_id'], ['profiles', 'project_id'],
  ];

  const deleteProjectRow = async (projectId: string) => {
    const { data, error } = await supabase.from('projects').delete().eq('id', projectId).select('id');
    return { deleted: (data || []).length > 0, error };
  };

  const handleDeleteProject = async (projectId: string) => {
    const name = projects.find((p) => p.id === projectId)?.name || 'This project';
    try {
      let { deleted, error } = await deleteProjectRow(projectId);

      // 23503 = other records still point at the project. Clear them and retry.
      if (error?.code === '23503') {
        const { data: bills } = await supabase.from('project_billing').select('id').eq('project_id', projectId);
        const billIds = (bills || []).map((b) => b.id);
        if (billIds.length) await supabase.from('billing_line_items').delete().in('billing_id', billIds);
        for (const [table, col] of PROJECT_DETACH) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from(table as any).update({ [col]: null } as any).eq(col, projectId);
        }
        for (const table of PROJECT_CHILD_TABLES) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from(table as any).delete().eq('project_id', projectId);
        }
        ({ deleted, error } = await deleteProjectRow(projectId));
      }

      if (error) {
        console.error('Error deleting project:', error);
        const blocker = error.code === '23503' ? /on table "(\w+)"/.exec(error.details || error.message)?.[1] : null;
        toast.error(
          blocker
            ? `${name} still has records in "${blocker.replace(/_/g, ' ')}" that block deleting it. Archive it instead, or ask an admin to apply the latest database update.`
            : `Could not delete ${name}: ${error.message}`
        );
        return;
      }
      if (!deleted) {
        toast.error(`${name} was not deleted. Your account may not have permission to delete projects; archive it instead.`);
        return;
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast.success(`${name} deleted`);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project. Please try again.');
    }
  };

  if (loading) {
    return (
      <Layout title="Projects" subtitle="Manage your construction projects">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
            <div className="flex gap-4 flex-1 flex-wrap">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[420px] rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (showReports) {
    return (
      <Layout hideTitle title="Report Snapshot">
        <div className="space-y-6">
          <ProfessionalProjectReport
            toolbarStart={
              <Button variant="outline" onClick={() => setShowReports(false)}>
                Back to Projects
              </Button>
            }
            entries={entries}
            projects={projects.filter((p) => !p.archivedAt).map(p => ({
              id: p.id,
              name: p.name,
              client: p.client,
              status: p.status,
              start_date: hasDate(p.startDate) ? format(p.startDate, 'yyyy-MM-dd') : '',
              due_date: hasDate(p.dueDate) ? format(p.dueDate, 'yyyy-MM-dd') : '',
              contract_value: p.contractValue,
              completion_percentage: p.completionPercentage,
              description: p.description,
              field_leader: p.fieldLeader,
              address: p.address,
              project_code: p.projectCode,
              type: p.type
            }))}
            totalExpenses={projectExpenses}
            totalBilled={projectBilled}
            totalReceived={projectReceived}
          />
        </div>
      </Layout>
    );
  }

  const columns: DataTableColumn<Project>[] = [
    {
      id: 'name',
      header: 'Project',
      value: (p) => p.name,
      cell: (p) => (
        <div className="min-w-[180px]">
          <Link to={`/projects/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link>
          <div className="text-xs text-muted-foreground truncate">{p.client || 'No client'}</div>
        </div>
      ),
    },
    { id: 'status', header: 'Status', value: (p) => p.status, cell: (p) => <Badge variant="secondary" className={statusTone[p.status] || ''}>{p.status}</Badge> },
    { id: 'leader', header: 'Field leader', value: (p) => p.fieldLeader, cell: (p) => p.fieldLeader || '—' },
    {
      id: 'due',
      header: 'Due',
      value: (p) => (hasDate(p.dueDate) ? p.dueDate : null),
      cell: (p) => (hasDate(p.dueDate) ? format(p.dueDate, 'MMM d, yyyy') : '—'),
    },
    {
      id: 'progress',
      header: 'Complete',
      value: (p) => p.completionPercentage,
      cell: (p) => (
        <div className="flex w-28 items-center gap-2">
          <Progress value={p.completionPercentage} className="h-1.5" />
          <span className="w-9 text-right text-xs tabular-nums">{p.completionPercentage}%</span>
        </div>
      ),
    },
    { id: 'contract', header: 'Contract', align: 'right', value: (p) => p.contractValue, cell: (p) => money(p.contractValue) },
    { id: 'billed', header: 'Billed', align: 'right', value: (p) => projectBilled[p.id] || 0, cell: (p) => money(projectBilled[p.id] || 0) },
    { id: 'costs', header: 'Costs', align: 'right', value: (p) => projectExpenses[p.id] || 0, cell: (p) => money(projectExpenses[p.id] || 0) },
    {
      id: 'owed',
      header: 'Owed to you',
      align: 'right',
      value: (p) => (projectBilled[p.id] || 0) - (projectReceived[p.id] || 0),
      cell: (p) => {
        const owed = (projectBilled[p.id] || 0) - (projectReceived[p.id] || 0);
        return <span className={owed > 0 ? 'font-semibold' : 'text-muted-foreground'}>{money(owed)}</span>;
      },
    },
  ];

  const emptyProjects = (
    <EmptyState
      icon={FolderOpen}
      title="Create your first project"
      description="A project is one job. Everything else (schedule, costs, change orders, billing, documents) hangs off it, so this is the place to start."
      actionSlot={<NewProjectDialog onProjectCreated={fetchProjects} />}
      secondaryAction={{ label: 'Start from an estimate', icon: Search, to: '/estimating' }}
      steps={['Enter the client, address and contract value', 'Open the project and follow its Next step guide', 'Track costs and bill from the job page']}
    />
  );

  const filterControls = (
    <>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="open">All open (planning, active, on hold)</SelectItem>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="Planning">Planning</SelectItem>
          <SelectItem value="On Hold">On Hold</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
          <SelectItem value="Closed">Closed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={fieldLeaderFilter} onValueChange={setFieldLeaderFilter}>
        <SelectTrigger className="w-48"><SelectValue placeholder="All field leaders" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All field leaders</SelectItem>
          {fieldLeaders.map((leader) => (
            <SelectItem key={leader} value={leader}>{leader}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant={showArchived ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowArchived((v) => !v)}>
        <Archive className="w-4 h-4" />
        {showArchived ? 'Showing archived' : 'Archived'}
      </Button>
    </>
  );

  const viewToggle = (
    <div className="inline-flex rounded-lg border bg-card p-0.5" role="group" aria-label="View">
      {([['cards', LayoutGrid, 'Cards'], ['table', List, 'Table']] as const).map(([v, Icon, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => changeView(v)}
          aria-pressed={view === v}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Icon className="h-4 w-4" />{label}
        </button>
      ))}
    </div>
  );

  const live = projects.filter((p) => !p.archivedAt);
  const statusCount = (k: string) =>
    k === 'all' ? live.length : k === 'open' ? live.filter((p) => p.status !== 'Completed' && p.status !== 'Closed').length : live.filter((p) => p.status === k).length;
  const activeJobs = live.filter((p) => p.status === 'Active');
  const sum = (list: Project[], f: (p: Project) => number) => list.reduce((a, p) => a + f(p), 0);
  const activeContract = sum(activeJobs, (p) => p.contractValue || 0);
  const activeBilled = sum(activeJobs, (p) => projectBilled[p.id] || 0);
  const activeOwed = sum(activeJobs, (p) => Math.max(0, (projectBilled[p.id] || 0) - (projectReceived[p.id] || 0)));
  const today = new Date();
  const pastDue = activeJobs.filter((p) => hasDate(p.dueDate) && p.dueDate < today && (p.completionPercentage || 0) < 100);
  const avgDone = activeJobs.length ? Math.round(sum(activeJobs, (p) => p.completionPercentage || 0) / activeJobs.length) : 0;

  return (
    <Layout hideTitle title="Projects">
      <div className="space-y-6">
      <PageHero
        eyebrow="Overview"
        title="Projects"
        subtitle="Every job, its progress and where the money stands."
        actions={
          <>
            <span className="contents [&_button]:border-white/15 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/20">
              <NewProjectDialog onProjectCreated={fetchProjects} />
            </span>
            <button type="button" className={heroButton} onClick={() => setShowReports(true)}>
              <FileBarChart className="h-4 w-4" /> Project performance
            </button>
          </>
        }
        stats={[
          { label: 'Active jobs', value: String(activeJobs.length) },
          { label: 'Average complete', value: `${avgDone}%` },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <AccentStat label="Active jobs" value={activeJobs.length} icon={Briefcase} accent="blue" hint={`${statusCount('Planning')} planning · ${statusCount('On Hold')} on hold`} />
        <AccentStat label="Active contract value" value={money(activeContract)} icon={CircleDollarSign} accent="indigo" hint={`${money(Math.max(0, activeContract - activeBilled))} left to bill`} />
        <AccentStat label="Owed to you" value={money(activeOwed)} icon={Landmark} accent="emerald" hint="Billed, not yet paid (active jobs)" />
        <AccentStat
          label="Past due"
          value={pastDue.length}
          icon={AlertTriangle}
          accent="rose"
          tone={pastDue.length ? 'bad' : 'good'}
          hint={pastDue.length ? pastDue.slice(0, 2).map((p) => p.name).join(', ') : 'All active jobs on time'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_CHIPS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setStatusFilter(k)}
            aria-pressed={statusFilter === k}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
              statusFilter === k ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
            <span className={cn('rounded-full px-1.5 text-xs tabular-nums', statusFilter === k ? 'bg-white/20' : 'bg-muted')}>{statusCount(k)}</span>
          </button>
        ))}
        <div className="ml-auto">{viewToggle}</div>
      </div>

      {view === 'table' ? (
        <DataTable
          columns={columns}
          rows={filteredProjects}
          totalCount={projects.length}
          getRowId={(p) => p.id}
          searchable={false}
          filters={
            <>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search projects…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              {filterControls}
            </>
          }
          exportFilename="projects"
          initialSort={{ id: 'name' }}
          onRowClick={(p) => navigate(`/projects/${p.id}`)}
          empty={emptyProjects}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search projects…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap items-center gap-2">{filterControls}</div>
            <span className="text-xs text-muted-foreground sm:ml-auto">
              {filteredProjects.length === projects.length ? `${projects.length} projects` : `${filteredProjects.length} of ${projects.length}`}
            </span>
          </div>

          {filteredProjects.length === 0 ? (
            projects.length === 0 ? emptyProjects : (
              <EmptyState icon={Search} filtered title="" description="" onClearFilters={() => { setSearchTerm(''); setStatusFilter('all'); setFieldLeaderFilter('all'); }} />
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  showDeleteButton={true}
                  onDelete={handleDeleteProject}
                  onUpdate={fetchProjects}
                  onArchive={handleArchiveProject}
                  totalExpenses={projectExpenses[project.id] || 0}
                  totalBilled={projectBilled[project.id] || 0}
                  totalReceived={projectReceived[project.id] || 0}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </Layout>
  );
}
