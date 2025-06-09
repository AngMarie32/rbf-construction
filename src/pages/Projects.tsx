import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Project } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DatabaseProject {
  id: string;
  name: string;
  type: string;
  contract_value: number;
  status: string;
  due_date: string | null;
  start_date: string | null;
  completion_percentage: number | null;
  address: string | null;
  project_code: string | null;
  client: string | null;
  created_at: string;
  updated_at: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedProjects: Project[] = (data || []).map((dbProject: DatabaseProject) => ({
        id: dbProject.id,
        name: dbProject.name,
        type: dbProject.type,
        contractValue: dbProject.contract_value,
        status: dbProject.status as Project['status'],
        dueDate: dbProject.due_date ? new Date(dbProject.due_date) : new Date(),
        startDate: dbProject.start_date ? new Date(dbProject.start_date) : new Date(),
        completionPercentage: dbProject.completion_percentage || 0,
        address: dbProject.address || '',
        projectCode: dbProject.project_code || '',
        client: dbProject.client || '',
        createdAt: new Date(dbProject.created_at),
        updatedAt: new Date(dbProject.updated_at)
      }));
      
      setProjects(mappedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    setFilteredProjects(filtered);
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return projects.length;
    return projects.filter(p => p.status === status).length;
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
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

  return (
    <Layout title="Projects Dashboard" subtitle="">
      <div className="space-y-6">
        {/* Status Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            className="rounded-full"
          >
            All Projects ({getStatusCount('all')})
          </Button>
          <Button
            variant={statusFilter === 'Planning' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('Planning')}
            className="rounded-full"
          >
            Planning ({getStatusCount('Planning')})
          </Button>
          <Button
            variant={statusFilter === 'Open' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('Open')}
            className="rounded-full"
          >
            Open ({getStatusCount('Open')})
          </Button>
          <Button
            variant={statusFilter === 'Closed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('Closed')}
            className="rounded-full"
          >
            Closed ({getStatusCount('Closed')})
          </Button>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button className="rounded-full">
              Sort by: Recent
            </Button>
            <NewProjectDialog onProjectCreated={fetchProjects} />
            <Button variant="outline" className="rounded-full">
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-sm text-gray-600">Total Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {projects.filter(p => p.status === 'Open').length}
              </div>
              <p className="text-sm text-gray-600">Active Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {projects.filter(p => p.status === 'Planning').length}
              </div>
              <p className="text-sm text-gray-600">In Planning</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                ${(projects.reduce((sum, p) => sum + p.contractValue, 0) / 1000000).toFixed(1)}M
              </div>
              <p className="text-sm text-gray-600">Total Value</p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid */}
        <div className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No projects match your filters' 
                  : 'No projects found. Create your first project to get started!'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <NewProjectDialog onProjectCreated={fetchProjects} />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div key={project.id} className="relative group">
                  <ProjectCard project={project} onUpdate={fetchProjects} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{project.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteProject(project.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
