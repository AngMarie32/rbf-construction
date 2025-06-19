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
import { Project as GlobalProject } from '@/types';

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
  created_at?: string;
  updated_at?: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<GlobalProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [billing, setBilling] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchProjectData();
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
        // Map database fields to the GlobalProject interface
        const mappedProject: GlobalProject = {
          id: data.id,
          name: data.name,
          description: data.description,
          type: data.type,
          status: data.status as 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Closed',
          startDate: data.start_date ? new Date(data.start_date) : new Date(),
          dueDate: data.due_date ? new Date(data.due_date) : new Date(),
          contractValue: data.contract_value,
          completionPercentage: data.completion_percentage,
          client: data.client || '',
          address: data.address || '',
          fieldLeader: data.field_leader,
          projectCode: data.project_code || '',
          createdAt: data.created_at ? new Date(data.created_at) : new Date(),
          updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
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

  const fetchProjectData = async () => {
    if (!id) return;

    try {
      // Fetch expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      // Fetch change orders
      const { data: changeOrdersData } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      // Fetch billing
      const { data: billingData } = await supabase
        .from('project_billing')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('start_date', { ascending: true });

      setExpenses(expensesData || []);
      setChangeOrders(changeOrdersData || []);
      setBilling(billingData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching project data:', error);
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

  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const paidExpenses = expenses.filter(e => e.status === 'Paid').reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const pendingExpenses = totalExpenses - paidExpenses;

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
              <CardTitle className="text-sm font-medium">Expenses Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${paidExpenses.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${pendingExpenses.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="payment-apps">Payment Apps</TabsTrigger>
            <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="billing">Project Billing</TabsTrigger>
            <TabsTrigger value="burn-analysis">Burn Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Completion</span>
                        <span>{project.completionPercentage || 0}%</span>
                      </div>
                      <Progress value={project.completionPercentage || 0} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p>{project.startDate?.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Due Date</p>
                        <p>{project.dueDate?.toLocaleDateString()}</p>
                      </div>
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
              <CardContent>
                {tasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="border rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{task.title}</h4>
                          <Badge variant="outline">{task.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>Start: {new Date(task.start_date).toLocaleDateString()}</div>
                          <div>End: {new Date(task.end_date).toLocaleDateString()}</div>
                        </div>
                        <Progress value={task.progress || 0} className="mt-2 h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No tasks found for this project.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-apps">
            <Card>
              <CardHeader>
                <CardTitle>Payment Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Payment application management will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="change-orders">
            <Card>
              <CardHeader>
                <CardTitle>Change Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {changeOrders.length > 0 ? (
                  <div className="space-y-4">
                    {changeOrders.map((co) => (
                      <div key={co.id} className="border rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{co.number}</h4>
                          <Badge variant="outline">{co.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{co.description}</p>
                        <div className="flex justify-between text-sm">
                          <span>Amount: ${co.amount?.toLocaleString()}</span>
                          <span>Date: {new Date(co.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No change orders found for this project.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Project Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.length > 0 ? (
                  <div className="space-y-4">
                    {expenses.slice(0, 10).map((expense) => (
                      <div key={expense.id} className="border rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{expense.description}</h4>
                          <Badge variant="outline">{expense.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>Category: {expense.category}</div>
                          <div>Amount: ${expense.amount?.toLocaleString()}</div>
                          <div>Date: {new Date(expense.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No expenses found for this project.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Project Billing</CardTitle>
              </CardHeader>
              <CardContent>
                {billing.length > 0 ? (
                  <div className="space-y-4">
                    {billing.map((bill) => (
                      <div key={bill.id} className="border rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{bill.invoice_number || 'Draft Invoice'}</h4>
                          <Badge variant="outline">{bill.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>Billed: ${bill.billed_amount?.toLocaleString()}</div>
                          <div>Paid: ${bill.paid_amount?.toLocaleString()}</div>
                          <div>Period: {new Date(bill.billing_period_start).toLocaleDateString()} - {new Date(bill.billing_period_end).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No billing records found for this project.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="burn-analysis">
            <BurnAnalysisTab projectId={project.id} />
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
