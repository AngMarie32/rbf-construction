import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CalendarDays, BarChart3, Plus, Search, Filter, Eye, Download, Settings, Target, Lightbulb, Users, Clock, Kanban, Zap, FileText, TrendingUp, CloudRain } from 'lucide-react';
import { GanttChart } from '@/components/schedule/GanttChart';
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';
import { EnhancedCriticalPath } from '@/components/schedule/EnhancedCriticalPath';
import { ImprovedExportDialog } from '@/components/schedule/ImprovedExportDialog';
import { TaskDependencyManager } from '@/components/schedule/TaskDependencyManager';
import { TaskEditDialog } from '@/components/schedule/TaskEditDialog';
import { CreateTaskDialog } from '@/components/schedule/CreateTaskDialog';
import { CollapsibleFilterSection } from '@/components/schedule/CollapsibleFilterSection';
import { PlannerBoard } from '@/components/schedule/PlannerBoard';
import { QuickPlanner } from '@/components/schedule/QuickPlanner';
import { TemplateManager } from '@/components/schedule/TemplateManager';
import { ProjectDelayDialog } from '@/components/schedule/ProjectDelayDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { Task } from '@/types';
import { ResourceLevelingManager } from '@/components/schedule/ResourceLevelingManager';
import { WeatherScheduleAdjuster } from '@/components/schedule/WeatherScheduleAdjuster';

interface Project {
  id: string;
  name: string;
  color: string;
}

