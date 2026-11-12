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
import { PageHero, heroButton } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertTriangle, CheckCircle2, ChevronDown, ListTodo, Wrench } from 'lucide-react';
import { localDateISO } from '@/utils/dates';

/** "2026-11-01" -> local midnight (new Date('2026-11-01') is UTC and shows a day early in the US). */
const parseDay = (v: string | null | undefined) => {
  if (!v) return new Date(NaN);
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
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
        .select('id, name, status').is('archived_at', null)
        .neq('status', 'Closed')
        .order('name');

      if (error) throw error;

      const projectsWithColors = sortProjectsOpenFirst(data || []).map((project, index) => ({
        ...project,
        color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
      }));

      setProjects(projectsWithColors);
      const wanted = new URLSearchParams(window.location.search).get('project');
      setSelectedProjects(wanted && projectsWithColors.some((p) => p.id === wanted) ? [wanted] : projectsWithColors.map(p => p.id));
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
        startDate: parseDay(task.start_date),
        endDate: parseDay(task.end_date),
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
      if (updates.startDate) updateData.start_date = localDateISO(updates.startDate);
      if (updates.endDate) updateData.end_date = localDateISO(updates.endDate);
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
        if (taskUpdates.startDate) updateData.start_date = localDateISO(taskUpdates.startDate);
        if (taskUpdates.endDate) updateData.end_date = localDateISO(taskUpdates.endDate);
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inScope = tasks.filter((t) => selectedProjects.includes(t.projectId));
  const open = inScope.filter((t) => t.status !== 'Completed');
  const overdue = open.filter((t) => t.endDate < today);
  const weekEnd = addDays(today, 7);
  const dueSoon = open.filter((t) => t.endDate >= today && t.endDate <= weekEnd);
  const avgProgress = inScope.length ? Math.round(inScope.reduce((a, t) => a + (Number(t.progress) || 0), 0) / inScope.length) : 0;
  const singleProject = selectedProjects.length === 1 ? projects.find((p) => p.id === selectedProjects[0]) : undefined;

  return (
    <Layout hideTitle title="Project Schedule">
      <div className="space-y-6">
        <PageHero
          eyebrow={singleProject ? singleProject.name : 'Project management'}
          title="Project Schedule"
          subtitle="Tasks, timelines and dependencies across your jobs, as a Gantt chart, board or calendar."
          actions={
            <>
              <CreateTaskDialog projects={projects} tasks={tasks} onTaskCreated={fetchTasks} />
              <button type="button" className={heroButton} onClick={() => setQuickPlannerOpen(true)}>
                <Zap className="h-4 w-4" /> Quick planner
              </button>
              <button type="button" className={heroButton} onClick={() => setTemplateManagerOpen(true)}>
                <FileText className="h-4 w-4" /> Templates
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={heroButton}>
                    <Wrench className="h-4 w-4" /> Adjust schedule <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Move many tasks at once</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setProjectDelayDialogOpen(true)}>
                    <Clock className="mr-2 h-4 w-4" /> Push a project back (delay)
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setWeatherAdjusterOpen(true)}>
                    <CloudRain className="mr-2 h-4 w-4" /> Adjust for weather days
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setResourceLevelingOpen(true)}>
                    <Users className="mr-2 h-4 w-4" /> Level crew workload
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button type="button" className={heroButton} onClick={() => setExportDialogOpen(true)}>
                <Download className="h-4 w-4" /> Export
              </button>
            </>
          }
          stats={[
            { label: 'Average progress', value: loading ? '…' : `${avgProgress}%` },
            { label: 'Overdue tasks', value: loading ? '…' : String(overdue.length), tone: overdue.length ? 'bad' : 'good' },
          ]}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AccentStat label="Open tasks" value={open.length} icon={ListTodo} accent="blue" loading={loading} hint={`${inScope.length} total on ${selectedProjects.length} job${selectedProjects.length === 1 ? '' : 's'}`} />
          <AccentStat label="In progress" value={inScope.filter((t) => t.status === 'In Progress').length} icon={Clock} accent="indigo" loading={loading} hint={`${inScope.filter((t) => t.status === 'On Hold').length} on hold`} />
          <AccentStat label="Due in 7 days" value={dueSoon.length} icon={CalendarDays} accent="amber" tone={dueSoon.length ? 'warn' : undefined} loading={loading} hint="Not completed yet" />
          <AccentStat
            label="Overdue"
            value={overdue.length}
            icon={overdue.length ? AlertTriangle : CheckCircle2}
            accent="rose"
            tone={overdue.length ? 'bad' : 'good'}
            loading={loading}
            hint={overdue.length ? `Oldest: ${overdue.sort((a, b) => a.endDate.getTime() - b.endDate.getTime())[0].title}` : 'Nothing past its end date'}
          />
        </div>

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
          <CardContent className="pt-6">
            <Tabs defaultValue="gantt" className="space-y-6">
              <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-auto">
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
                  Critical path
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
