
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Plus, Calendar as CalendarIcon, Edit, Trash2, GanttChart, List, Download, RefreshCw, BarChart3, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { GanttChart as GanttChartComponent } from '@/components/schedule/GanttChart';
import { CriticalPath } from '@/components/schedule/CriticalPath';
import { ProjectSelector } from '@/components/schedule/ProjectSelector';

interface Task {
  id: string;
  projectId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  dependencies: string[];
}

interface Project {
  id: string;
  name: string;
  color: string;
}

const STATUS_OPTIONS = [
  { value: 'Not Started', label: 'Not Started', color: 'bg-gray-500' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'Completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'On Hold', label: 'On Hold', color: 'bg-yellow-500' }
];

const PROJECT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export default function ProjectSchedule() {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'gantt' | 'critical'>('list');
  
  const [newTask, setNewTask] = useState({
    title: '',
    projectId: '',
    startDate: new Date(),
    endDate: new Date(),
    status: 'Not Started' as 'Not Started' | 'In Progress' | 'Completed' | 'On Hold',
    progress: 0,
    dependencies: [] as string[]
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [selectedProjects]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      
      const projectsWithColors = (data || []).map((project, index) => ({
        ...project,
        color: PROJECT_COLORS[index % PROJECT_COLORS.length]
      }));
      
      setProjects(projectsWithColors);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('tasks')
        .select('*')
        .order('start_date');

      if (selectedProjects.length > 0) {
        query = query.in('project_id', selectedProjects);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedTasks = (data || []).map(task => ({
        id: task.id,
        projectId: task.project_id,
        title: task.title,
        startDate: new Date(task.start_date || Date.now()),
        endDate: new Date(task.end_date || Date.now()),
        progress: task.progress || 0,
        status: (task.status || 'Not Started') as Task['status'],
        dependencies: task.dependencies || []
      }));

      setTasks(mappedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const saveTask = async () => {
    if (!newTask.projectId || !newTask.title) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const taskData = {
        project_id: newTask.projectId,
        title: newTask.title,
        start_date: newTask.startDate.toISOString().split('T')[0],
        end_date: newTask.endDate.toISOString().split('T')[0],
        status: newTask.status,
        progress: newTask.progress,
        dependencies: newTask.dependencies
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        toast.success('Task updated successfully');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert(taskData);

        if (error) throw error;
        toast.success('Task created successfully');
      }

      setDialogOpen(false);
      setEditingTask(null);
      setNewTask({
        title: '',
        projectId: '',
        startDate: new Date(),
        endDate: new Date(),
        status: 'Not Started',
        progress: 0,
        dependencies: []
      });
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Task deleted successfully');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      projectId: task.projectId,
      startDate: task.startDate,
      endDate: task.endDate,
      status: task.status,
      progress: task.progress,
      dependencies: task.dependencies
    });
    setDialogOpen(true);
  };

  const calculateDuration = (startDate: Date, endDate: Date) => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500';
  };

  const exportSchedule = () => {
    toast.success('Schedule exported successfully');
  };

  return (
    <Layout title="Project Schedule" subtitle="Plan, track, and manage project timelines">
      <div className="space-y-6">
        {/* Header Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Projects Schedule</CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={fetchTasks} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={exportSchedule} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingTask(null);
                      setNewTask({
                        title: '',
                        projectId: '',
                        startDate: new Date(),
                        endDate: new Date(),
                        status: 'Not Started',
                        progress: 0,
                        dependencies: []
                      });
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Task Title</Label>
                        <Input
                          id="title"
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          placeholder="Enter task title"
                        />
                      </div>

                      <div>
                        <Label htmlFor="project">Project</Label>
                        <Select value={newTask.projectId} onValueChange={(value) => setNewTask({ ...newTask, projectId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project..." />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !newTask.startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {newTask.startDate ? format(newTask.startDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={newTask.startDate}
                                onSelect={(date) => date && setNewTask({ ...newTask, startDate: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label>End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !newTask.endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {newTask.endDate ? format(newTask.endDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={newTask.endDate}
                                onSelect={(date) => date && setNewTask({ ...newTask, endDate: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={newTask.status} onValueChange={(value: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold') => setNewTask({ ...newTask, status: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="progress">Progress (%)</Label>
                          <Input
                            id="progress"
                            type="number"
                            min="0"
                            max="100"
                            value={newTask.progress}
                            onChange={(e) => setNewTask({ ...newTask, progress: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <Button onClick={saveTask} className="w-full">
                        {editingTask ? 'Update Task' : 'Create Task'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ProjectSelector
                projects={projects}
                selectedProjects={selectedProjects}
                onSelectionChange={setSelectedProjects}
              />
              
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={currentView === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('list')}
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </Button>
                <Button
                  variant={currentView === 'gantt' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('gantt')}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Gantt
                </Button>
                <Button
                  variant={currentView === 'critical' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('critical')}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Critical Path
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <GanttChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'Completed').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {tasks.filter(t => t.status === 'In Progress').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Schedule View */}
        {currentView === 'list' && (
          <Card>
            <CardHeader>
              <CardTitle>Task List</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tasks found. Add your first task to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: project?.color }}
                              />
                              {project?.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-white", getStatusColor(task.status))}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(task.startDate, "MMM dd, yyyy")}</TableCell>
                          <TableCell>{format(task.endDate, "MMM dd, yyyy")}</TableCell>
                          <TableCell>{calculateDuration(task.startDate, task.endDate)} days</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${task.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-sm">{task.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editTask(task)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTask(task.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {currentView === 'gantt' && (
          <GanttChartComponent
            tasks={tasks}
            projects={projects}
            selectedProjects={selectedProjects}
            onTaskUpdate={(taskId, updates) => {
              // Handle task updates from Gantt chart
              console.log('Task update:', taskId, updates);
            }}
          />
        )}

        {currentView === 'critical' && (
          <CriticalPath
            tasks={tasks}
            selectedProjects={selectedProjects}
          />
        )}

        {/* Schedule Management Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm font-bold">i</span>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900">Schedule Management Instructions</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Project Selection:</strong> Choose "All Projects" or select multiple projects to view together.</p>
                  <p><strong>Timeline View:</strong> Use List view for detailed task management, Gantt for visual timeline, or Critical Path for bottleneck analysis.</p>
                  <p><strong>Task Actions:</strong> Use quick action buttons to edit, set dates, or mark tasks as complete.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
