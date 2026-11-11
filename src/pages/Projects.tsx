import { useState, useEffect, useMemo } from 'react';
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
  const [statusFilter, setStatusFilter] = useState<string>('open');
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
        status: item.status as Project['status'],
        startDate: item.start_date ? new Date(item.start_date) : new Date(),
        dueDate: item.due_date ? new Date(item.due_date) : new Date(),
        completionPercentage: item.completion_percentage || 0,
        address: item.address || '',
        projectCode: item.project_code || '',
        client: item.client || '',
        fieldLeader: item.field_leader || '',
        description: item.description || '',
        contingency_type: item.contingency_type || 'percentage',
        contingency_value: item.contingency_value || 0,
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
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('project_id, amount');
      
      const { data: billingData } = await supabase
        .from('project_billing')
        .select('project_id, billed_amount, paid_amount');
      
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
      <Layout title="Report Snapshot" subtitle="Project reports">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setShowReports(false)}>
              Back to Projects
            </Button>
          </div>
          <ProfessionalProjectReport
            projects={filteredProjects.map(p => ({
              id: p.id,
              name: p.name,
              client: p.client,
              status: p.status,
              start_date: p.startDate.toISOString(),
              due_date: p.dueDate.toISOString(),
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
      value: (p) => (p.dueDate && p.dueDate.getFullYear() > 1970 ? p.dueDate : null),
      cell: (p) => (p.dueDate && p.dueDate.getFullYear() > 1970 ? format(p.dueDate, 'MMM d, yyyy') : '—'),
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
          <SelectItem value="open">Open projects</SelectItem>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="Planning">Planning</SelectItem>
          <SelectItem value="Active">Active</SelectItem>
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

  return (
    <Layout
      title="Projects"
      subtitle="Every job, its progress and where the money stands"
      actions={
        <>
          {viewToggle}
          <Button variant="outline" onClick={() => setShowReports(true)}>
            <FileBarChart className="w-4 h-4" /> Report snapshot
          </Button>
          <NewProjectDialog onProjectCreated={fetchProjects} />
        </>
      }
    >
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
    </Layout>
  );
}
