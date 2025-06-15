
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { Task } from '@/types';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  color: string;
  client?: string;
  contractValue?: number;
  status?: string;
}

interface EnhancedTaskListProps {
  tasks: Task[];
  projects: Project[];
  loading: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
}

export function EnhancedTaskList({
  tasks,
  projects,
  loading,
  onTaskUpdate,
  onTaskDelete,
  onTaskEdit
}: EnhancedTaskListProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const getTaskPriority = (task: Task): 'high' | 'medium' | 'low' => {
    const today = new Date();
    const daysUntilDue = Math.ceil((task.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 'high'; // Overdue
    if (daysUntilDue <= 3) return 'high'; // Due soon
    if (daysUntilDue <= 7) return 'medium'; // Due this week
    return 'low'; // Due later
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Not Started':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks(prev => [...prev, taskId]);
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(tasks.map(t => t.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleBulkStatusUpdate = (status: Task['status']) => {
    selectedTasks.forEach(taskId => {
      onTaskUpdate(taskId, { status });
    });
    setSelectedTasks([]);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading tasks...</div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            No tasks found. Try adjusting your filters or add some tasks.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Task List
            <Badge variant="outline" className="ml-2">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedTasks.length} selected
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate('In Progress')}
                  className="text-xs"
                >
                  Mark In Progress
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate('Completed')}
                  className="text-xs"
                >
                  Mark Complete
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Select All */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Checkbox
            checked={selectedTasks.length === tasks.length}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-gray-600">Select all tasks</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {tasks.map((task) => {
            const project = projects.find(p => p.id === task.projectId);
            const priority = getTaskPriority(task);
            const isSelected = selectedTasks.includes(task.id);
            
            return (
              <div 
                key={task.id} 
                className={cn(
                  "flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors",
                  isSelected && "bg-blue-50 border-blue-200"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
                />
                
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Priority Icon */}
                  {getPriorityIcon(priority)}
                  
                  {/* Project Color */}
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: project?.color || '#gray' }}
                  />
                  
                  {/* Task Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-sm truncate">{task.title}</div>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs px-2 py-0", getStatusColor(task.status))}
                      >
                        {task.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{project?.name}</span>
                      </span>
                      <span>
                        {format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}
                      </span>
                      <span>
                        {Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={task.progress} className="flex-1 h-2" />
                      <span className="text-xs text-gray-500 w-8">{task.progress}%</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onTaskEdit(task)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                    onClick={() => onTaskDelete(task.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
