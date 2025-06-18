
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MoreHorizontal, Edit, Trash2, Calendar, Clock, Link } from 'lucide-react';
import { Task } from '@/types';
import { format, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface GanttChartProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onEditDependencies?: (task: Task) => void;
  projects: Project[];
  selectedProjects: string[];
  dateRange: { from: Date; to: Date };
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  showMilestones?: boolean;
}

export function GanttChart({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onEditDependencies,
  projects,
  selectedProjects,
  dateRange,
  showDependencies = false,
  showCriticalPath = false,
  showMilestones = false
}: GanttChartProps) {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  
  const getProjectColor = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || '#3b82f6';
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  // Generate date columns for the timeline
  const timelineDays = eachDayOfInterval({
    start: dateRange.from,
    end: dateRange.to
  });

  const getTaskPosition = (task: Task) => {
    const totalDays = differenceInDays(dateRange.to, dateRange.from) + 1;
    const taskStart = differenceInDays(task.startDate, dateRange.from);
    const taskDuration = differenceInDays(task.endDate, task.startDate) + 1;
    
    return {
      left: Math.max(0, (taskStart / totalDays) * 100),
      width: Math.min(100, (taskDuration / totalDays) * 100)
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500';
      case 'In Progress': return 'bg-blue-500';
      case 'On Hold': return 'bg-yellow-500';
      case 'Not Started': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {/* Header */}
          <div className="flex border-b bg-gray-50">
            <div className="w-80 p-4 border-r bg-white">
              <h3 className="font-semibold">Task</h3>
            </div>
            <div className="flex-1 flex">
              {timelineDays.map((day, index) => (
                <div 
                  key={day.toISOString()} 
                  className={`flex-1 min-w-[40px] p-2 text-xs text-center border-r ${
                    index % 7 === 0 ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium">{format(day, 'dd')}</div>
                  <div className="text-gray-500">{format(day, 'EEE')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No tasks found for the selected date range and filters.
            </div>
          ) : (
            tasks.map((task) => {
              const position = getTaskPosition(task);
              
              return (
                <div key={task.id} className="flex border-b hover:bg-gray-50 group">
                  {/* Task Info */}
                  <div className="w-80 p-4 border-r bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate flex-1 mr-2">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEditDependencies && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditDependencies(task)}
                            className="h-6 w-6 p-0"
                            title="Edit Dependencies"
                          >
                            <Link className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => console.log('Edit task:', task)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteTask(task.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getProjectColor(task.projectId) }}
                      />
                      <span className="text-xs text-gray-600 truncate">
                        {getProjectName(task.projectId)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}</span>
                      <Badge variant="outline" className="text-xs">
                        {task.status}
                      </Badge>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="h-1" />
                    </div>

                    {showDependencies && task.dependencies.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">
                          Dependencies: {task.dependencies.length}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 relative p-4">
                    <div 
                      className={`absolute h-6 rounded ${getStatusColor(task.status)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                      style={{
                        left: `${position.left}%`,
                        width: `${position.width}%`,
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}
                      onMouseEnter={() => setHoveredTask(task.id)}
                      onMouseLeave={() => setHoveredTask(null)}
                      title={`${task.title} (${task.progress}%)`}
                    >
                      <div className="h-full w-full relative">
                        {/* Progress fill */}
                        <div 
                          className="h-full bg-black bg-opacity-20 rounded-l"
                          style={{ width: `${task.progress}%` }}
                        />
                        
                        {/* Task label */}
                        {hoveredTask === task.id && (
                          <div className="absolute -top-8 left-0 bg-black text-white text-xs p-1 rounded whitespace-nowrap z-10">
                            {task.title} - {task.progress}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dependencies lines */}
                    {showDependencies && task.dependencies.length > 0 && (
                      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        {task.dependencies.map((depId) => {
                          const depTask = tasks.find(t => t.id === depId);
                          if (!depTask) return null;
                          
                          const depPosition = getTaskPosition(depTask);
                          const currentPosition = getTaskPosition(task);
                          
                          return (
                            <svg
                              key={depId}
                              className="absolute top-0 left-0 w-full h-full"
                              style={{ zIndex: 1 }}
                            >
                              <line
                                x1={`${depPosition.left + depPosition.width}%`}
                                y1="50%"
                                x2={`${currentPosition.left}%`}
                                y2="50%"
                                stroke="#ef4444"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                              />
                            </svg>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
