import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Project as ProjectType } from '@/types';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';

interface Project extends ProjectType {}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    if (!id) {
      toast.error('Project ID is missing.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setProject(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project details.');
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    await fetchProject();
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Planning':
        return 'bg-yellow-500';
      case 'Open':
        return 'bg-green-500';
      case 'Closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleViewBurnAnalysis = () => {
    navigate(`/burn-analysis?project=${id}`);
  };

  if (loading) {
    return (
      <Layout title="Project Details" subtitle="Loading project details...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout title="Project Details" subtitle="Project not found">
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-gray-500">Project not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={project?.name || 'Project Details'} subtitle={`${project?.type} • ${project?.status}`}>
      <div className="space-y-6">
        {/* Project Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={`${getStatusColor(project.status)} text-white`}>
                    {project.status}
                  </Badge>
                  <span className="text-sm text-gray-500">#{project.projectCode || 'No Code'}</span>
                </div>
                <CardTitle className="text-2xl">{project.name}</CardTitle>
                <p className="text-gray-600 mt-1">{project.type}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleViewBurnAnalysis}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Burn Analysis
                </Button>
                <Button onClick={() => setShowEditDialog(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Project
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${project.contractValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total contract value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Start Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{format(new Date(project.startDate), 'MMM dd, yyyy')}</div>
              <p className="text-xs text-muted-foreground">
                Project start date
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{format(new Date(project.dueDate), 'MMM dd, yyyy')}</div>
              <p className="text-xs text-muted-foreground">
                Project due date
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`${activeTab === 'details'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Details
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'overview' && (
              <Card>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Project Overview</h3>
                      <p className="text-gray-600">{project.description || 'No description provided.'}</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold">Client Information</h3>
                      <p className="text-gray-600">Client: {project.client || 'No client specified'}</p>
                      <p className="text-gray-600">Address: {project.address || 'No address specified'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'details' && (
              <Card>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Project Details</h3>
                      <p className="text-gray-600">Type: {project.type || 'No type specified'}</p>
                      <p className="text-gray-600">Code: {project.projectCode || 'No code specified'}</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold">Dates</h3>
                      <p className="text-gray-600">Start Date: {format(new Date(project.startDate), 'MMM dd, yyyy')}</p>
                      <p className="text-gray-600">Due Date: {format(new Date(project.dueDate), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <EditProjectDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        project={project}
        onUpdate={handleUpdate}
      />
    </Layout>
  );
}
