
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, AlertTriangle, Calendar } from 'lucide-react';
import { addBusinessDays } from '@/utils/businessDays';
import { Task } from '@/types';
import { format } from 'date-fns';

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
  const [delayStartDate, setDelayStartDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [loading, setLoading] = useState(false);

  const handleApplyDelay = async () => {
    if (delayDays === 0) return;
    
    setLoading(true);
    
    try {
      const startDate = new Date(delayStartDate);
      
      const taskUpdates = tasks
        .filter(task => task.startDate >= startDate) // Only delay tasks starting on or after the delay date
        .map(task => ({
          taskId: task.id,
          updates: {
            startDate: addBusinessDays(task.startDate, delayDays),
            endDate: addBusinessDays(task.endDate, delayDays)
          }
        }));
      
      onUpdateTasks(taskUpdates);
      onOpenChange(false);
      setDelayDays(0);
      setDelayStartDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      console.error('Error applying delay:', error);
    } finally {
      setLoading(false);
    }
  };

  const affectedTasksCount = tasks.filter(task => 
    task.startDate >= new Date(delayStartDate)
  ).length;

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
              This will shift tasks starting on or after the selected date by the specified number of business days.
              Weekends and holidays are automatically excluded.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="delay-start-date">Delay Start Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="delay-start-date"
                type="date"
                value={delayStartDate}
                onChange={(e) => setDelayStartDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
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
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              <div className="font-medium">Impact Summary:</div>
              <div>• {affectedTasksCount} tasks will be delayed</div>
              <div>• Tasks starting from {format(new Date(delayStartDate), 'MMM dd, yyyy')} onwards</div>
              <div>• Each task shifted by {delayDays} business days</div>
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
              {loading ? 'Applying...' : `Apply Delay to ${affectedTasksCount} Tasks`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
