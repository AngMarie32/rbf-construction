import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FolderOpen, Archive } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProfessionalProjectReport } from '@/components/reports/ProfessionalProjectReport';
import { toast } from 'sonner';
import type { Project } from '@/types';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fieldLeaderFilter, setFieldLeaderFilter] = useState<string>('all');
  const [showReports, setShowReports] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
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

    if (statusFilter !== 'all') {
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

  const handleDeleteProject = async (projectId: string) => {
    try {
      console.log('Deleting project:', projectId);
      
      const { error: billingLineItemsError } = await supabase
        .from('billing_line_items')
        .delete()
        .eq('billing_id', projectId);
      
      const { error: projectBillingError } = await supabase
        .from('project_billing')
        .delete()
        .eq('project_id', projectId);
      
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('project_id', projectId);
      
      const { error: sovItemsError } = await supabase
        .from('sov_items')
        .delete()
        .eq('project_id', projectId);
      
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId);
      
      const { error: equipmentReservationsError } = await supabase
        .from('equipment_reservations')
        .delete()
        .eq('project_id', projectId);
      
      const { error: projectSubcontractorsError } = await supabase
        .from('project_subcontractors')
        .delete()
        .eq('project_id', projectId);
      
      const { error: burnRecordsError } = await supabase
        .from('burn_records')
        .delete()
        .eq('project_id', projectId);
      
      const { error: budgetAlertsError } = await supabase
        .from('budget_alerts')
        .delete()
        .eq('project_id', projectId);
      
      const { error: budgetForecastsError } = await supabase
        .from('budget_forecasts')
        .delete()
        .eq('project_id', projectId);
      
      const { error: budgetVariancesError } = await supabase
        .from('budget_variances')
        .delete()
        .eq('project_id', projectId);

      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (projectError) {
        console.error('Error deleting project:', projectError);
        throw projectError;
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success('Project deleted successfully');
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

  return (
    <Layout title="Projects" subtitle="Manage your construction projects">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="flex gap-4 flex-1 flex-wrap">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={fieldLeaderFilter} onValueChange={setFieldLeaderFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Field Leaders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Field Leaders</SelectItem>
                {fieldLeaders.map(leader => (
                  <SelectItem key={leader} value={leader}>
                    {leader}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant={showArchived ? 'default' : 'outline'}
              onClick={() => setShowArchived(v => !v)}
            >
              <Archive className="w-4 h-4 mr-2" />
              {showArchived ? 'Showing Archived' : 'Archived'}
            </Button>
            <Button variant="outline" onClick={() => setShowReports(true)}>
              Report Snapshot
            </Button>
            <NewProjectDialog onProjectCreated={fetchProjects} />
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, idx) => (
            <div key={project.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'backwards' }}>
              <ProjectCard 
                project={project} 
                showDeleteButton={true}
                onDelete={handleDeleteProject}
                onUpdate={fetchProjects}
                onArchive={handleArchiveProject}
                totalExpenses={projectExpenses[project.id] || 0}
                totalBilled={projectBilled[project.id] || 0}
                totalReceived={projectReceived[project.id] || 0}
              />
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-16">
              {projects.length === 0 ? (
                <div className="space-y-4">
                  <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/40" />
                  <p className="text-lg text-muted-foreground">No projects yet</p>
                  <NewProjectDialog onProjectCreated={fetchProjects} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground">No projects found matching your criteria</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
