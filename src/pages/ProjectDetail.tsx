import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  BarChart3,
  Truck,
  Users,
  Building,
  ClipboardList,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Project } from '@/types';

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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const mappedProject: Project = {
          id: data.id,
          name: data.name,
          type: data.type,
          contractValue: data.contract_value,
          status: data.status as Project['status'],
          startDate: data.start_date ? new Date(data.start_date) : new Date(),
          dueDate: data.due_date ? new Date(data.due_date) : new Date(),
          completionPercentage: data.completion_percentage || 0,
          address: data.address || '',
          projectCode: data.project_code || '',
          client: data.client || '',
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        };
        setProject(mappedProject);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-blue-100 text-blue-800';
      case 'Open': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout title="Loading..." subtitle="">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout title="Project Not Found" subtitle="">
        <div className="text-center py-8">
          <p className="text-gray-500">Project not found</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  // Mock financial data
  const expensesOccurred = project.contractValue * 0.3;
  const projectBilled = project.contractValue * 0.4;
  const amountReceived = project.contractValue * 0.35;
  const changeOrders = project.contractValue * 0.05;
  const currentContract = project.contractValue + changeOrders;

  return (
    <Layout title="" subtitle="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/projects')}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
                {project.projectCode && (
                  <span className="text-sm text-gray-500">#{project.projectCode}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                {project.client && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {project.client}
                  </span>
                )}
                {project.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {project.address}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {project.startDate.toLocaleDateString()} - {project.dueDate.toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {project.type}
                </span>
              </div>
            </div>
          </div>
          <EditProjectDialog 
            project={project} 
            onProjectUpdated={fetchProject}
          />
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="text-2xl font-bold">${project.contractValue.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Contract Value</div>
                <div className="text-xs text-gray-500">Original contract amount</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="text-2xl font-bold">${changeOrders.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Change Orders</div>
                <div className="text-xs text-gray-500">0 total change orders</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="text-2xl font-bold">${currentContract.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Current Contract</div>
                <div className="text-xs text-gray-500">Including all change orders</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="text-2xl font-bold">{project.completionPercentage}%</div>
                <div className="text-sm text-gray-600">Completion</div>
                <div className="text-xs text-gray-500">Current project progress</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="change-orders" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Change Orders
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="burn-analysis" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Burn Analysis
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="subcontractors" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Subcontractors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Description</div>
                    <div className="text-sm text-gray-600">No description provided</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Project Type</div>
                    <div className="text-sm text-gray-600">{project.type}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Location</div>
                    <div className="text-sm text-gray-600">{project.address || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Project Code</div>
                    <div className="text-sm text-gray-600">{project.projectCode || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Client</div>
                    <div className="text-sm text-gray-600">{project.client || 'Not specified'}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Start Date</div>
                    <div className="text-sm text-gray-600">{project.startDate.toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">End Date</div>
                    <div className="text-sm text-gray-600">{project.dueDate.toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Duration</div>
                    <div className="text-sm text-gray-600">
                      {Math.ceil((project.dueDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">Progress</div>
                    <div className="text-sm text-gray-600">{project.completionPercentage}%</div>
                    <Progress value={project.completionPercentage} className="mt-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">${expensesOccurred.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Expenses Occurred</div>
                      <div className="text-xs text-gray-500">30% of contract value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">${projectBilled.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Project Billed</div>
                      <div className="text-xs text-gray-500">40% of contract value</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">${amountReceived.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Amount Received</div>
                      <div className="text-xs text-gray-500">35% of contract value</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Project Schedule</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Project schedule management</p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Start Date: {project.startDate.toLocaleDateString()}</p>
                    <p className="text-sm text-gray-600">Due Date: {project.dueDate.toLocaleDateString()}</p>
                    <p className="text-sm text-gray-600">Progress: {project.completionPercentage}%</p>
                  </div>
                  <Button className="mt-4" onClick={() => navigate('/schedule')}>
                    Open Schedule Manager
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Project invoices will be displayed here</p>
                  <Button onClick={() => navigate('/invoices')}>
                    Go to Invoices
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="change-orders">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Change orders will be displayed here</p>
                  <Button onClick={() => navigate('/change-orders')}>
                    Go to Change Orders
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Project documents will be displayed here</p>
                  <Button onClick={() => navigate('/documents')}>
                    Go to Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="burn-analysis">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Burn rate analysis will be displayed here</p>
                  <Button onClick={() => navigate('/analytics')}>
                    Go to Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Project equipment will be displayed here</p>
                  <Button onClick={() => navigate('/equipment')}>
                    Go to Equipment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subcontractors">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Project subcontractors will be displayed here</p>
                  <Button onClick={() => navigate('/subcontractors')}>
                    Go to Subcontractors
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
