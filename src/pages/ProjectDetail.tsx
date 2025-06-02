import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';
import { 
  Calendar, 
  MapPin, 
  User, 
  DollarSign, 
  TrendingUp, 
  ArrowLeft,
  Clock,
  CheckCircle,
  Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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

      setProject({
        id: data.id,
        name: data.name,
        type: data.type,
        contractValue: data.contract_value,
        status: data.status,
        startDate: data.start_date ? new Date(data.start_date) : new Date(),
        dueDate: data.due_date ? new Date(data.due_date) : new Date(),
        completionPercentage: data.completion_percentage || 0,
        address: data.address || '',
        projectCode: data.project_code || '',
        client: data.client || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
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
          <p className="text-gray-500">Project not found.</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-yellow-500';
      case 'Open': return 'bg-green-500';
      case 'Closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const mockFinancials = {
    totalExpenses: 1250000,
    totalBilled: 1400000,
    totalReceived: 1200000
  };

  return (
    <Layout 
      title={project.name}
      subtitle={`${project.type} • ${project.projectCode || 'No Code'}`}
    >
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Button>
          <EditProjectDialog project={project} onProjectUpdated={fetchProject} />
        </div>

        {/* Project Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
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
                ${project.contractValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.completionPercentage}%</div>
              <Progress value={project.completionPercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {format(project.dueDate, 'MMM dd, yyyy')}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium">{project.client || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{project.address || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">{format(project.startDate, 'MMM dd, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Project Code</p>
                  <p className="font-medium">{project.projectCode || 'Not assigned'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="burn-analysis">Burn Analysis</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="subcontractors">Subcontractors</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <DollarSign className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ${mockFinancials.totalExpenses.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cost to date
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ${mockFinancials.totalBilled.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Invoiced amount
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${mockFinancials.totalReceived.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Payments received
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Project Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Overall Completion</span>
                    <span className="text-sm text-muted-foreground">{project.completionPercentage}%</span>
                  </div>
                  <Progress value={project.completionPercentage} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div>
                      <p className="text-sm text-gray-500">Phase</p>
                      <p className="font-medium">Construction</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Days Remaining</p>
                      <p className="font-medium">45 days</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Budget Utilization</p>
                      <p className="font-medium">78%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Project Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Schedule management and timeline view will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Project Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Expense tracking and approval workflow will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="change-orders">
            <Card>
              <CardHeader>
                <CardTitle>Change Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Change order management will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Project Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Document management system will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="burn-analysis">
            <Card>
              <CardHeader>
                <CardTitle>Burn Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Budget burn rate and cost analysis will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment">
            <Card>
              <CardHeader>
                <CardTitle>Project Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Equipment allocation and tracking will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subcontractors">
            <Card>
              <CardHeader>
                <CardTitle>Subcontractors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Subcontractor management will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
