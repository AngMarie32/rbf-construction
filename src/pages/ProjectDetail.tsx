import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, BarChart3, Plus, FileText, DollarSign, Calendar, Download, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Project as ProjectType, Task } from '@/types';
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

interface Document {
  id: string;
  name: string;
  category: string;
  description?: string;
  createdAt: Date;
  fileSize?: number;
  tags?: string[];
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  vendor?: string;
  date: Date;
  status: string;
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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

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

      // Fetch documents for this project
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      const mappedDocuments = (docs || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        category: doc.category || 'General',
        description: doc.description,
        createdAt: new Date(doc.created_at),
        fileSize: doc.file_size,
        tags: doc.tags || []
      }));

      setDocuments(mappedDocuments);

      // Fetch expenses for this project
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', id)
        .order('date', { ascending: false });

      const mappedExpenses = (expenseData || []).map(expense => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        vendor: expense.vendor,
        date: new Date(expense.date),
        status: expense.status
      }));

      setExpenses(mappedExpenses);
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  const fetchScheduleData = async () => {
    if (!id || !project) return;

    try {
      // Fetch real tasks from database first
      const { data: realTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('start_date');

      let fetchedTasks: Task[] = [];

      if (realTasks && realTasks.length > 0) {
        // Transform database tasks to match our interface
        fetchedTasks = realTasks.map(task => {
          const startDate = new Date(task.start_date);
          const endDate = new Date(task.end_date);
          
          // Calculate status based on dates and progress with proper typing
          const today = new Date();
          let status: Task['status'] = 'Not Started';
          
          if (task.progress === 100) {
            status = 'Completed';
          } else if (today >= startDate && today <= endDate) {
            status = 'In Progress';
          } else if (today > endDate && task.progress < 100) {
            status = 'On Hold'; // Using 'On Hold' instead of 'Overdue' since it's not in the type
          } else {
            // Use the database status if it matches our type, otherwise default
            const dbStatus = task.status;
            if (dbStatus === 'Not Started' || dbStatus === 'In Progress' || dbStatus === 'Completed' || dbStatus === 'On Hold') {
              status = dbStatus;
            }
          }
          
          return {
            id: task.id,
            projectId: task.project_id,
            title: task.title,
            startDate,
            endDate,
            progress: task.progress || 0,
            status,
            dependencies: task.dependencies || []
          };
        });
      } else {
        // Enhanced fallback with better task breakdown
        const projectStart = new Date(project.startDate);
        const projectEnd = new Date(project.dueDate);
        const projectDuration = Math.max(1, Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Create more realistic task progression
        const today = new Date();
        const getTaskStatus = (startDate: Date, endDate: Date, progress: number): Task['status'] => {
          if (progress === 100) return 'Completed';
          if (today < startDate) return 'Not Started';
          if (today >= startDate && today <= endDate) return 'In Progress';
          if (today > endDate && progress < 100) return 'On Hold';
          return 'Not Started';
        };
        
        fetchedTasks = [
          {
            id: 'phase-1',
            projectId: id,
            title: 'Project Initiation & Planning',
            startDate: projectStart,
            endDate: new Date(projectStart.getTime() + (projectDuration * 0.15 * 24 * 60 * 60 * 1000)),
            progress: Math.min(100, Math.max(0, project.completionPercentage + 20)),
            status: 'Completed',
            dependencies: []
          },
          {
            id: 'phase-2',
            projectId: id,
            title: 'Site Preparation & Foundation',
            startDate: new Date(projectStart.getTime() + (projectDuration * 0.15 * 24 * 60 * 60 * 1000)),
            endDate: new Date(projectStart.getTime() + (projectDuration * 0.4 * 24 * 60 * 60 * 1000)),
            progress: project.completionPercentage > 40 ? 100 : Math.max(0, (project.completionPercentage - 15) * 4),
            status: getTaskStatus(
              new Date(projectStart.getTime() + (projectDuration * 0.15 * 24 * 60 * 60 * 1000)),
              new Date(projectStart.getTime() + (projectDuration * 0.4 * 24 * 60 * 60 * 1000)),
              project.completionPercentage > 40 ? 100 : Math.max(0, (project.completionPercentage - 15) * 4)
            ),
            dependencies: ['phase-1']
          },
          {
            id: 'phase-3',
            projectId: id,
            title: 'Main Construction Phase',
            startDate: new Date(projectStart.getTime() + (projectDuration * 0.4 * 24 * 60 * 60 * 1000)),
            endDate: new Date(projectStart.getTime() + (projectDuration * 0.85 * 24 * 60 * 60 * 1000)),
            progress: project.completionPercentage > 40 ? Math.min(100, (project.completionPercentage - 40) * 2.22) : 0,
            status: getTaskStatus(
              new Date(projectStart.getTime() + (projectDuration * 0.4 * 24 * 60 * 60 * 1000)),
              new Date(projectStart.getTime() + (projectDuration * 0.85 * 24 * 60 * 60 * 1000)),
              project.completionPercentage > 40 ? Math.min(100, (project.completionPercentage - 40) * 2.22) : 0
            ),
            dependencies: ['phase-2']
          },
          {
            id: 'phase-4',
            projectId: id,
            title: 'Final Inspection & Handover',
            startDate: new Date(projectStart.getTime() + (projectDuration * 0.85 * 24 * 60 * 60 * 1000)),
            endDate: projectEnd,
            progress: project.completionPercentage > 85 ? Math.min(100, (project.completionPercentage - 85) * 6.67) : 0,
            status: getTaskStatus(
              new Date(projectStart.getTime() + (projectDuration * 0.85 * 24 * 60 * 60 * 1000)),
              projectEnd,
              project.completionPercentage > 85 ? Math.min(100, (project.completionPercentage - 85) * 6.67) : 0
            ),
            dependencies: ['phase-3']
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

  const handleTaskDelete = async (taskId: string) => {
    try {
      // If it's a real task from database, delete it
      if (taskId.startsWith('phase-')) {
        // Don't allow deletion of auto-generated phase tasks
        toast.error('Cannot delete system-generated phase tasks');
        return;
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
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

  const deleteDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;
      
      setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
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
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
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
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle>Project Schedule</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {tasks.length} Tasks
                    </Badge>
                    <Badge 
                      variant={project.completionPercentage === 100 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {project.completionPercentage}% Complete
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {tasks.length > 0 && scheduleProjects.length > 0 ? (
                  <div className="h-full flex flex-col">
                    {/* Compact Schedule Summary */}
                    <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 border-b">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {tasks.filter(t => t.progress === 100).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {tasks.filter(t => {
                            const today = new Date();
                            const taskStart = new Date(t.startDate);
                            const taskEnd = new Date(t.endDate);
                            return today >= taskStart && today <= taskEnd && t.progress < 100;
                          }).length}
                        </div>
                        <div className="text-xs text-muted-foreground">In Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">
                          {tasks.filter(t => {
                            const today = new Date();
                            const taskStart = new Date(t.startDate);
                            return today < taskStart;
                          }).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Not Started</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {tasks.filter(t => {
                            const today = new Date();
                            const taskEnd = new Date(t.endDate);
                            return today > taskEnd && t.progress < 100;
                          }).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Overdue</div>
                      </div>
                    </div>

                    {/* Scrollable Gantt Chart */}
                    <div className="flex-1 overflow-hidden">
                      <GanttChart
                        tasks={tasks}
                        onUpdateTask={handleTaskUpdate}
                        onDeleteTask={handleTaskDelete}
                        projects={scheduleProjects}
                        selectedProjects={[id]}
                        dateRange={{
                          from: new Date(project.startDate),
                          to: new Date(project.dueDate)
                        }}
                        showDependencies={true}
                        showCriticalPath={true}
                        showMilestones={true}
                        projectData={scheduleProjects[0]}
                        compactMode={true}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Loading schedule data...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Documents</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate('/documents')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/documents')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{doc.name}</div>
                              {doc.description && (
                                <div className="text-sm text-gray-500">{doc.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {format(doc.createdAt, 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteDocument(doc.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No documents found for this project.</p>
                    <Button className="mt-4" onClick={() => navigate('/documents')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Upload First Document
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Project Expenses</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate('/expenses')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/expenses')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {expenses.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{expense.description}</div>
                              {expense.vendor && (
                                <div className="text-sm text-gray-500">{expense.vendor}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${expense.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {format(expense.date, 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={expense.status === 'Approved' ? 'default' : 'secondary'}
                            >
                              {expense.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteExpense(expense.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No expenses found for this project.</p>
                    <Button className="mt-4" onClick={() => navigate('/expenses')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Expense
                    </Button>
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
