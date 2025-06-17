
import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProfessionalProjectReport } from '@/components/reports/ProfessionalProjectReport';
import type { Project } from '@/types';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [fieldLeaderFilter, setFieldLeaderFilter] = useState<string>('all');
  const [showReports, setShowReports] = useState(false);

  // Get unique field leaders for filter
  const fieldLeaders = useMemo(() => {
    const leaders = [...new Set(projects.map(p => p.fieldLeader).filter(Boolean))] as string[];
    return leaders;
  }, [projects]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter, typeFilter, fieldLeaderFilter]);

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
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      })) as Project[];
      
      setProjects(typedData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

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

    if (typeFilter !== 'all') {
      filtered = filtered.filter(project => project.type === typeFilter);
    }

    if (fieldLeaderFilter !== 'all') {
      filtered = filtered.filter(project => project.fieldLeader === fieldLeaderFilter);
    }

    setFilteredProjects(filtered);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      // First delete related records to avoid foreign key constraints
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('project_id', projectId);

      if (expensesError) throw expensesError;

      // Delete other related records
      const { error: billingError } = await supabase
        .from('project_billing')
        .delete()
        .eq('project_id', projectId);

      if (billingError) throw billingError;

      const { error: sovError } = await supabase
        .from('sov_items')
        .delete()
        .eq('project_id', projectId);

      if (sovError) throw sovError;

      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId);

      if (tasksError) throw tasksError;

      // Finally delete the project
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (projectError) throw projectError;

      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  if (loading) {
    return (
      <Layout title="Projects" subtitle="Manage your construction projects">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (showReports) {
    return (
      <Layout title="Project Reports" subtitle="Professional project reports">
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
            totalExpenses={{}}
            totalBilled={{}}
            totalReceived={{}}
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
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
            <Button variant="outline" onClick={() => setShowReports(true)}>
              Professional Reports
            </Button>
            <NewProjectDialog onProjectCreated={fetchProjects} />
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              showDeleteButton={true}
              onDelete={handleDeleteProject}
              onUpdate={fetchProjects}
              totalExpenses={0}
              totalBilled={0}
              totalReceived={0}
            />
          ))}

          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              {projects.length === 0 ? (
                <div>
                  <p className="text-lg mb-4">No projects yet</p>
                  <NewProjectDialog onProjectCreated={fetchProjects} />
                </div>
              ) : (
                <p>No projects found matching your criteria</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
