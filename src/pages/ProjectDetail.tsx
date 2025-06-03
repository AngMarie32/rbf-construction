
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';
import { NewBillingDialog } from '@/components/billing/NewBillingDialog';
import { 
  Calendar, 
  MapPin, 
  User, 
  DollarSign, 
  TrendingUp, 
  ArrowLeft,
  Clock,
  CheckCircle,
  Edit,
  Plus,
  FileText,
  Wrench,
  Users
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
  const [billingData, setBillingData] = useState<any[]>([]);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [projectSubcontractors, setProjectSubcontractors] = useState<any[]>([]);
  const [sovItems, setSovItems] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchBillingData();
      fetchChangeOrders();
      fetchTasks();
      fetchDocuments();
      fetchProjectSubcontractors();
      fetchSOVItems();
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

  const fetchBillingData = async () => {
    try {
      const { data, error } = await supabase
        .from('project_billing')
        .select('*')
        .eq('project_id', id)
        .order('billing_period_end', { ascending: false });

      if (error) throw error;
      setBillingData(data || []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    }
  };

  const fetchChangeOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', id)
        .order('date', { ascending: false });

      if (error) throw error;
      setChangeOrders(data || []);
    } catch (error) {
      console.error('Error fetching change orders:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchProjectSubcontractors = async () => {
    try {
      const { data, error } = await supabase
        .from('project_subcontractors')
        .select(`
          *,
          subcontractors:subcontractor_id (
            name,
            company,
            phone,
            email
          )
        `)
        .eq('project_id', id);

      if (error) throw error;
      setProjectSubcontractors(data || []);
    } catch (error) {
      console.error('Error fetching project subcontractors:', error);
    }
  };

  const fetchSOVItems = async () => {
    try {
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', id)
        .order('item_number', { ascending: true });

      if (error) throw error;
      setSovItems(data || []);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
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

  // Calculate real financials from billing data
  const totalBilled = billingData.reduce((sum, billing) => sum + (billing.billed_amount || 0), 0);
  const totalReceived = billingData.reduce((sum, billing) => sum + (billing.paid_amount || 0), 0);
  const totalOutstanding = billingData.reduce((sum, billing) => sum + (billing.remaining_amount || 0), 0);

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
                  <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ${totalBilled.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total invoiced
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
                    ${totalReceived.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Payments received
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${totalOutstanding.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unpaid invoices
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Billing */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>Recent Billing</CardTitle>
                <div className="flex gap-2">
                  <NewBillingDialog onBillingCreated={fetchBillingData} />
                  <Button variant="outline" size="sm" onClick={() => navigate('/project-billing')}>
                    View All Billing
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {billingData.length > 0 ? (
                  <div className="space-y-3">
                    {billingData.slice(0, 3).map((billing) => (
                      <div key={billing.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{billing.invoice_number || 'Draft Invoice'}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(billing.billing_period_start), 'MMM dd')} - {format(new Date(billing.billing_period_end), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${billing.billed_amount.toLocaleString()}</p>
                          <Badge className={`${getStatusColor(billing.status)} text-white text-xs`}>
                            {billing.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No billing records found</p>
                )}
              </CardContent>
            </Card>

            {/* SOV Summary */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>Schedule of Values Summary</CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate('/sov')}>
                  View Full SOV
                </Button>
              </CardHeader>
              <CardContent>
                {sovItems.length > 0 ? (
                  <div className="space-y-2">
                    {sovItems.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span className="text-sm">{item.item_number} - {item.description}</span>
                        <span className="font-medium">${item.scheduled_value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No SOV items found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>Project Schedule</CardTitle>
                <Button onClick={() => navigate('/schedule')} className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Open Full Schedule
                </Button>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
                  <div className="space-y-3">
                    {tasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-gray-500">
                            {task.start_date && format(new Date(task.start_date), 'MMM dd')} - 
                            {task.end_date && format(new Date(task.end_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">{task.progress}% complete</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No tasks found. Create a schedule to get started.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>Project Expenses</CardTitle>
                <Button onClick={() => navigate('/expenses')} className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Manage Expenses
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-4">No expenses tracked yet. Start tracking project expenses.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="change-orders">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>Change Orders</CardTitle>
                <Button onClick={() => navigate('/change-orders')} className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Manage Change Orders
                </Button>
              </CardHeader>
              <CardContent>
                {changeOrders.length > 0 ? (
                  <div className="space-y-3">
                    {changeOrders.slice(0, 5).map((co) => (
                      <div key={co.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">CO #{co.number}</p>
                          <p className="text-sm text-gray-500">{co.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${co.amount.toLocaleString()}</p>
                          <Badge variant={co.status === 'Approved' ? 'default' : 'secondary'}>
                            {co.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No change orders found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>Project Documents</CardTitle>
                <Button onClick={() => navigate('/documents')} className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Manage Documents
                </Button>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.slice(0, 5).map((doc) => (
                      <div key={doc.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-gray-500">{doc.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No documents uploaded yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="burn-analysis">
            <Card>
              <CardHeader>
                <CardTitle>Burn Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">${project.contractValue?.toLocaleString() || '0'}</div>
                    <p className="text-sm text-gray-500">Contract Value</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">${totalBilled.toLocaleString()}</div>
                    <p className="text-sm text-gray-500">Billed to Date</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {project.contractValue ? Math.round((totalBilled / project.contractValue) * 100) : 0}%
                    </div>
                    <p className="text-sm text-gray-500">Billing Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>Project Equipment</CardTitle>
                <Button onClick={() => navigate('/equipment')} className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Manage Equipment
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-4">Equipment allocation and tracking will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subcontractors">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>Project Subcontractors</CardTitle>
                <Button onClick={() => navigate('/subcontractors')} className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Manage Subcontractors
                </Button>
              </CardHeader>
              <CardContent>
                {projectSubcontractors.length > 0 ? (
                  <div className="space-y-3">
                    {projectSubcontractors.map((ps) => (
                      <div key={ps.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{ps.subcontractors?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{ps.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${ps.contract_amount?.toLocaleString() || '0'}</p>
                          <Badge variant={ps.status === 'Active' ? 'default' : 'secondary'}>
                            {ps.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No subcontractors assigned yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
