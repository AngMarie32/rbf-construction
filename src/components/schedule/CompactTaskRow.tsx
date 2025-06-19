
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  progress: number;
  assignee?: string;
}

interface CompactTaskRowProps {
  task: Task;
}

export function CompactTaskRow({ task }: CompactTaskRowProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Not Started': return 'bg-gray-500';
      case 'On Hold': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm truncate flex-1">{task.title}</h4>
        <Badge className={`${getStatusColor(task.status)} text-white text-xs`}>
          {task.status}
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-2">
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          {format(new Date(task.start_date), 'MMM dd')}
        </div>
        <div className="flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {format(new Date(task.end_date), 'MMM dd')}
        </div>
        {task.assignee && (
          <div className="flex items-center">
            <User className="w-3 h-3 mr-1" />
            {task.assignee}
          </div>
        )}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className="bg-blue-600 h-1.5 rounded-full transition-all"
          style={{ width: `${task.progress || 0}%` }}
        />
      </div>
    </div>
  );
}
