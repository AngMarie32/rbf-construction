
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Calendar as CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface QuickTask {
  id: string;
  item: string;
  description: string;
  startDate: Date;
  duration: number;
  dependencies: string[];
  projectId: string;
}

interface QuickPlannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onTasksAdded: (tasks: QuickTask[]) => void;
}

export function QuickPlanner({ open, onOpenChange, projects, onTasksAdded }: QuickPlannerProps) {
  const [tasks, setTasks] = useState<QuickTask[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const addTask = () => {
    const newTask: QuickTask = {
      id: `temp-${Date.now()}`,
      item: '',
      description: '',
      startDate: new Date(),
      duration: 1,
      dependencies: [],
      projectId: selectedProject
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (id: string, field: keyof QuickTask, value: any) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const saveTasks = async () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    if (tasks.length === 0) {
      toast.error('Please add at least one task');
      return;
    }

    const incompleteTasks = tasks.filter(task => !task.item || !task.description);
    if (incompleteTasks.length > 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const tasksToSave = tasks.map(task => {
        const endDate = new Date(task.startDate);
        endDate.setDate(endDate.getDate() + task.duration - 1);
        
        return {
          project_id: task.projectId,
          title: task.item,
          start_date: task.startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'Not Started',
          progress: 0,
          dependencies: task.dependencies
        };
      });

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToSave);

      if (error) throw error;

      onTasksAdded(tasks);
      setTasks([]);
      setSelectedProject('');
    } catch (error) {
      console.error('Error saving tasks:', error);
      toast.error('Failed to save tasks');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableDependencies = (currentTaskId: string) => {
    return tasks.filter(task => task.id !== currentTaskId && task.item);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Quick Planner - Bulk Task Entry</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto">
          {/* Project Selection */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Label className="font-medium">Project:</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a project..." />
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

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Quick Planner Instructions</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Enter tasks one by one with item name, description, start date, and duration</li>
              <li>• Duration is in days - the system will calculate the end date automatically</li>
              <li>• Dependencies can be set to other tasks in this batch</li>
              <li>• All tasks will be created with "Not Started" status</li>
            </ul>
          </div>

          {/* Tasks Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Item *</TableHead>
                  <TableHead className="w-80">Description *</TableHead>
                  <TableHead className="w-40">Start Date</TableHead>
                  <TableHead className="w-32">Duration (Days)</TableHead>
                  <TableHead className="w-48">Dependencies</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task, index) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Input
                        value={task.item}
                        onChange={(e) => updateTask(task.id, 'item', e.target.value)}
                        placeholder="Task name"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={task.description}
                        onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                        placeholder="Task description"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !task.startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {task.startDate ? format(task.startDate, "PPP") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={task.startDate}
                            onSelect={(date) => date && updateTask(task.id, 'startDate', date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={task.duration}
                        onChange={(e) => updateTask(task.id, 'duration', parseInt(e.target.value) || 1)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={task.dependencies[0] || ''} 
                        onValueChange={(value) => updateTask(task.id, 'dependencies', value ? [value] : [])}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select dependency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No dependency</SelectItem>
                          {getAvailableDependencies(task.id).map((depTask) => (
                            <SelectItem key={depTask.id} value={depTask.id}>
                              {depTask.item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(task.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No tasks added yet. Click "Add Task" to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              onClick={addTask}
              variant="outline"
              disabled={!selectedProject}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setTasks([]);
                  setSelectedProject('');
                  onOpenChange(false);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={saveTasks}
                disabled={saving || tasks.length === 0 || !selectedProject}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : `Save ${tasks.length} Tasks`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
