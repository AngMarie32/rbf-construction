
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, Link } from 'lucide-react';
import { Task } from '@/types';
import { format, differenceInDays, eachDayOfInterval, isWeekend } from 'date-fns';

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

// Common US holidays - you can expand this list as needed
const getHolidays = (year: number) => {
  return [
    new Date(year, 0, 1), // New Year's Day
    new Date(year, 6, 4), // Independence Day
    new Date(year, 10, 11), // Veterans Day
    new Date(year, 11, 25), // Christmas Day
    // Add more holidays as needed
  ];
};

const isHoliday = (date: Date) => {
  const holidays = getHolidays(date.getFullYear());
  return holidays.some(holiday => 
    holiday.getDate() === date.getDate() && 
    holiday.getMonth() === date.getMonth()
  );
};

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

  const getDayBackgroundClass = (day: Date, index: number) => {
    if (isHoliday(day)) {
      return 'bg-red-100 border-red-200';
    }
    if (isWeekend(day)) {
      return 'bg-blue-50 border-blue-200';
    }
    return 'bg-white border-gray-200';
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto" style={{ minWidth: '1000px' }}>
          {/* Header */}
          <div className="flex bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-10">
            <div className="w-80 px-4 py-3 border-r border-gray-300 bg-white font-semibold text-gray-700">
              Task Name
            </div>
            <div className="w-28 px-2 py-3 border-r border-gray-300 bg-white font-semibold text-gray-700 text-center text-xs">
              Start
            </div>
            <div className="w-28 px-2 py-3 border-r border-gray-300 bg-white font-semibold text-gray-700 text-center text-xs">
              Finish
            </div>
            <div className="w-24 px-2 py-3 border-r border-gray-300 bg-white font-semibold text-gray-700 text-center text-xs">
              % Complete
            </div>
            <div className="flex-1 relative">
              <div className="flex">
                {timelineDays.map((day, index) => (
                  <div 
                    key={day.toISOString()} 
                    className={`flex-1 min-w-[30px] p-2 text-xs text-center border-r ${getDayBackgroundClass(day, index)}`}
                  >
                    <div className="font-medium text-gray-600">{format(day, 'dd')}</div>
                    <div className={`text-[10px] ${isHoliday(day) ? 'text-red-600 font-medium' : isWeekend(day) ? 'text-blue-600' : 'text-gray-500'}`}>
                      {format(day, 'EEE')}
                    </div>
                    {isHoliday(day) && (
                      <div className="text-[8px] text-red-600 font-bold">
                        HOL
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task Rows */}
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white">
              No tasks found for the selected date range and filters.
            </div>
          ) : (
            tasks.map((task, taskIndex) => {
              const position = getTaskPosition(task);
              const isEvenRow = taskIndex % 2 === 0;
              
              return (
                <div key={task.id} className={`flex border-b border-gray-200 hover:bg-blue-50 group ${isEvenRow ? 'bg-white' : 'bg-gray-50'}`}>
                  {/* Task Info Column */}
                  <div className="w-80 px-4 py-3 border-r border-gray-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 flex-shrink-0">{taskIndex + 1}</span>
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {task.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: getProjectColor(task.projectId) }}
                          />
                          <span className="text-xs text-gray-600 truncate">
                            {getProjectName(task.projectId)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
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
                  </div>

                  {/* Start Date Column */}
                  <div className="w-28 px-2 py-3 border-r border-gray-300 text-center">
                    <span className="text-xs text-gray-700">{format(task.startDate, 'MM/dd/yy')}</span>
                  </div>

                  {/* End Date Column */}
                  <div className="w-28 px-2 py-3 border-r border-gray-300 text-center">
                    <span className="text-xs text-gray-700">{format(task.endDate, 'MM/dd/yy')}</span>
                  </div>

                  {/* Progress Column - Fixed width and better formatting */}
                  <div className="w-24 px-2 py-3 border-r border-gray-300 text-center">
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-xs font-medium text-gray-700 mb-1">{task.progress}%</span>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timeline Column */}
                  <div className="flex-1 relative py-3 px-2">
                    <div className="relative h-6">
                      {/* Task Bar */}
                      <div 
                        className={`absolute h-5 rounded ${getStatusColor(task.status)} opacity-80 hover:opacity-100 transition-all duration-200 cursor-pointer shadow-sm`}
                        style={{
                          left: `${position.left}%`,
                          width: `${position.width}%`,
                          top: '2px'
                        }}
                        onMouseEnter={() => setHoveredTask(task.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                        title={`${task.title} - ${task.progress}% complete`}
                      >
                        {/* Progress indicator within the bar */}
                        <div 
                          className="h-full bg-black bg-opacity-20 rounded-l transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                        
                        {/* Task label on hover */}
                        {hoveredTask === task.id && position.width > 15 && (
                          <div className="absolute -top-8 left-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 shadow-lg">
                            {task.title} - {task.progress}%
                          </div>
                        )}
                      </div>

                      {/* Dependencies lines */}
                      {showDependencies && task.dependencies.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                          {task.dependencies.map((depId) => {
                            const depTask = tasks.find(t => t.id === depId);
                            if (!depTask) return null;
                            
                            const depPosition = getTaskPosition(depTask);
                            const currentPosition = getTaskPosition(task);
                            
                            return (
                              <svg
                                key={depId}
                                className="absolute inset-0 w-full h-full"
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
                                  markerEnd="url(#arrowhead)"
                                />
                                <defs>
                                  <marker
                                    id="arrowhead"
                                    markerWidth="10"
                                    markerHeight="7"
                                    refX="9"
                                    refY="3.5"
                                    orient="auto"
                                  >
                                    <polygon
                                      points="0 0, 10 3.5, 0 7"
                                      fill="#ef4444"
                                    />
                                  </marker>
                                </defs>
                              </svg>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legend for holidays and weekends */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
              <span>Weekends</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span>Holidays</span>
            </div>
            <div className="text-gray-500">
              • Holidays are marked with "HOL" indicator
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
