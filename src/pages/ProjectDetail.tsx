
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Clock, Users, FileText, TrendingUp, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays, isWithinInterval } from 'date-fns';
import { GanttChart } from '@/components/schedule/GanttChart';
import { ScheduleDateFilter } from '@/components/schedule/ScheduleDateFilter';
import { DateRange } from 'react-day-picker';

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  description?: string;
  project_manager?: string;
  location?: string;
  contract_type?: string;
  contract_value: number;
  due_date: string;
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
      
      // Map database fields to expected interface
      const mappedProject: Project = {
        ...data,
        end_date: data.due_date || data.due_date,
        budget: data.contract_value || 0,
        spent: data.contract_value * (data.completion_percentage / 100) || 0
      };
      
      setProject(mappedProject);
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

  const handleBackToOverview = () => {
    setActiveTab('overview');
    setShowFilters(false);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
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

  const progressPercentage = project.budget > 0 ? (project.spent / project.budget) * 100 : 0;
  const remainingBudget = project.budget - project.spent;
  const daysRemaining = differenceInDays(new Date(project.end_date), new Date());

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'on_hold':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
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
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Project Header */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold">{project.name}</h1>
                      <Badge className={`${getStatusColor(project.status)} text-white`}>
                        {project.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div><strong>Client:</strong> {project.client || 'Not specified'}</div>
                      <div><strong>Project Manager:</strong> {project.project_manager || 'Not assigned'}</div>
                      <div><strong>Location:</strong> {project.location || 'Not specified'}</div>
                      <div><strong>Contract Type:</strong> {project.contract_type || 'Standard'}</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Calendar className="w-4 h-4" />
                      Timeline
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm"><strong>Start:</strong> {project.start_date ? format(new Date(project.start_date), 'MMM dd, yyyy') : 'Not set'}</p>
                      <p className="text-sm"><strong>End:</strong> {format(new Date(project.end_date), 'MMM dd, yyyy')}</p>
                      <p className="text-sm"><strong>Days Left:</strong> {daysRemaining > 0 ? daysRemaining : 'Overdue'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      Budget
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm"><strong>Total:</strong> ${project.budget.toLocaleString()}</p>
                      <p className="text-sm"><strong>Spent:</strong> ${project.spent.toLocaleString()}</p>
                      <p className="text-sm"><strong>Remaining:</strong> ${remainingBudget.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <TrendingUp className="w-4 h-4" />
                      Progress
                    </div>
                    <div className="space-y-2">
                      <Progress value={progressPercentage} className="w-full" />
                      <p className="text-sm">{progressPercentage.toFixed(1)}% Complete</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <FileText className="w-4 h-4" />
                      Details
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm"><strong>Tasks:</strong> {tasks.length}</p>
                      <p className="text-sm"><strong>Contract Value:</strong> ${project.contract_value.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {project.description && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-gray-600">{project.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            {showFilters && (
              <ScheduleDateFilter
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onBack={handleBackToOverview}
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
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleBackToOverview}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Details
                      </Button>
                      <Button onClick={() => setShowFilters(true)}>
                        Customize View
                      </Button>
                    </div>
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

          <TabsContent value="budget">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Budget Analysis
                  </CardTitle>
                  <Button variant="outline" onClick={handleBackToOverview}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Budget details and analysis will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Project Documents
                  </CardTitle>
                  <Button variant="outline" onClick={handleBackToOverview}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Document management will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Project Team
                  </CardTitle>
                  <Button variant="outline" onClick={handleBackToOverview}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Team management will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Project Reports
                  </CardTitle>
                  <Button variant="outline" onClick={handleBackToOverview}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Project reports and analytics will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
