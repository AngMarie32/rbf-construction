
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { MoreHorizontal, Edit, Trash2, Calendar, User, Clock } from 'lucide-react';
import { Task } from '@/types';
import { TaskPriorityIndicator, TaskPriority } from './TaskPriorityIndicator';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface EnhancedTaskListProps {
  tasks: Task[];
  projects: Project[];
  loading: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  selectedTasks?: string[];
  onSelectionChange?: (selectedTasks: string[]) => void;
}

export function EnhancedTaskList({
  tasks,
  projects,
  loading,
  onTaskUpdate,
  onTaskDelete,
  onTaskEdit,
  selectedTasks = [],
  onSelectionChange
}: EnhancedTaskListProps) {
  const [sortBy, setSortBy] = useState<'date' | 'progress' | 'status' | 'priority'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getProjectColor = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || '#3b82f6';
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Not Started': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Mock priority for demonstration - in real app this would come from the task data
  const getTaskPriority = (task: Task): TaskPriority => {
    if (task.progress > 75) return 'low';
    if (task.status === 'On Hold') return 'urgent';
    if (task.progress === 0) return 'high';
    return 'medium';
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedTasks, taskId]);
    } else {
      onSelectionChange(selectedTasks.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange(tasks.map(task => task.id));
    } else {
      onSelectionChange([]);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'date':
        aValue = a.startDate.getTime();
        bValue = b.startDate.getTime();
        break;
      case 'progress':
        aValue = a.progress;
        bValue = b.progress;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'priority':
        const priorities = { urgent: 4, high: 3, medium: 2, low: 1 };
        aValue = priorities[getTaskPriority(a)];
        bValue = priorities[getTaskPriority(b)];
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading tasks...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Task List</CardTitle>
          <div className="flex items-center gap-4">
            {onSelectionChange && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={tasks.length > 0 && selectedTasks.length === tasks.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="date">Date</option>
                <option value="progress">Progress</option>
                <option value="status">Status</option>
                <option value="priority">Priority</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {sortedTasks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No tasks found for the selected criteria.
          </div>
        ) : (
          <div className="space-y-0">
            {sortedTasks.map((task, index) => (
              <div
                key={task.id}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedTasks.includes(task.id) ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {onSelectionChange && (
                    <Checkbox
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                        <TaskPriorityIndicator priority={getTaskPriority(task)} />
                        <Badge variant="outline" className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTaskEdit(task)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTaskDelete(task.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getProjectColor(task.projectId) }}
                        />
                        <span>{getProjectName(task.projectId)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24))} days</span>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Progress</span>
                        <span className="text-sm font-medium">{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
