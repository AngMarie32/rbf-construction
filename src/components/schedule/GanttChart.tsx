
import { useMemo, useState } from 'react';
import { format, differenceInDays, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, isSameDay, isWeekend } from 'date-fns';
import { AlertTriangle, Calendar, Link2, Target, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: string;
  projectId: string;
  dependencies: string[];
  duration: number;
  isCritical?: boolean;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface GanttChartProps {
  tasks: Task[];
  projects: Project[];
  selectedProjects: string[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  dateRange: { from: Date; to: Date };
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  showMilestones?: boolean;
}

export function GanttChart({ 
  tasks, 
  projects, 
  selectedProjects, 
  onTaskUpdate, 
  dateRange,
  showDependencies = false,
  showCriticalPath = false,
  showMilestones = false
}: GanttChartProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ title: string; progress: number }>({ title: '', progress: 0 });

  const timeData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const weeks = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return { days, weeks };
  }, [dateRange]);

  const filteredTasks = tasks.filter(task => 
    selectedProjects.length === 0 || selectedProjects.includes(task.projectId)
  );

  const getProjectColor = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || '#3b82f6';
  };

  const getTaskPosition = (task: Task) => {
    const totalDays = timeData.days.length;
    const taskStartDays = Math.max(0, differenceInDays(task.startDate, dateRange.from));
    const taskDuration = task.duration;
    
    const leftPercent = (taskStartDays / totalDays) * 100;
    const widthPercent = Math.min(100 - leftPercent, (taskDuration / totalDays) * 100);
    
    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  const getTaskColor = (task: Task, projectColor: string) => {
    if (showCriticalPath && task.isCritical) {
      return '#dc2626'; // Red for critical tasks
    }
    return projectColor;
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task.id);
    setEditValues({ title: task.title, progress: task.progress });
  };

  const handleSaveEdit = (taskId: string) => {
    onTaskUpdate(taskId, editValues);
    setEditingTask(null);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditValues({ title: '', progress: 0 });
  };

  const renderDependencyLines = () => {
    if (!showDependencies) return null;

    return filteredTasks.map((task, taskIndex) => {
      if (!task.dependencies || task.dependencies.length === 0) return null;

      return task.dependencies.map((depId) => {
        const depTask = filteredTasks.find(t => t.id === depId);
        if (!depTask) return null;

        const depTaskIndex = filteredTasks.findIndex(t => t.id === depId);
        const taskPosition = getTaskPosition(task);
        const depPosition = getTaskPosition(depTask);

        const startX = parseFloat(depPosition.left.replace('%', '')) + parseFloat(depPosition.width.replace('%', ''));
        const endX = parseFloat(taskPosition.left.replace('%', ''));
        const startY = (depTaskIndex + 1) * 56 + 28;
        const endY = (taskIndex + 1) * 56 + 28;

        return (
          <g key={`${task.id}-${depId}`} className="dependency-line">
            <path
              d={`M ${startX}% ${startY} L ${startX + 1}% ${startY} L ${startX + 1}% ${endY} L ${endX}% ${endY}`}
              stroke="#6366f1"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#dependency-arrow)"
              className="animate-pulse"
            />
          </g>
        );
      });
    });
  };

  return (
    <div className="bg-white rounded-lg border relative overflow-hidden">
      {/* SVG for dependency lines */}
      {showDependencies && (
        <svg 
          className="absolute inset-0 pointer-events-none z-10" 
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <marker
              id="dependency-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,8 L8,4 z" fill="#6366f1" />
            </marker>
          </defs>
          {renderDependencyLines()}
        </svg>
      )}

      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Project Timeline
            </h3>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
              {showCriticalPath && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Critical path highlighted in red
                </div>
              )}
              {showDependencies && (
                <div className="flex items-center gap-1">
                  <Link2 className="w-4 h-4 text-blue-500" />
                  Dependencies shown with arrows
                </div>
              )}
              {showMilestones && (
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-yellow-500" />
                  Milestones marked with diamonds
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
          </Badge>
        </div>
      </div>
      
      {/* Enhanced Timeline Header */}
      <div className="border-b bg-gray-50">
        {/* Week Headers */}
        <div className="flex border-b">
          <div className="w-80 p-3 border-r font-semibold bg-white">Project / Task</div>
          <div className="flex-1 flex">
            {timeData.weeks.map((week, index) => {
              const weekStart = startOfWeek(week);
              const weekEnd = endOfWeek(week);
              const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })
                .filter(day => day >= dateRange.from && day <= dateRange.to);
              
              const widthPercent = (daysInWeek.length / timeData.days.length) * 100;
              
              return (
                <div 
                  key={index} 
                  className="border-r text-center py-2 font-medium text-sm bg-blue-50"
                  style={{ width: `${widthPercent}%` }}
                >
                  Week of {format(weekStart, 'MMM dd')}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Headers */}
        <div className="flex">
          <div className="w-80 p-2 border-r text-xs text-gray-500 bg-white">Click tasks to edit</div>
          <div className="flex-1 flex">
            {timeData.days.map((day, index) => {
              const isWeekendDay = isWeekend(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div 
                  key={index} 
                  className={`
                    flex-1 p-1 border-r text-center text-xs font-medium
                    ${isWeekendDay ? 'bg-gray-100 text-gray-500' : 'bg-white'}
                    ${isToday ? 'bg-yellow-100 text-yellow-800 font-bold' : ''}
                  `}
                  style={{ minWidth: '30px' }}
                >
                  <div>{format(day, 'EEE')}</div>
                  <div className="text-xs">{format(day, 'dd')}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Rows */}
      <div className="max-h-96 overflow-y-auto relative">
        {projects
          .filter(project => selectedProjects.length === 0 || selectedProjects.includes(project.id))
          .map((project) => {
            const projectTasks = filteredTasks.filter(task => task.projectId === project.id);
            if (projectTasks.length === 0) return null;

            return (
              <div key={project.id}>
                {/* Project Header */}
                <div className="flex border-b bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="w-80 p-3 border-r">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm" 
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="font-semibold">{project.name}</span>
                      {projectTasks.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(projectTasks.reduce((sum, task) => sum + task.progress, 0) / projectTasks.length)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    {/* Background grid */}
                    <div className="flex h-full">
                      {timeData.days.map((day, index) => (
                        <div 
                          key={index} 
                          className={`flex-1 border-r border-gray-100 ${isWeekend(day) ? 'bg-gray-50' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Project Tasks */}
                {projectTasks.map((task) => {
                  const position = getTaskPosition(task);
                  const taskColor = getTaskColor(task, project.color);
                  const isEditing = editingTask === task.id;
                  
                  return (
                    <div key={task.id} className={`
                      flex border-b hover:bg-gray-50 transition-colors
                      ${task.isCritical && showCriticalPath ? 'bg-red-50 border-red-100' : ''}
                    `}>
                      <div className="w-80 p-3 border-r">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 flex items-center justify-center">
                            {task.isCritical && showCriticalPath ? (
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                            ) : showMilestones && task.progress === 100 ? (
                              <Target className="w-3 h-3 text-yellow-500" />
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
                            )}
                          </div>
                          
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-1">
                              <Input
                                value={editValues.title}
                                onChange={(e) => setEditValues(prev => ({ ...prev, title: e.target.value }))}
                                className="h-6 text-sm"
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(task.id)} className="h-6 w-6 p-0">
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-6 w-6 p-0">
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-between">
                              <span className="font-medium text-sm">{task.title}</span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleTaskEdit(task)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-6 mt-1 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}</span>
                            <Badge variant="outline" className="text-xs">{task.status}</Badge>
                          </div>
                          
                          {showDependencies && task.dependencies && task.dependencies.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Link2 className="w-3 h-3 text-blue-500" />
                              <span className="text-xs text-blue-600">
                                {task.dependencies.length} dependencies
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 relative h-14 group">
                        {/* Background grid */}
                        <div className="flex h-full">
                          {timeData.days.map((day, index) => (
                            <div 
                              key={index} 
                              className={`flex-1 border-r border-gray-100 ${isWeekend(day) ? 'bg-gray-50' : ''}`}
                            />
                          ))}
                        </div>
                        
                        {/* Task bar */}
                        <div 
                          className="absolute top-2 h-10 rounded-lg shadow-sm border border-white/20 cursor-pointer hover:shadow-md transition-all duration-200 flex items-center justify-between px-3"
                          style={{ 
                            ...position,
                            backgroundColor: taskColor,
                            minWidth: '80px'
                          }}
                          onClick={() => {
                            onTaskUpdate(task.id, { progress: Math.min(100, task.progress + 10) });
                          }}
                        >
                          <span className="text-white text-xs font-medium truncate">
                            {task.title.split(' ').slice(0, 2).join(' ')}
                          </span>
                          <span className="text-white/90 text-xs font-medium">
                            {task.progress}%
                          </span>
                        </div>
                        
                        {/* Progress overlay */}
                        {task.progress > 0 && (
                          <div 
                            className="absolute top-2 h-10 rounded-l-lg bg-white/30 pointer-events-none"
                            style={{ 
                              left: position.left,
                              width: `${(parseFloat(position.width.replace('%', '')) * task.progress) / 100}%`,
                            }}
                          />
                        )}
                        
                        {/* Milestone diamond */}
                        {showMilestones && task.progress === 100 && (
                          <div 
                            className="absolute top-0 w-3 h-3 bg-yellow-500 rotate-45 shadow-sm z-20"
                            style={{ 
                              left: `calc(${position.left} + ${position.width} - 6px)`,
                              top: '20px'
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p>No tasks found for selected projects</p>
        </div>
      )}
    </div>
  );
}
