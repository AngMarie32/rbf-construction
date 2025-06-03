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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar as CalendarIcon, Edit, Trash2, Download, RefreshCw, Search, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { CriticalPath } from '@/components/schedule/CriticalPath';
import { ProjectSelector } from '@/components/schedule/ProjectSelector';
import { QuickPlanner } from '@/components/schedule/QuickPlanner';

interface Task {
  id: string;
  projectId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  dependencies: string[];
  duration: number;
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
  const [quickPlannerOpen, setQuickPlannerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentView, setCurrentView] = useState<'gantt' | 'calendar' | 'list' | 'critical'>('gantt');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  const [viewMode, setViewMode] = useState<'Week' | 'Month' | 'Quarter'>('Week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    from: new Date(2025, 4, 1), // May 1, 2025
    to: new Date(2025, 11, 31)  // Dec 31, 2025
  });
  
  const [newTask, setNewTask] = useState({
    title: '',
    projectId: '',
    startDate: new Date(),
    endDate: new Date(),
    status: 'Not Started' as 'Not Started' | 'In Progress' | 'Completed' | 'On Hold',
    progress: 0,
    dependencies: [] as string[],
    duration: 1
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

      const mappedTasks = (data || []).map(task => {
        const startDate = new Date(task.start_date || Date.now());
        const endDate = new Date(task.end_date || Date.now());
        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        return {
          id: task.id,
          projectId: task.project_id,
          title: task.title,
          startDate,
          endDate,
          progress: task.progress || 0,
          status: (task.status || 'Not Started') as Task['status'],
          dependencies: task.dependencies || [],
          duration
        };
      });

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
        dependencies: [],
        duration: 1
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
      dependencies: task.dependencies,
      duration: task.duration
    });
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500';
  };

  const exportSchedule = () => {
    toast.success('Schedule exported successfully');
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || task.status === statusFilter;
    const matchesProject = selectedProjects.length === 0 || selectedProjects.includes(task.projectId);
    return matchesSearch && matchesStatus && matchesProject;
  });

  // Generate months for the timeline
  const months = eachMonthOfInterval({
    start: dateRange.from,
    end: dateRange.to
  });

  const getTaskPosition = (task: Task) => {
    const totalDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const taskStartDays = Math.ceil((task.startDate.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const taskDuration = task.duration;
    
    const leftPercent = Math.max(0, (taskStartDays / totalDays) * 100);
    const widthPercent = Math.min(100 - leftPercent, (taskDuration / totalDays) * 100);
    
    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  const handleBulkTasksAdded = (tasks: any[]) => {
    fetchTasks();
    setQuickPlannerOpen(false);
    toast.success(`${tasks.length} tasks added successfully`);
  };

  return (
    <Layout title="Project Schedule" subtitle="Manage and track project timelines and milestones">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-600">
          <span>Project Management</span>
          <span className="mx-2">›</span>
          <span>Tools</span>
          <span className="mx-2">›</span>
          <span className="text-blue-600">Schedule</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Project Schedule</h1>
          <p className="text-gray-600">Manage and track project timelines and milestones</p>
        </div>

        {/* View Tabs and Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Tabs value={currentView} onValueChange={(value: any) => setCurrentView(value)}>
                <TabsList>
                  <TabsTrigger value="gantt">Gantt</TabsTrigger>
                  <TabsTrigger value="calendar">Calendar</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                  <TabsTrigger value="critical">Critical Path</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <Button onClick={exportSchedule} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => {
                      setEditingTask(null);
                      setNewTask({
                        title: '',
                        projectId: '',
                        startDate: new Date(),
                        endDate: new Date(),
                        status: 'Not Started',
                        progress: 0,
                        dependencies: [],
                        duration: 1
                      });
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
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
                <Button onClick={() => setQuickPlannerOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  Quick Planner
                </Button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-4 mb-4">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-32">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(dateRange.from, "MM/dd/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-32">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(dateRange.to, "MM/dd/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Projects Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Projects</Label>
                <ProjectSelector
                  projects={projects}
                  selectedProjects={selectedProjects}
                  onSelectionChange={setSelectedProjects}
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Statuses">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 flex-1">
                <Label className="text-sm font-medium">Search</Label>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Active Date Range Badge */}
            <div className="mb-4">
              <Badge variant="secondary" className="text-sm">
                Date: {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")} ×
              </Badge>
            </div>

            {/* Options Checkboxes */}
            <div className="flex items-center gap-6 mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="critical-path" 
                  checked={showCriticalPath}
                  onCheckedChange={setShowCriticalPath}
                />
                <Label htmlFor="critical-path" className="text-sm">Show Critical Path</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="milestones" 
                  checked={showMilestones}
                  onCheckedChange={setShowMilestones}
                />
                <Label htmlFor="milestones" className="text-sm">Show Milestones</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="dependencies" 
                  checked={showDependencies}
                  onCheckedChange={setShowDependencies}
                />
                <Label htmlFor="dependencies" className="text-sm">Show Dependencies</Label>
              </div>
            </div>

            {/* View Mode Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(['Week', 'Month', 'Quarter'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className={viewMode === mode ? 'bg-blue-600 text-white' : ''}
                  >
                    {mode}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">Today</span>
                <Button variant="ghost" size="sm">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={currentView} onValueChange={(value: any) => setCurrentView(value)}>
          {/* Gantt View */}
          <TabsContent value="gantt">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8">Loading tasks...</div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No tasks found. Add your first task to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {/* Timeline Header */}
                    <div className="flex border-b bg-gray-50">
                      <div className="w-80 p-4 border-r font-semibold">Project / Task</div>
                      <div className="flex-1 flex">
                        {months.map((month, index) => (
                          <div 
                            key={index} 
                            className="flex-1 p-4 text-center border-r font-medium text-sm"
                          >
                            {format(month, 'MMM')}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Task Rows */}
                    <div className="max-h-96 overflow-y-auto">
                      {/* Group tasks by project */}
                      {projects
                        .filter(project => selectedProjects.length === 0 || selectedProjects.includes(project.id))
                        .map((project) => {
                          const projectTasks = filteredTasks.filter(task => task.projectId === project.id);
                          if (projectTasks.length === 0) return null;

                          return (
                            <div key={project.id}>
                              {/* Project Header */}
                              <div className="flex border-b bg-gray-50">
                                <div className="w-80 p-3 border-r">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: project.color }}
                                    />
                                    <span className="font-semibold">{project.name}</span>
                                    {projectTasks.length > 0 && (
                                      <span className="text-sm text-gray-500">
                                        ({Math.round(projectTasks.reduce((sum, task) => sum + task.progress, 0) / projectTasks.length)}%)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1 relative p-3">
                                  {projectTasks.length > 0 && (
                                    <div 
                                      className="absolute top-2 h-6 rounded flex items-center px-2 text-white text-xs font-medium"
                                      style={{ 
                                        backgroundColor: project.color,
                                        left: getTaskPosition(projectTasks[0]).left,
                                        width: `${Math.max(...projectTasks.map(t => {
                                          const pos = getTaskPosition(t);
                                          return parseFloat(pos.left.replace('%', '')) + parseFloat(pos.width.replace('%', ''));
                                        })) - Math.min(...projectTasks.map(t => parseFloat(getTaskPosition(t).left.replace('%', ''))))}%`
                                      }}
                                    >
                                      {project.name} ({Math.round(projectTasks.reduce((sum, task) => sum + task.progress, 0) / projectTasks.length)}%)
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Project Tasks */}
                              {projectTasks.map((task) => {
                                const position = getTaskPosition(task);
                                return (
                                  <div key={task.id} className="flex border-b hover:bg-gray-50">
                                    <div className="w-80 p-3 border-r">
                                      <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 flex items-center justify-center">
                                          <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
                                        </div>
                                        <span className="font-medium text-sm">{task.title}</span>
                                      </div>
                                    </div>
                                    <div className="flex-1 relative h-12">
                                      <div className="flex h-full">
                                        {months.map((_, index) => (
                                          <div key={index} className="flex-1 border-r border-gray-100"></div>
                                        ))}
                                      </div>
                                      <div 
                                        className="absolute top-2 h-8 rounded flex items-center justify-between px-2 text-white text-xs font-medium cursor-pointer hover:opacity-80"
                                        style={{ 
                                          ...position,
                                          backgroundColor: project.color,
                                          minWidth: '60px'
                                        }}
                                        onClick={() => editTask(task)}
                                      >
                                        <span className="truncate">{task.title.split(' ')[0]}</span>
                                        {task.progress > 0 && (
                                          <span className="text-xs">({task.progress}%)</span>
                                        )}
                                      </div>
                                      {showDependencies && task.dependencies.length > 0 && (
                                        <div className="absolute top-10 left-2 text-xs text-gray-500">
                                          ↳ Dependencies: {task.dependencies.length}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs content */}
          <TabsContent value="calendar">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8 text-gray-500">
                  Calendar view will be implemented
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardContent className="p-6">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="critical">
            <CriticalPath
              tasks={filteredTasks}
              selectedProjects={selectedProjects}
            />
          </TabsContent>
        </Tabs>

        {/* Quick Planner Dialog */}
        <QuickPlanner
          open={quickPlannerOpen}
          onOpenChange={setQuickPlannerOpen}
          projects={projects}
          onTasksAdded={handleBulkTasksAdded}
        />
      </div>
    </Layout>
  );
}
