import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CalendarDays, BarChart3, Plus, Search, Filter, Eye, Download, Settings, Target, Lightbulb, Users, Clock, Kanban, Zap, FileText, CloudRain } from 'lucide-react';
import { GanttChart } from '@/components/schedule/GanttChart';
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';
import { EnhancedCriticalPath } from '@/components/schedule/EnhancedCriticalPath';
import { PlannerBoard } from '@/components/schedule/PlannerBoard';
import { CreateTaskDialog } from '@/components/schedule/CreateTaskDialog';
import { TaskEditDialog } from '@/components/schedule/TaskEditDialog';
import { TaskDependencyManager } from '@/components/schedule/TaskDependencyManager';
import { ResourceLevelingManager } from '@/components/schedule/ResourceLevelingManager';
import { WeatherScheduleAdjuster } from '@/components/schedule/WeatherScheduleAdjuster';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Task } from '@/types';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface ProjectScheduleTabProps {
  projectId: string;
}

export function ProjectScheduleTab({ projectId }: ProjectScheduleTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [dependencyTask, setDependencyTask] = useState<Task | null>(null);
  const [resourceLevelingOpen, setResourceLevelingOpen] = useState(false);
  const [weatherAdjusterOpen, setWeatherAdjusterOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  useEffect(() => {
    fetchProjectAndTasks();
  }, [projectId]);

  const fetchProjectAndTasks = async () => {
    try {
      setLoading(true);
      
      // Fetch the specific project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const projectWithColor = {
        ...projectData,
        color: '#3b82f6'
      };

      setProjects([projectWithColor]);

      // Fetch tasks for this project
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date');

      if (tasksError) throw tasksError;

      const formattedTasks = (tasksData || []).map(task => ({
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
      console.error('Error fetching project schedule data:', error);
      toast.error('Failed to load project schedule');
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
    setCreateTaskOpen(true);
  };

  const handleUpdateDependencies = async (taskId: string, dependencies: string[]) => {
    await handleUpdateTask(taskId, { dependencies });
  };

  const handleBulkTaskUpdate = async (updates: { taskId: string; updates: Partial<Task> }[]) => {
    try {
      const updatePromises = updates.map(async ({ taskId, updates: taskUpdates }) => {
        const updateData: any = {};
        if (taskUpdates.startDate) updateData.start_date = taskUpdates.startDate.toISOString().split('T')[0];
        if (taskUpdates.endDate) updateData.end_date = taskUpdates.endDate.toISOString().split('T')[0];
        if (taskUpdates.status) updateData.status = taskUpdates.status;
        if (taskUpdates.progress !== undefined) updateData.progress = taskUpdates.progress;

        const { error } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', taskId);

        if (error) throw error;
        return { taskId, updates: taskUpdates };
      });

      const results = await Promise.all(updatePromises);
      
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

  return (
    <div className="space-y-6">
      {/* Enhanced Project Schedule Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Advanced Project Schedule
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                onClick={() => setResourceLevelingOpen(true)} 
                variant="outline"
                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <Users className="w-4 h-4 mr-2" />
                Resource Leveling
              </Button>
              <Button 
                onClick={() => setWeatherAdjusterOpen(true)} 
                variant="outline"
                className="bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
              >
                <CloudRain className="w-4 h-4 mr-2" />
                Weather Adjustments
              </Button>
              <Button 
                onClick={() => setCreateTaskOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
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
                  tasks={tasks}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onEditDependencies={setDependencyTask}
                  projects={projects}
                  selectedProjects={[projectId]}
                  dateRange={{
                    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    to: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                  }}
                  showDependencies={true}
                  showCriticalPath={false}
                  showMilestones={false}
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
                  tasks={tasks}
                  projects={projects}
                  onTaskUpdate={handleUpdateTask}
                  onTaskDelete={handleDeleteTask}
                  onAddTask={handleAddTaskToStatus}
                  onTaskCreated={fetchProjectAndTasks}
                  onEditTask={setEditTask}
                  onEditDependencies={setDependencyTask}
                />
              )}
            </TabsContent>

            <TabsContent value="calendar">
              <ScheduleCalendar 
                tasks={tasks}
                projects={projects}
                currentDate={new Date()}
                onDateChange={() => {}}
                onTaskUpdate={handleUpdateTask}
              />
            </TabsContent>

            <TabsContent value="critical">
              <EnhancedCriticalPath 
                tasks={tasks}
                projects={projects}
                selectedProjects={[projectId]}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Task Creation Dialog */}
      <CreateTaskDialog
        projects={projects}
        tasks={tasks}
        onTaskCreated={() => {
          fetchProjectAndTasks();
          setCreateTaskOpen(false);
        }}
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
      />

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

      {/* Resource Leveling Manager */}
      <ResourceLevelingManager
        open={resourceLevelingOpen}
        onOpenChange={setResourceLevelingOpen}
        tasks={tasks}
        onUpdateTasks={handleBulkTaskUpdate}
      />

      {/* Weather Schedule Adjuster */}
      <WeatherScheduleAdjuster
        open={weatherAdjusterOpen}
        onOpenChange={setWeatherAdjusterOpen}
        tasks={tasks}
        onUpdateTasks={handleBulkTaskUpdate}
      />
    </div>
  );
}
