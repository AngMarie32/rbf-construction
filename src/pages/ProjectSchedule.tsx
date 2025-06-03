import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { QuickPlanner } from '@/components/schedule/QuickPlanner';
import { TemplateManager } from '@/components/schedule/TemplateManager';
import { GanttChart } from '@/components/schedule/GanttChart';
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';
import { ProjectSelector } from '@/components/schedule/ProjectSelector';
import { CriticalPath } from '@/components/schedule/CriticalPath';
import { exportToPDF, exportCSV } from '@/utils/pdfExport';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Download, 
  Filter, 
  Search,
  Clock,
  Target,
  Link,
  File,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface Project {
  id: string;
  name: string;
  color: string;
}

const PROJECT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export default function ProjectSchedule() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: addDays(new Date(), 90)
  });
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('gantt');
  
  // Feature toggles
  const [showDependencies, setShowDependencies] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  
  // Dialog states
  const [quickPlannerOpen, setQuickPlannerOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState(false);
  
  // New task form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    projectId: '',
    startDate: new Date(),
    duration: 1,
    useDuration: true // Toggle between duration and end date
  });

  const [loading, setLoading] = useState(true);

  // For template integration with QuickPlanner
  const [templateTasks, setTemplateTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchTasks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, selectedProjects, searchQuery, dateRange]);

  useEffect(() => {
    updateDateRangeForViewMode();
  }, [viewMode, currentDate]);

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
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('start_date');

      if (error) throw error;

      const tasksWithDates = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        startDate: new Date(task.start_date),
        endDate: new Date(task.end_date),
        progress: task.progress || 0,
        status: task.status || 'Not Started',
        projectId: task.project_id,
        dependencies: task.dependencies || [],
        duration: Math.ceil((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
        isCritical: false
      }));

      setTasks(tasksWithDates);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const updateDateRangeForViewMode = () => {
    let from: Date;
    let to: Date;

    switch (viewMode) {
      case 'week':
        from = startOfWeek(currentDate);
        to = endOfWeek(currentDate);
        break;
      case 'month':
        from = startOfMonth(currentDate);
        to = endOfMonth(currentDate);
        break;
      case 'quarter':
        from = startOfQuarter(currentDate);
        to = endOfQuarter(currentDate);
        break;
      default:
        from = startOfMonth(currentDate);
        to = endOfMonth(currentDate);
    }

    setDateRange({ from, to });
  };

  const applyFilters = () => {
    let filtered = tasks;

    // Filter by selected projects
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(task => selectedProjects.includes(task.projectId));
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by date range
    filtered = filtered.filter(task => {
      return task.startDate >= dateRange.from && task.startDate <= dateRange.to;
    });

    setFilteredTasks(filtered);
  };

  const addNewTask = async () => {
    if (!newTask.title || !newTask.projectId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const endDate = new Date(newTask.startDate);
      if (newTask.useDuration) {
        endDate.setDate(endDate.getDate() + newTask.duration - 1);
      }

      const { error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          project_id: newTask.projectId,
          start_date: newTask.startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'Not Started',
          progress: 0,
          dependencies: []
        });

      if (error) throw error;

      toast.success('Task added successfully');
      setNewTaskDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        projectId: '',
        startDate: new Date(),
        duration: 1,
        useDuration: true
      });
      fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updatedTask = { ...task, ...updates };
      
      const { error } = await supabase
        .from('tasks')
        .update({
          progress: updatedTask.progress,
          status: updatedTask.status
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? updatedTask : t)
      );
      
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleQuickPlannerTasksAdded = (newTasks: any[]) => {
    fetchTasks();
    setQuickPlannerOpen(false);
    toast.success(`${newTasks.length} tasks added successfully`);
  };

  const handleTemplateApplied = (templateTasks: any[]) => {
    // Store template tasks and open QuickPlanner
    setTemplateTasks(templateTasks);
    setQuickPlannerOpen(true);
    setTemplateManagerOpen(false);
    toast.success('Template loaded into Quick Planner');
  };

  const handleExport = async () => {
    try {
      if (activeTab === 'gantt') {
        await exportToPDF('gantt-chart', `project-schedule-gantt-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      } else if (activeTab === 'calendar') {
        await exportToPDF('schedule-calendar', `project-schedule-calendar-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      } else if (activeTab === 'critical-path') {
        await exportToPDF('critical-path-view', `project-schedule-critical-path-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      } else {
        // Export as CSV for list view
        const exportData = filteredTasks.map(task => ({
          'Task Name': task.title,
          'Project': projects.find(p => p.id === task.projectId)?.name || '',
          'Start Date': format(task.startDate, 'yyyy-MM-dd'),
          'End Date': format(task.endDate, 'yyyy-MM-dd'),
          'Duration': task.duration,
          'Progress': `${task.progress}%`,
          'Status': task.status
        }));
        exportCSV(exportData, `project-schedule-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      }
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export. Please try again.');
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 3 : -3));
        break;
    }
    
    setCurrentDate(newDate);
  };

  return (
    <Layout title="Project Schedule" subtitle="Manage project timelines and dependencies">
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setNewTaskDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
            <Button variant="outline" onClick={() => setQuickPlannerOpen(true)}>
              <Clock className="w-4 h-4 mr-2" />
              Quick Planner
            </Button>
            <Button variant="outline" onClick={() => setTemplateManagerOpen(true)}>
              <File className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <Label>View:</Label>
                <div className="flex border rounded-lg">
                  {['week', 'month', 'quarter'].map((mode) => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode(mode as 'week' | 'month' | 'quarter')}
                      className="capitalize rounded-none first:rounded-l-lg last:rounded-r-lg"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search Tasks</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by task name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <Label>Projects</Label>
                <ProjectSelector
                  projects={projects}
                  selectedProjects={selectedProjects}
                  onSelectionChange={setSelectedProjects}
                />
              </div>

              {/* Date Navigation - Fixed Layout */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateDate('prev')}
                    className="h-8 w-8 p-0 hover:bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-sm font-medium flex-1 text-center px-2">
                    {viewMode === 'week' && format(dateRange.from, 'MMM dd')}
                    {viewMode === 'month' && format(dateRange.from, 'MMM yyyy')}
                    {viewMode === 'quarter' && `Q${Math.ceil((dateRange.from.getMonth() + 1) / 3)} ${format(dateRange.from, 'yyyy')}`}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateDate('next')}
                    className="h-8 w-8 p-0 hover:bg-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-3">
                <Label>Display Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="dependencies"
                      checked={showDependencies}
                      onCheckedChange={setShowDependencies}
                    />
                    <Label htmlFor="dependencies" className="text-sm">Dependencies</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="critical-path"
                      checked={showCriticalPath}
                      onCheckedChange={setShowCriticalPath}
                    />
                    <Label htmlFor="critical-path" className="text-sm">Critical Path</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="milestones"
                      checked={showMilestones}
                      onCheckedChange={setShowMilestones}
                    />
                    <Label htmlFor="milestones" className="text-sm">Milestones</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(selectedProjects.length > 0 || searchQuery) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-sm font-medium">Active filters:</span>
                {selectedProjects.map(projectId => {
                  const project = projects.find(p => p.id === projectId);
                  return project ? (
                    <Badge key={projectId} variant="secondary" className="flex items-center gap-1">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </Badge>
                  ) : null;
                })}
                {searchQuery && (
                  <Badge variant="secondary">
                    Search: "{searchQuery}"
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Views */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="critical-path">Critical Path</TabsTrigger>
            <TabsTrigger value="list">Task List</TabsTrigger>
          </TabsList>

          <TabsContent value="gantt">
            <div id="gantt-chart">
              <GanttChart
                tasks={filteredTasks}
                projects={projects}
                selectedProjects={selectedProjects}
                onTaskUpdate={handleTaskUpdate}
                dateRange={dateRange}
                showDependencies={showDependencies}
                showCriticalPath={showCriticalPath}
                showMilestones={showMilestones}
              />
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div id="schedule-calendar">
              <ScheduleCalendar
                tasks={filteredTasks}
                projects={projects}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onTaskUpdate={handleTaskUpdate}
              />
            </div>
          </TabsContent>

          <TabsContent value="critical-path">
            <div id="critical-path-view">
              <CriticalPath
                tasks={filteredTasks}
                selectedProjects={selectedProjects}
              />
            </div>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Task List</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading tasks...</div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No tasks found. Try adjusting your filters or add some tasks.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((task) => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: project?.color || '#gray' }}
                            />
                            <div>
                              <div className="font-medium">{task.title}</div>
                              <div className="text-sm text-gray-500">
                                {project?.name} • {format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={task.status === 'Completed' ? 'default' : 'secondary'}
                            >
                              {task.status}
                            </Badge>
                            <span className="text-sm text-gray-500">{task.progress}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Instructions Panel */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Info className="w-5 h-5" />
              Quick Start Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Getting Started:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Use "Add Task" for individual tasks</li>
                  <li>• Use "Quick Planner" for bulk task entry</li>
                  <li>• Create templates for reusable task sets</li>
                  <li>• Filter by project and date range</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Features:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Toggle dependencies, critical path, and milestones</li>
                  <li>• Click tasks in Gantt chart to update progress</li>
                  <li>• Export current view as PDF or CSV</li>
                  <li>• Switch between week, month, and quarter views</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <QuickPlanner
        open={quickPlannerOpen}
        onOpenChange={setQuickPlannerOpen}
        projects={projects}
        onTasksAdded={handleQuickPlannerTasksAdded}
        templateTasks={templateTasks}
      />

      <TemplateManager
        open={templateManagerOpen}
        onOpenChange={setTemplateManagerOpen}
        onTemplateApplied={handleTemplateApplied}
      />

      {/* Add Task Dialog */}
      {newTaskDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
            <div className="space-y-4">
              <div>
                <Label>Task Name *</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task name"
                />
              </div>
              
              <div>
                <Label>Project *</Label>
                <Select 
                  value={newTask.projectId} 
                  onValueChange={(value) => setNewTask({ ...newTask, projectId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: project.color }}
                          />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(newTask.startDate, "PPP")}
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
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id="use-duration"
                    checked={newTask.useDuration}
                    onCheckedChange={(checked) => setNewTask({ ...newTask, useDuration: !!checked })}
                  />
                  <Label htmlFor="use-duration">Use duration (auto-calculate end date)</Label>
                </div>
                
                {newTask.useDuration ? (
                  <div>
                    <Label>Duration (Days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newTask.duration}
                      onChange={(e) => setNewTask({ ...newTask, duration: parseInt(e.target.value) || 1 })}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      End date: {format(addDays(newTask.startDate, newTask.duration - 1), 'PPP')}
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(addDays(newTask.startDate, newTask.duration - 1), "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={addDays(newTask.startDate, newTask.duration - 1)}
                          onSelect={(date) => {
                            if (date) {
                              const duration = Math.max(1, Math.ceil((date.getTime() - newTask.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                              setNewTask({ ...newTask, duration });
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={addNewTask} className="flex-1">Add Task</Button>
              <Button 
                variant="outline" 
                onClick={() => setNewTaskDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
