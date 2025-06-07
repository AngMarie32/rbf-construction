import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, BarChart3, Plus, FileText, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Project as ProjectType } from '@/types';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';
import { GanttChart } from '@/components/schedule/GanttChart';

interface Project extends ProjectType {}

// Separate interface for Gantt chart projects
interface GanttProject {
  id: string;
  name: string;
  color: string;
  client?: string;
  contractValue?: number;
  status?: string;
}

interface Task {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: string;
  projectId: string;
  dependencies: string[];
  duration: number;
  isCritical?: boolean;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState([]);
  const [sovItems, setSovItems] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);
  const [paymentApps, setPaymentApps] = useState([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduleProjects, setScheduleProjects] = useState<GanttProject[]>([]);

  useEffect(() => {
    fetchProject();
    fetchProjectData();
  }, [id]);

  useEffect(() => {
    if (project) {
      fetchScheduleData();
    }
  }, [project]);

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

      // Transform snake_case to camelCase to match Project type
      const transformedProject: Project = {
        id: data.id,
        name: data.name,
        type: data.type,
        contractValue: data.contract_value || 0,
        status: data.status as 'Planning' | 'Open' | 'Closed',
        startDate: new Date(data.start_date),
        dueDate: new Date(data.due_date),
        completionPercentage: data.completion_percentage || 0,
        address: data.address || '',
        projectCode: data.project_code || '',
        client: data.client || '',
        description: '', // Default to empty string since description doesn't exist in database
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      setProject(transformedProject);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project details.');
      setLoading(false);
    }
  };

  const fetchProjectData = async () => {
    if (!id) return;

    try {
      // Fetch billing data
      const { data: billing } = await supabase
        .from('project_billing')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      setBillingData(billing || []);

      // Fetch SOV items
      const { data: sov } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', id)
        .order('item_number');

      setSovItems(sov || []);

      // Fetch change orders
      const { data: changes } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', id)
        .order('date', { ascending: false });

      setChangeOrders(changes || []);

      // Fetch payment applications from G702 table
      const { data: payments } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', id)
        .order('application_number', { ascending: false });

      setPaymentApps(payments || []);
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  const fetchScheduleData = async () => {
    if (!id || !project) return;

    try {
      // Try to fetch real tasks from database first
      const { data: realTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('start_date');

      let fetchedTasks: Task[] = [];

      if (realTasks && realTasks.length > 0) {
        // Transform database tasks to match our interface
        fetchedTasks = realTasks.map(task => ({
          id: task.id,
          title: task.title,
          startDate: new Date(task.start_date),
          endDate: new Date(task.end_date),
          progress: task.progress || 0,
          status: task.status || 'Planned',
          projectId: task.project_id,
          dependencies: task.dependencies || [],
          duration: task.duration || 1,
          isCritical: task.is_critical || false
        }));
      } else {
        // Fallback to mock data based on project dates
        const projectStart = new Date(project.startDate);
        const projectEnd = new Date(project.dueDate);
        const projectDuration = Math.max(1, Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)));
        
        fetchedTasks = [
          {
            id: '1',
            title: 'Project Planning',
            startDate: projectStart,
            endDate: new Date(projectStart.getTime() + (projectDuration * 0.15 * 24 * 60 * 60 * 1000)),
            progress: 100,
            status: 'Completed',
            projectId: id,
            dependencies: [],
            duration: Math.ceil(projectDuration * 0.15),
            isCritical: true
          },
          {
            id: '2',
            title: 'Foundation & Site Work',
            startDate: new Date(projectStart.getTime() + (projectDuration * 0.15 * 24 * 60 * 60 * 1000)),
            endDate: new Date(projectStart.getTime() + (projectDuration * 0.4 * 24 * 60 * 60 * 1000)),
            progress: project.completionPercentage > 40 ? 100 : Math.max(0, (project.completionPercentage - 15) * 4),
            status: project.completionPercentage > 40 ? 'Completed' : project.completionPercentage > 15 ? 'In Progress' : 'Planned',
            projectId: id,
            dependencies: ['1'],
            duration: Math.ceil(projectDuration * 0.25),
            isCritical: true
          },
          {
            id: '3',
            title: 'Construction Phase',
            startDate: new Date(projectStart.getTime() + (projectDuration * 0.4 * 24 * 60 * 60 * 1000)),
            endDate: new Date(projectStart.getTime() + (projectDuration * 0.85 * 24 * 60 * 60 * 1000)),
            progress: project.completionPercentage > 40 ? Math.min(100, (project.completionPercentage - 40) * 2.22) : 0,
            status: project.completionPercentage > 85 ? 'Completed' : project.completionPercentage > 40 ? 'In Progress' : 'Planned',
            projectId: id,
            dependencies: ['2'],
            duration: Math.ceil(projectDuration * 0.45),
            isCritical: false
          },
          {
            id: '4',
            title: 'Final Inspection & Completion',
            startDate: new Date(projectStart.getTime() + (projectDuration * 0.85 * 24 * 60 * 60 * 1000)),
            endDate: projectEnd,
            progress: project.completionPercentage > 85 ? Math.min(100, (project.completionPercentage - 85) * 6.67) : 0,
            status: project.completionPercentage === 100 ? 'Completed' : project.completionPercentage > 85 ? 'In Progress' : 'Planned',
            projectId: id,
            dependencies: ['3'],
            duration: Math.ceil(projectDuration * 0.15),
            isCritical: true
          }
        ];
      }

      setTasks(fetchedTasks);
      
      // Create gantt project with proper color based on status
      const statusColors = {
        'Planning': '#f59e0b',
        'Open': '#10b981', 
        'Closed': '#6b7280'
      };
      
      const ganttProject: GanttProject = {
        id: project.id,
        name: project.name,
        color: statusColors[project.status] || '#3b82f6',
        client: project.client,
        contractValue: project.contractValue,
        status: project.status
      };
      
      setScheduleProjects([ganttProject]);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      // Still create the gantt project even if task fetching fails
      if (project) {
        const ganttProject: GanttProject = {
          id: project.id,
          name: project.name,
          color: '#3b82f6',
          client: project.client,
          contractValue: project.contractValue,
          status: project.status
        };
        setScheduleProjects([ganttProject]);
      }
    }
  };

  const handleUpdate = async () => {
    await fetchProject();
    await fetchProjectData();
    await fetchScheduleData();
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));

    // Update project completion based on task progress
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    
    const avgProgress = updatedTasks.reduce((sum, task) => sum + task.progress, 0) / updatedTasks.length;
    
    // Update project completion percentage in database
    if (project) {
      supabase
        .from('projects')
        .update({ completion_percentage: Math.round(avgProgress) })
        .eq('id', project.id)
        .then(() => {
          setProject(prev => prev ? { ...prev, completionPercentage: Math.round(avgProgress) } : null);
        });
    }
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
                {project.description && (
                  <p className="text-gray-600 mt-2">{project.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleViewBurnAnalysis}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Burn Analysis
                </Button>
                <EditProjectDialog project={project} onProjectUpdated={handleUpdate} />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.completionPercentage}%</div>
              <p className="text-xs text-muted-foreground">
                Project completion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Start Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{format(new Date(project.startDate), 'MMM dd')}</div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(project.startDate), 'yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{format(new Date(project.dueDate), 'MMM dd')}</div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(project.dueDate), 'yyyy')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="sov">Schedule of Values</TabsTrigger>
            <TabsTrigger value="payments">Payment Apps</TabsTrigger>
            <TabsTrigger value="changes">Change Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500">Client</h4>
                    <p className="text-lg">{project.client || 'No client specified'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500">Address</h4>
                    <p className="text-lg">{project.address || 'No address specified'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500">Project Code</h4>
                    <p className="text-lg">{project.projectCode || 'No code assigned'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-500">Type</h4>
                    <p className="text-lg">{project.type}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm text-gray-500 mb-2">Progress</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${project.completionPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{project.completionPercentage}% complete</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 && scheduleProjects.length > 0 ? (
                  <GanttChart
                    tasks={tasks}
                    projects={scheduleProjects}
                    selectedProjects={[id]}
                    onTaskUpdate={handleTaskUpdate}
                    dateRange={{
                      from: new Date(project.startDate),
                      to: new Date(project.dueDate)
                    }}
                    showDependencies={true}
                    showCriticalPath={true}
                    showMilestones={true}
                    projectData={scheduleProjects[0]}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading schedule data...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Billing</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate('/project-billing')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Billing
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/project-billing')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {billingData.length > 0 ? (
                  <div className="space-y-3">
                    {billingData.slice(0, 5).map((bill: any) => (
                      <div key={bill.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium">{bill.invoice_number || `Billing ${bill.id.slice(0, 8)}`}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(bill.billing_period_start), 'MMM dd')} - {format(new Date(bill.billing_period_end), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${bill.billed_amount?.toLocaleString()}</p>
                          <Badge variant={bill.status === 'Paid' ? 'default' : 'secondary'}>
                            {bill.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No billing records found.</p>
                    <Button className="mt-4" onClick={() => navigate('/project-billing')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Billing
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sov" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Schedule of Values</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate('/sov')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New SOV Item
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/sov')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sovItems.length > 0 ? (
                  <div className="space-y-3">
                    {sovItems.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium">{item.item_number} - {item.description}</p>
                          <p className="text-sm text-gray-600">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${item.scheduled_value?.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{item.percent_complete}% complete</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No SOV items found.</p>
                    <Button className="mt-4" onClick={() => navigate('/sov')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First SOV Item
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Payment Applications</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate('/payment-apps')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Application
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/payment-apps')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {paymentApps.length > 0 ? (
                  <div className="space-y-3">
                    {paymentApps.slice(0, 5).map((app: any) => (
                      <div key={app.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium">Application #{app.application_number}</p>
                          <p className="text-sm text-gray-600">
                            Period Ending: {format(new Date(app.period_to), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${(app.current_payment_due || 0).toLocaleString()}</p>
                          <p className="text-sm text-gray-600">Payment Due</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No payment applications found.</p>
                    <Button className="mt-4" onClick={() => navigate('/payment-apps')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Application
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="changes" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Change Orders</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate('/change-orders')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Change Order
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/change-orders')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {changeOrders.length > 0 ? (
                  <div className="space-y-3">
                    {changeOrders.slice(0, 5).map((change: any) => (
                      <div key={change.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium">CO-{change.number}</p>
                          <p className="text-sm text-gray-600">{change.description}</p>
                          <p className="text-xs text-gray-500">{format(new Date(change.date), 'MMM dd, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${change.amount?.toLocaleString()}</p>
                          <Badge variant={change.status === 'Approved' ? 'default' : 'secondary'}>
                            {change.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No change orders found.</p>
                    <Button className="mt-4" onClick={() => navigate('/change-orders')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Change Order
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
