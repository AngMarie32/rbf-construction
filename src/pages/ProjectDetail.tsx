import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Edit, 
  Calendar, 
  DollarSign, 
  Users, 
  FileText, 
  TrendingUp,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BurnAnalysisTab } from '@/components/projects/BurnAnalysisTab';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';

interface DatabaseProject {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  start_date?: string;
  due_date?: string;
  contract_value: number;
  completion_percentage: number;
  client?: string;
  address?: string;
  field_leader?: string;
  project_code?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  startDate?: string;
  dueDate?: string;
  contractValue: number;
  completionPercentage: number;
  client?: string;
  address?: string;
  fieldLeader?: string;
  projectCode?: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      console.log('Fetching project details for ID:', id);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        throw error;
      }

      if (data) {
        // Map database fields to camelCase interface
        const mappedProject: Project = {
          id: data.id,
          name: data.name,
          description: data.description,
          type: data.type,
          status: data.status,
          startDate: data.start_date,
          dueDate: data.due_date,
          contractValue: data.contract_value,
          completionPercentage: data.completion_percentage,
          client: data.client,
          address: data.address,
          fieldLeader: data.field_leader,
          projectCode: data.project_code
        };
        
        console.log('Project data loaded and mapped:', mappedProject);
        setProject(mappedProject);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project details');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectUpdate = () => {
    fetchProject();
    setEditDialogOpen(false);
  };

  if (loading) {
    return (
      <Layout title="Loading..." subtitle="Loading project details">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout title="Project Not Found" subtitle="The requested project could not be found">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">Project Not Found</h2>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Planning': return 'bg-blue-500';
      case 'On Hold': return 'bg-yellow-500';
      case 'Completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Layout 
      title={project.name} 
      subtitle={`${project.type} Project • ${project.status}`}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Project
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Project Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`${getStatusColor(project.status)} text-white`}>
                {project.status}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${project.contractValue?.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {project.completionPercentage || 0}%
              </div>
              <Progress value={project.completionPercentage || 0} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timeline</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {project.startDate && (
                  <div className="text-sm">
                    Start: {new Date(project.startDate).toLocaleDateString()}
                  </div>
                )}
                {project.dueDate && (
                  <div className="text-sm">
                    Due: {new Date(project.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {project.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{project.description}</p>
                  </div>
                )}
                {project.client && (
                  <div>
                    <h4 className="font-semibold mb-2">Client</h4>
                    <p className="text-muted-foreground">{project.client}</p>
                  </div>
                )}
                {project.projectCode && (
                  <div>
                    <h4 className="font-semibold mb-2">Project Code</h4>
                    <p className="text-muted-foreground">{project.projectCode}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {project.address && (
                  <div>
                    <h4 className="font-semibold mb-2">Address</h4>
                    <p className="text-muted-foreground">{project.address}</p>
                  </div>
                )}
                {project.fieldLeader && (
                  <div>
                    <h4 className="font-semibold mb-2">Field Leader</h4>
                    <p className="text-muted-foreground">{project.fieldLeader}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold mb-2">Type</h4>
                  <p className="text-muted-foreground">{project.type}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="burn-analysis">Burn Analysis</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm">Project created</p>
                        <p className="text-xs text-muted-foreground">
                          {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={() => navigate(`/schedule?project=${project.id}`)}>
                      <Calendar className="w-4 h-4 mr-2" />
                      View Schedule
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate(`/documents?project=${project.id}`)}>
                      <FileText className="w-4 h-4 mr-2" />
                      View Documents
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate(`/expenses?project=${project.id}`)}>
                      <DollarSign className="w-4 h-4 mr-2" />
                      View Expenses
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="burn-analysis">
            <BurnAnalysisTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Project Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Document management for this project will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Project Team</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Team management for this project will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EditProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        onProjectUpdated={handleProjectUpdate}
      />
    </Layout>
  );
}