export default function ProjectSchedule() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter'>('month');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: addDays(new Date(), 60)
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDependencies, setShowDependencies] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [dependencyTask, setDependencyTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [quickPlannerOpen, setQuickPlannerOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [projectDelayDialogOpen, setProjectDelayDialogOpen] = useState(false);
  const [resourceLevelingOpen, setResourceLevelingOpen] = useState(false);
  const [weatherAdjusterOpen, setWeatherAdjusterOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchTasks();
  }, []);

  useEffect(() => {
    updateDateRange();
  }, [currentDate, viewMode]);

  const updateDateRange = () => {
    let newFrom: Date;
    let newTo: Date;

    switch (viewMode) {
      case 'week':
        newFrom = startOfWeek(currentDate);
        newTo = endOfWeek(currentDate);
        break;
      case 'month':
        newFrom = startOfMonth(currentDate);
        newTo = endOfMonth(currentDate);
        break;
      case 'quarter':
        newFrom = startOfQuarter(currentDate);
        newTo = endOfQuarter(currentDate);
        break;
      default:
        newFrom = startOfMonth(currentDate);
        newTo = endOfMonth(currentDate);
    }

    setDateRange({ from: newFrom, to: newTo });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const multiplier = direction === 'next' ? 1 : -1;
    let newDate: Date;

    switch (viewMode) {
      case 'week':
        newDate = addDays(currentDate, 7 * multiplier);
        break;
      case 'month':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + multiplier, 1);
        break;
      case 'quarter':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (3 * multiplier), 1);
        break;
      default:
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + multiplier, 1);
    }

    setCurrentDate(newDate);
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .neq('status', 'Closed')
        .order('name');

      if (error) throw error;

      const projectsWithColors = sortProjectsOpenFirst(data || []).map((project, index) => ({
        ...project,
        color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
      }));

      setProjects(projectsWithColors);
      setSelectedProjects(projectsWithColors.map(p => p.id));
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('start_date');

      if (error) throw error;

      const formattedTasks = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        projectId: task.project_id,
        startDate: new Date(task.start_date),
        endDate: new Date(task.end_date),
        status: task.status as 'Not Started' | 'In Progress' | 'On Hold' | 'Completed' || 'Not Started',
        progress: task.progress || 0,
        dependencies: task.dependencies || []
      }));

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updateData: any = {};
      if (updates.startDate) updateData.start_date = updates.startDate.toISOString().split('T')[0];
      if (updates.endDate) updateData.end_date = updates.endDate.toISOString().split('T')[0];
      if (updates.status) updateData.status = updates.status;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.dependencies) updateData.dependencies = updates.dependencies;

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      ));

      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleBulkUpdateTasks = async (updates: { taskId: string; updates: Partial<Task> }[]) => {
    try {
      // Update all tasks in parallel
      const updatePromises = updates.map(async ({ taskId, updates: taskUpdates }) => {
        const updateData: any = {};
        if (taskUpdates.startDate) updateData.start_date = taskUpdates.startDate.toISOString().split('T')[0];
        if (taskUpdates.endDate) updateData.end_date = taskUpdates.endDate.toISOString().split('T')[0];
        if (taskUpdates.status) updateData.status = taskUpdates.status;
        if (taskUpdates.progress !== undefined) updateData.progress = taskUpdates.progress;
        if (taskUpdates.dependencies) updateData.dependencies = taskUpdates.dependencies;

        const { error } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', taskId);

        if (error) throw error;
        
        return { taskId, updates: taskUpdates };
      });

      const results = await Promise.all(updatePromises);
      
      // Update local state
      setTasks(prev => {
        const updatedTasks = [...prev];
        results.forEach(({ taskId, updates: taskUpdates }) => {
          const index = updatedTasks.findIndex(t => t.id === taskId);
          if (index !== -1) {
            updatedTasks[index] = { ...updatedTasks[index], ...taskUpdates };
          }
        });
        return updatedTasks;
      });

      toast.success(`Successfully updated ${updates.length} tasks`);
    } catch (error) {
      console.error('Error updating tasks:', error);
      toast.error('Failed to update tasks');
    }
  };

  const handleUpdateDependencies = async (taskId: string, dependencies: string[]) => {
    await handleUpdateTask(taskId, { dependencies });
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleAddTaskToStatus = (status: Task['status']) => {
    // This will be handled by the PlannerBoard component now
    console.log('Add task with status:', status);
  };

  const handleTemplateApplied = (templateTasks: any[]) => {
    // Refresh tasks after template is applied
    fetchTasks();
    setQuickPlannerOpen(false);
    setTemplateManagerOpen(false);
    toast.success('Template applied successfully');
  };

  const filteredTasks = tasks.filter(task => {
    const matchesProject = selectedProjects.includes(task.projectId);
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const withinDateRange = task.startDate <= dateRange.to && task.endDate >= dateRange.from;
    
    return matchesProject && matchesSearch && withinDateRange;
  });

  return (
    <Layout title="Project Schedule" subtitle="Manage project timelines and tasks">
      <div className="space-y-8">
        {/* Enhanced Filters & View Options */}
        <CollapsibleFilterSection
          projects={projects}
          selectedProjects={selectedProjects}
          onSelectionChange={setSelectedProjects}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          showDependencies={showDependencies}
          onShowDependenciesChange={setShowDependencies}
          showCriticalPath={showCriticalPath}
          onShowCriticalPathChange={setShowCriticalPath}
          showMilestones={showMilestones}
          onShowMilestonesChange={setShowMilestones}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          dateRange={dateRange}
          onNavigateDate={navigateDate}
          currentDate={currentDate}
        />

        {/* Main Schedule Interface */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Project Schedule</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  onClick={() => setProjectDelayDialogOpen(true)} 
                  variant="outline"
                  className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Project Delay
                </Button>
                <Button 
                  onClick={() => setQuickPlannerOpen(true)} 
                  variant="outline"
                  className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Quick Planner
                </Button>
                <Button 
                  onClick={() => setTemplateManagerOpen(true)} 
                  variant="outline"
                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </Button>
                <CreateTaskDialog 
                  projects={projects}
                  tasks={tasks}
                  onTaskCreated={fetchTasks}
                />
                <Button onClick={() => setExportDialogOpen(true)} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="gantt" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="gantt" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Gantt Chart
                </TabsTrigger>
                <TabsTrigger value="board" className="flex items-center gap-2">
                  <Kanban className="w-4 h-4" />
                  Board
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="critical" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Critical Path Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="gantt" className="space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <GanttChart
                    tasks={filteredTasks}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onEditDependencies={setDependencyTask}
                    onEditTask={setEditTask}
                    projects={projects}
                    selectedProjects={selectedProjects}
                    dateRange={dateRange}
                    showDependencies={showDependencies}
                    showCriticalPath={showCriticalPath}
                    showMilestones={showMilestones}
                  />
                )}
              </TabsContent>

              <TabsContent value="board" className="space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <PlannerBoard
                    tasks={filteredTasks}
                    projects={projects}
                    onTaskUpdate={handleUpdateTask}
                    onTaskDelete={handleDeleteTask}
                    onAddTask={handleAddTaskToStatus}
                    onTaskCreated={fetchTasks}
                    onEditTask={setEditTask}
                    onEditDependencies={setDependencyTask}
                  />
                )}
              </TabsContent>

              <TabsContent value="calendar">
                <ScheduleCalendar 
                  tasks={filteredTasks}
                  projects={projects}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  onTaskUpdate={handleUpdateTask}
                />
              </TabsContent>

              <TabsContent value="critical">
                <EnhancedCriticalPath 
                  tasks={filteredTasks}
                  projects={projects}
                  selectedProjects={selectedProjects}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Task Edit Dialog */}
        {editTask && (
          <TaskEditDialog
            task={editTask}
            projects={projects}
            onTaskUpdate={handleUpdateTask}
            onClose={() => setEditTask(null)}
          />
        )}

        {/* Task Dependency Manager */}
        {dependencyTask && (
          <TaskDependencyManager
            task={dependencyTask}
            tasks={tasks}
            onUpdateDependencies={handleUpdateDependencies}
            onClose={() => setDependencyTask(null)}
          />
        )}

        {/* Export Dialog */}
        <ImprovedExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          tasks={filteredTasks}
          projects={projects}
          selectedProjects={selectedProjects}
        />

        {/* Project Delay Dialog */}
        <ProjectDelayDialog
          open={projectDelayDialogOpen}
          onOpenChange={setProjectDelayDialogOpen}
          tasks={filteredTasks}
          onUpdateTasks={handleBulkUpdateTasks}
        />

        {/* Quick Planner */}
        <QuickPlanner
          open={quickPlannerOpen}
          onOpenChange={setQuickPlannerOpen}
          onTemplateApplied={handleTemplateApplied}
          projects={projects}
        />

        {/* Template Manager */}
        <TemplateManager
          open={templateManagerOpen}
          onOpenChange={setTemplateManagerOpen}
          onTemplateApplied={handleTemplateApplied}
          projects={projects}
        />

        {/* Resource Leveling Manager */}
        <ResourceLevelingManager
          open={resourceLevelingOpen}
          onOpenChange={setResourceLevelingOpen}
          tasks={filteredTasks}
          onUpdateTasks={handleBulkUpdateTasks}
        />

        {/* Weather Schedule Adjuster */}
        <WeatherScheduleAdjuster
          open={weatherAdjusterOpen}
          onOpenChange={setWeatherAdjusterOpen}
          tasks={filteredTasks}
          onUpdateTasks={handleBulkUpdateTasks}
        />
      </div>
    </Layout>
  );
}
