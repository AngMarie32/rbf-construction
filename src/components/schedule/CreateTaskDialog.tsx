
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Plus } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Task } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
}

interface CreateTaskDialogProps {
  projects: Project[];
  tasks: Task[];
  onTaskCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultStatus?: Task['status'];
}

export function CreateTaskDialog({ 
  projects, 
  tasks, 
  onTaskCreated, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  defaultStatus = 'Not Started'
}: CreateTaskDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [duration, setDuration] = useState(1);
  const [status, setStatus] = useState(defaultStatus);
  const [progress, setProgress] = useState(0);
  const [isCritical, setIsCritical] = useState(false);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Use controlled open state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange || setInternalOpen;

  useEffect(() => {
    setStatus(defaultStatus);
  }, [defaultStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const endDate = addDays(startDate, duration - 1);
      
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: title.trim(),
          project_id: projectId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status,
          progress,
          dependencies: selectedDependencies
        });

      if (error) throw error;

      toast.success('Task created successfully');
      onOpenChange(false);
      resetForm();
      onTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setProjectId('');
    setStartDate(new Date());
    setDuration(1);
    setStatus(defaultStatus);
    setProgress(0);
    setIsCritical(false);
    setSelectedDependencies([]);
  };

  const availableTasks = tasks.filter(t => t.projectId === projectId);

  const DialogWrapper = controlledOpen !== undefined ? 
    ({ children }: { children: React.ReactNode }) => <>{children}</> :
    Dialog;

  const TriggerButton = controlledOpen !== undefined ? null : (
    <DialogTrigger asChild>
      <Button className="flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add Task
      </Button>
    </DialogTrigger>
  );

  return (
    <DialogWrapper>
      {TriggerButton}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
              />
            </div>

            <div>
              <Label htmlFor="project">Project *</Label>
              <Select value={projectId} onValueChange={setProjectId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
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

            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="duration">Duration (Business Days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                End date: {format(addDays(startDate, duration - 1), 'PPP')}
              </p>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
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
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="critical"
                checked={isCritical}
                onCheckedChange={(checked) => setIsCritical(checked === true)}
              />
              <Label htmlFor="critical">Critical Task</Label>
            </div>

            {projectId && availableTasks.length > 0 && (
              <div>
                <Label>Task Dependencies</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableTasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dep-${task.id}`}
                        checked={selectedDependencies.includes(task.id)}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setSelectedDependencies([...selectedDependencies, task.id]);
                          } else {
                            setSelectedDependencies(selectedDependencies.filter(id => id !== task.id));
                          }
                        }}
                      />
                      <Label htmlFor={`dep-${task.id}`} className="text-sm">
                        {task.title}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Task'}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DialogWrapper>
  );
}
