
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, CheckSquare, X } from 'lucide-react';
import { Task } from '@/types';
import { toast } from 'sonner';

interface BulkTaskOperationsProps {
  selectedTasks: string[];
  tasks: Task[];
  onClearSelection: () => void;
  onBulkUpdate: (taskIds: string[], updates: Partial<Task>) => Promise<void>;
  onBulkDelete: (taskIds: string[]) => Promise<void>;
}

export function BulkTaskOperations({
  selectedTasks,
  tasks,
  onClearSelection,
  onBulkUpdate,
  onBulkDelete
}: BulkTaskOperationsProps) {
  const [bulkStatus, setBulkStatus] = useState<Task['status'] | ''>('');

  if (selectedTasks.length === 0) return null;

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) return;
    
    try {
      await onBulkUpdate(selectedTasks, { status: bulkStatus });
      toast.success(`Updated ${selectedTasks.length} tasks`);
      onClearSelection();
      setBulkStatus('');
    } catch (error) {
      toast.error('Failed to update tasks');
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) {
      try {
        await onBulkDelete(selectedTasks);
        toast.success(`Deleted ${selectedTasks.length} tasks`);
        onClearSelection();
      } catch (error) {
        toast.error('Failed to delete tasks');
      }
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {selectedTasks.length} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as Task['status'])}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Not Started">Not Started</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatus}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              Update
            </Button>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
