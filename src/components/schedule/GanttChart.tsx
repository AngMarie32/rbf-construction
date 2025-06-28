
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { Task } from '@/types';
import { TaskQuickActions } from './TaskQuickActions';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface GanttChartProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  onEditDependencies: (task: Task) => void;
  projects: Project[];
  selectedProjects: string[];
  dateRange: { from: Date; to: Date };
  showDependencies: boolean;
  showCriticalPath: boolean;
  showMilestones: boolean;
}

export function GanttChart({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onEditDependencies,
  projects,
  selectedProjects,
  dateRange,
  showDependencies,
  showCriticalPath,
  showMilestones
}: GanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => selectedProjects.includes(task.projectId));
  }, [tasks, selectedProjects]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  }, [dateRange]);

  const getProjectColor = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || '#3b82f6';
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'Completed': return '#10b981';
      case 'In Progress': return '#3b82f6';
      case 'On Hold': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const calculateTaskPosition = (task: Task) => {
    const totalDays = days.length;
    const taskStartIndex = days.findIndex(day => 
      day.toDateString() === task.startDate.toDateString()
    );
    const taskEndIndex = days.findIndex(day => 
      day.toDateString() === task.endDate.toDateString()
    );
    
    if (taskStartIndex === -1 || taskEndIndex === -1) return null;
    
    const left = (taskStartIndex / totalDays) * 100;
    const width = ((taskEndIndex - taskStartIndex + 1) / totalDays) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Gantt Chart</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addDays(currentDate, -30))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">
                {format(dateRange.from, 'MMM yyyy')} - {format(dateRange.to, 'MMM yyyy')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addDays(currentDate, 30))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Date headers */}
              <div className="flex mb-2">
                <div className="w-80 flex-shrink-0"></div>
                <div className="flex-1 flex">
                  {days.map(day => (
                    <div
                      key={day.toISOString()}
                      className={`flex-1 text-center text-xs p-1 border-r ${
                        isWeekend(day) ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div>{format(day, 'dd')}</div>
                      <div className="text-gray-500">{format(day, 'EEE')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                {filteredTasks.map(task => {
                  const position = calculateTaskPosition(task);
                  if (!position) return null;

                  return (
                    <div key={task.id} className="flex items-center border-b pb-2">
                      {/* Task info */}
                      <div className="w-80 flex-shrink-0 pr-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{task.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="secondary"
                                style={{ backgroundColor: `${getProjectColor(task.projectId)}20` }}
                              >
                                {projects.find(p => p.id === task.projectId)?.name}
                              </Badge>
                              <Badge variant="outline">
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                          <TaskQuickActions
                            task={task}
                            onEdit={handleTaskEdit}
                            onDelete={onDeleteTask}
                            onEditDependencies={onEditDependencies}
                          />
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="flex-1 relative h-8">
                        {/* Background grid */}
                        <div className="absolute inset-0 flex">
                          {days.map(day => (
                            <div
                              key={day.toISOString()}
                              className={`flex-1 border-r h-full ${
                                isWeekend(day) ? 'bg-gray-50' : ''
                              }`}
                            />
                          ))}
                        </div>

                        {/* Task bar */}
                        <div
                          className="absolute top-1 h-6 rounded flex items-center px-2 text-white text-xs font-medium"
                          style={{
                            left: position.left,
                            width: position.width,
                            backgroundColor: getStatusColor(task.status),
                            minWidth: '60px'
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate">{task.progress}%</span>
                            <div
                              className="h-1 bg-white bg-opacity-50 rounded-full ml-2"
                              style={{ width: '30px' }}
                            >
                              <div
                                className="h-1 bg-white rounded-full"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTasks.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks to display for the selected projects and date range.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
