import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Plus, Calendar, Clock, User, Flag } from 'lucide-react';
import { Task } from '@/types';
import { format } from 'date-fns';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskQuickActions } from './TaskQuickActions';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface PlannerBoardProps {
  tasks: Task[];
  projects: Project[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onAddTask: (status: Task['status']) => void;
  onTaskCreated: () => void;
  onEditTask?: (task: Task) => void;
  onEditDependencies?: (task: Task) => void;
}

const statusColumns: { status: Task['status']; title: string; color: string }[] = [
  { status: 'Not Started', title: 'To Do', color: 'bg-gray-100' },
  { status: 'In Progress', title: 'In Progress', color: 'bg-blue-100' },
  { status: 'Completed', title: 'Done', color: 'bg-green-100' },
  { status: 'On Hold', title: 'On Hold', color: 'bg-yellow-100' }
];

export function PlannerBoard({ 
  tasks, 
  projects, 
  onTaskUpdate, 
  onTaskDelete, 
  onAddTask, 
  onTaskCreated,
  onEditTask,
  onEditDependencies 
}: PlannerBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<Task['status']>('Not Started');

  const getProjectColor = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || '#3b82f6';
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (progress: number) => {
    if (progress === 0) return 'text-red-600';
    if (progress < 50) return 'text-yellow-600';
    if (progress < 100) return 'text-blue-600';
    return 'text-green-600';
  };

  const getPriorityIcon = (progress: number) => {
    if (progress === 0) return <Flag className="w-3 h-3 text-red-600" />;
    if (progress < 50) return <Clock className="w-3 h-3 text-yellow-600" />;
    if (progress < 100) return <Clock className="w-3 h-3 text-blue-600" />;
    return <Flag className="w-3 h-3 text-green-600" />;
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      onTaskUpdate(draggedTask.id, { status: newStatus });
    }
    setDraggedTask(null);
  };

  const handleAddTask = (status: Task['status']) => {
    setDefaultStatus(status);
    setShowCreateDialog(true);
  };

  const handleTaskCreated = () => {
    onTaskCreated();
    setShowCreateDialog(false);
  };

  const handleEdit = (task: Task) => {
    if (onEditTask) {
      onEditTask(task);
    }
  };

  const handleEditDependencies = (task: Task) => {
    if (onEditDependencies) {
      onEditDependencies(task);
    }
  };

  return (
    <>
      <div className="flex gap-6 h-full overflow-x-auto pb-6">
        {statusColumns.map((column) => {
          const columnTasks = getTasksByStatus(column.status);
          
          return (
            <div
              key={column.status}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              <div className={`rounded-t-lg p-4 ${column.color} border-b-2 border-gray-200`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{column.title}</h3>
                    <Badge variant="outline" className="bg-white">
                      {columnTasks.length}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddTask(column.status)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-gray-50 min-h-96 p-4 space-y-3 rounded-b-lg">
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-move hover:shadow-md transition-shadow bg-white border-l-4"
                    style={{ borderLeftColor: getProjectColor(task.projectId) }}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Task Title */}
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm leading-tight pr-2">
                            {task.title}
                          </h4>
                          <TaskQuickActions
                            task={task}
                            onEdit={handleEdit}
                            onDelete={onTaskDelete}
                            onEditDependencies={handleEditDependencies}
                          />
                        </div>

                        {/* Project Badge */}
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getProjectColor(task.projectId) }}
                          />
                          <span className="text-xs text-gray-600 truncate">
                            {getProjectName(task.projectId)}
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} className="h-1" />
                        </div>

                        {/* Dates and Priority */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(task.startDate, 'MMM dd')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {getPriorityIcon(task.progress)}
                          </div>
                        </div>

                        {/* Due Date */}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>Due: {format(task.endDate, 'MMM dd, yyyy')}</span>
                        </div>

                        {/* Dependencies indicator */}
                        {task.dependencies && task.dependencies.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <span>⚡ {task.dependencies.length} dependencies</span>
                          </div>
                        )}

                        {/* Assignee (placeholder) */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">Assigned</span>
                          </div>
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {task.title.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-sm">No tasks</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddTask(column.status)}
                      className="mt-2 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add task
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CreateTaskDialog
        projects={projects}
        tasks={tasks}
        onTaskCreated={handleTaskCreated}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultStatus={defaultStatus}
      />
    </>
  );
}
