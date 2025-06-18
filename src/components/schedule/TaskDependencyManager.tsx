
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { Task } from '@/types';

interface TaskDependencyManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  tasks: Task[];
  onUpdateDependencies: (taskId: string, dependencies: string[]) => void;
}

export function TaskDependencyManager({
  open,
  onOpenChange,
  task,
  tasks,
  onUpdateDependencies
}: TaskDependencyManagerProps) {
  const [selectedDependency, setSelectedDependency] = useState('');
  
  if (!task) return null;

  const availableTasks = tasks.filter(t => 
    t.id !== task.id && 
    !task.dependencies.includes(t.id)
  );

  const dependentTasks = tasks.filter(t => task.dependencies.includes(t.id));

  const addDependency = () => {
    if (selectedDependency) {
      const newDependencies = [...task.dependencies, selectedDependency];
      onUpdateDependencies(task.id, newDependencies);
      setSelectedDependency('');
    }
  };

  const removeDependency = (dependencyId: string) => {
    const newDependencies = task.dependencies.filter(id => id !== dependencyId);
    onUpdateDependencies(task.id, newDependencies);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Dependencies for "{task.title}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Add Dependency</Label>
            <div className="flex gap-2 mt-2">
              <Select value={selectedDependency} onValueChange={setSelectedDependency}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select task..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks.map((availableTask) => (
                    <SelectItem key={availableTask.id} value={availableTask.id}>
                      {availableTask.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addDependency} disabled={!selectedDependency}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Current Dependencies</Label>
            <div className="mt-2 space-y-2">
              {dependentTasks.length > 0 ? (
                dependentTasks.map((depTask) => (
                  <div key={depTask.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{depTask.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDependency(depTask.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No dependencies set</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
