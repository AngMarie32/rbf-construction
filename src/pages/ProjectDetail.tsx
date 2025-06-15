
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Clock, Users, FileText, TrendingUp, ArrowLeft, Brain, ExternalLink, MapPin, User, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays, isWithinInterval } from 'date-fns';
import { GanttChart } from '@/components/schedule/GanttChart';
import { ScheduleDateFilter } from '@/components/schedule/ScheduleDateFilter';
import { DateRange } from 'react-day-picker';
import { PageChatWidget } from '@/components/chat/PageChatWidget';
import { useProjectExpenses } from '@/hooks/useProjectExpenses';
import { useProjectBilling } from '@/hooks/useProjectBilling';

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  start_date: string;
  due_date: string;
  contract_value: number;
  completion_percentage: number;
  description?: string;
  field_leader?: string;
  address?: string;
  project_code?: string;
  type?: string;
}

interface Task {
  id: string;
  title: string;
  name: string;
  start: Date;
  end: Date;
  startDate: Date;
  endDate: Date;
  progress: number;
  dependencies: string[];
  type: 'task' | 'milestone' | 'project';
  project?: string;
  projectId: string;
  isDisabled?: boolean;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showMilestones, setShowMilestones] = useState(true);

  // Get project expenses and billing data
  const { expenses: projectExpenses } = useProjectExpenses(id ? [id] : []);
  const { billing: projectBilling } = useProjectBilling(id ? [id] : []);

  const totalExpenses = id ? (projectExpenses[id] || 0) : 0;
  const totalBilled = id ? (projectBilling[id]?.totalBilled || 0) : 0;
  const totalReceived = id ? (projectBilling[id]?.totalReceived || 0) : 0;

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchTasks();
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
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project details');
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('start_date');

      if (error) throw error;
      
      const formattedTasks: Task[] = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        name: task.title,
        start: new Date(task.start_date),
        end: new Date(task.end_date),
        startDate: new Date(task.start_date),
        endDate: new Date(task.end_date),
        progress: task.progress || 0,
        dependencies: task.dependencies || [],
        type: 'task' as const,
        project: task.project_id,
        projectId: task.project_id,
        isDisabled: false,
        status: (task.status as 'Not Started' | 'In Progress' | 'Completed' | 'On Hold') || 'Not Started'
      }));

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load project tasks');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTasks = () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      return tasks;
    }

    return tasks.filter(task => {
      const taskStart = task.start;
      const taskEnd = task.end;
      const filterStart = dateRange.from!;
      const filterEnd = dateRange.to!;

      return (
        isWithinInterval(taskStart, { start: filterStart, end: filterEnd }) ||
        isWithinInterval(taskEnd, { start: filterStart, end: filterEnd }) ||
        (taskStart <= filterStart && taskEnd >= filterEnd)
      );
    });
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleOpenCustomGPT = () => {
    window.open('https://chatgpt.com/g/g-67ddca712ff48191a3343111439ac448-albus', '_blank');
  };

  if (loading) {
    return (
      <Layout title="Project Details" subtitle="Loading project information...">
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
          <p className="text-gray-500 mb-4">Project not found</p>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  const progressPercentage = project.completion_percentage || 0;
  const remainingValue = project.contract_value - totalBilled;
  const daysRemaining = differenceInDays(new Date(project.due_date), new Date());

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      case 'on hold':
        return 'bg-yellow-500';
      case 'planning':
        return 'bg-purple-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Create projects array for GanttChart
  const projects = project ? [{
    id: project.id,
    name: project.name,
    color: '#3b82f6',
    client: project.client,
    contractValue: project.contract_value,
    status: project.status
  }] : [];

  // Create date range for GanttChart
  const ganttDateRange = dateRange && dateRange.from && dateRange.to ? {
    from: dateRange.from,
    to: dateRange.to
  } : {
    from: new Date(),
    to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  };

  return (
    <Layout title={project.name} subtitle={`${project.client} • ${project.status}`}>
      <div className="space-y-6">
        {/* Navigation */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Project Header Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold">{project.name}</h1>
                      <Badge className={`${getStatusColor(project.status)} text-white`}>
                        {project.status}
                      </Badge>
                    </div>
                    {project.project_code && (
                      <p className="text-sm text-gray-600">Project Code: {project.project_code}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Client Information */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Building className="w-4 h-4" />
                      Client Details
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{project.client}</p>
                      {project.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3 h-3 mt-1 text-gray-400" />
                          <p className="text-sm text-gray-600">{project.address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Calendar className="w-4 h-4" />
                      Timeline
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="text-sm font-medium">
                          {project.start_date ? format(new Date(project.start_date), 'MMM dd, yyyy') : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Due Date</p>
                        <p className="text-sm font-medium">
                          {format(new Date(project.due_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Days Remaining</p>
                        <p className={`text-sm font-medium ${daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {daysRemaining > 0 ? `${daysRemaining} days` : 'Overdue'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      Financial
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Contract Value</p>
                        <p className="text-sm font-medium">${project.contract_value.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Billed</p>
                        <p className="text-sm font-medium text-green-600">${totalBilled.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Received</p>
                        <p className="text-sm font-medium text-emerald-600">${totalReceived.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Project Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <TrendingUp className="w-4 h-4" />
                      Progress
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Completion</span>
                        <span className="text-sm font-medium">{progressPercentage}%</span>
                      </div>
                      <Progress value={progressPercentage} className="w-full" />
                      <div>
                        <p className="text-xs text-gray-500">Tasks</p>
                        <p className="text-sm font-medium">{tasks.length} total</p>
                      </div>
                      {project.field_leader && (
                        <div>
                          <p className="text-xs text-gray-500">Field Leader</p>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-400" />
                            <p className="text-sm font-medium">{project.field_leader}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {project.description && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium mb-2">Project Description</h3>
                    <p className="text-gray-600">{project.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Expenses</p>
                      <p className="text-lg font-semibold text-red-600">${totalExpenses.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Remaining Value</p>
                      <p className="text-lg font-semibold text-blue-600">${remainingValue.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Tasks</p>
                      <p className="text-lg font-semibold">{tasks.filter(t => t.status === 'In Progress').length}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Project Type</p>
                      <p className="text-lg font-semibold">{project.type || 'General'}</p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Contract Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contract Value:</span>
                        <span className="font-medium">${project.contract_value.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Billed:</span>
                        <span className="font-medium text-green-600">${totalBilled.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Received:</span>
                        <span className="font-medium text-emerald-600">${totalReceived.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Outstanding:</span>
                        <span className="font-medium text-orange-600">${(totalBilled - totalReceived).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Project Costs</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Expenses:</span>
                        <span className="font-medium text-red-600">${totalExpenses.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining Budget:</span>
                        <span className="font-medium">${remainingValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit Margin:</span>
                        <span className="font-medium text-blue-600">
                          {project.contract_value > 0 ? (((totalReceived - totalExpenses) / project.contract_value) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Performance</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Billing Progress:</span>
                        <span className="font-medium">
                          {project.contract_value > 0 ? ((totalBilled / project.contract_value) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Collection Rate:</span>
                        <span className="font-medium">
                          {totalBilled > 0 ? ((totalReceived / totalBilled) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            {showFilters && (
              <ScheduleDateFilter
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onBack={() => setShowFilters(false)}
                showDependencies={showDependencies}
                onShowDependenciesChange={setShowDependencies}
                showCriticalPath={showCriticalPath}
                onShowCriticalPathChange={setShowCriticalPath}
                showMilestones={showMilestones}
                onShowMilestonesChange={setShowMilestones}
                tasks={getFilteredTasks()}
                projects={[project]}
                projectData={project}
              />
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Project Schedule
                  </CardTitle>
                  {!showFilters && (
                    <Button onClick={() => setShowFilters(true)}>
                      Customize View
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
                  <div className="w-full overflow-auto">
                    <GanttChart
                      tasks={getFilteredTasks()}
                      onUpdateTask={handleUpdateTask}
                      onDeleteTask={handleDeleteTask}
                      projects={projects}
                      selectedProjects={[project.id]}
                      dateRange={ganttDateRange}
                      showDependencies={showDependencies}
                      showCriticalPath={showCriticalPath}
                      showMilestones={showMilestones}
                      projectData={project}
                      compactMode={false}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No tasks found for this project.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Project Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.field_leader && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <User className="w-8 h-8 text-gray-500" />
                      <div>
                        <p className="font-medium">{project.field_leader}</p>
                        <p className="text-sm text-gray-600">Field Leader</p>
                      </div>
                    </div>
                  )}
                  <p className="text-gray-500">Additional team management features coming soon.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Project Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Document management features coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Project Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <Brain className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">AI-Powered Project Analysis</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Get intelligent insights about your project using our custom AI assistant, Albus. 
                    Analyze plans, scope of work, measurements, and get expert construction advice.
                  </p>
                  
                  <Button 
                    onClick={handleOpenCustomGPT}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg"
                  >
                    <Brain className="w-5 h-5 mr-2" />
                    Open Albus AI Assistant
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Project-specific Chat Widget */}
        <PageChatWidget
          contextId={project.id}
          contextType="project"
          pageName={`${project.name} Chat`}
        />
      </div>
    </Layout>
  );
}
