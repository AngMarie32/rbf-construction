
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Task } from '@/types';

interface TaskEditDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
}

export function TaskEditDialog({ task, open, onOpenChange, onSave }: TaskEditDialogProps) {
  const [startDate, setStartDate] = useState<Date>(task?.startDate || new Date());
  const [duration, setDuration] = useState<number>(
    task ? Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1
  );
  const [endDate, setEndDate] = useState<Date>(task?.endDate || new Date());
  const [useDuration, setUseDuration] = useState(true);

  React.useEffect(() => {
    if (task) {
      setStartDate(task.startDate);
      setEndDate(task.endDate);
      const calculatedDuration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setDuration(calculatedDuration);
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;

    const finalEndDate = useDuration 
      ? addDays(startDate, duration - 1)
      : endDate;

    onSave(task.id, {
      startDate,
      endDate: finalEndDate
    });
    onOpenChange(false);
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    if (useDuration) {
      setEndDate(addDays(startDate, newDuration - 1));
    }
  };

  const handleStartDateChange = (newStartDate: Date) => {
    setStartDate(newStartDate);
    if (useDuration) {
      setEndDate(addDays(newStartDate, duration - 1));
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task: {task.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
                  onSelect={(date) => date && handleStartDateChange(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="use-duration"
              checked={useDuration}
              onChange={() => setUseDuration(true)}
            />
            <Label htmlFor="use-duration">Use Duration</Label>
            <input
              type="radio"
              id="use-end-date"
              checked={!useDuration}
              onChange={() => setUseDuration(false)}
            />
            <Label htmlFor="use-end-date">Set End Date</Label>
          </div>

          {useDuration ? (
            <div>
              <Label>Duration (Days)</Label>
              <Input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                End date: {format(addDays(startDate, duration - 1), 'PPP')}
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
                    {format(endDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    disabled={(date) => date < startDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
