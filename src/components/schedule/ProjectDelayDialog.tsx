
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, AlertTriangle } from 'lucide-react';
import { addBusinessDays } from '@/utils/businessDays';
import { Task } from '@/types';

interface ProjectDelayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onUpdateTasks: (updates: { taskId: string; updates: Partial<Task> }[]) => void;
}

export function ProjectDelayDialog({
  open,
  onOpenChange,
  tasks,
  onUpdateTasks
}: ProjectDelayDialogProps) {
  const [delayDays, setDelayDays] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleApplyDelay = async () => {
    if (delayDays === 0) return;
    
    setLoading(true);
    
    try {
      const taskUpdates = tasks.map(task => ({
        taskId: task.id,
        updates: {
          startDate: addBusinessDays(task.startDate, delayDays),
          endDate: addBusinessDays(task.endDate, delayDays)
        }
      }));
      
      onUpdateTasks(taskUpdates);
      onOpenChange(false);
      setDelayDays(0);
    } catch (error) {
      console.error('Error applying delay:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Apply Project Delay
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will shift all tasks in the project by the specified number of business days.
              Weekends and holidays are automatically excluded.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="delay-days">Delay in Business Days</Label>
            <Input
              id="delay-days"
              type="number"
              value={delayDays}
              onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
              placeholder="Enter number of days"
              min="0"
            />
          </div>
          
          {delayDays > 0 && (
            <div className="text-sm text-gray-600">
              This will delay {tasks.length} tasks by {delayDays} business days.
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplyDelay}
              disabled={delayDays <= 0 || loading}
            >
              {loading ? 'Applying...' : 'Apply Delay'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
