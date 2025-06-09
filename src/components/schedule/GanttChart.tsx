
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar } from 'lucide-react';
import { Task } from '@/types';

interface GanttChartProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  projects?: Array<{ id: string; name: string; color: string; }>;
  selectedProjects?: string[];
  dateRange?: { from: Date; to: Date };
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  showMilestones?: boolean;
  projectData?: any;
  compactMode?: boolean;
}

const PROJECT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export function GanttChart({ 
  tasks, 
  onUpdateTask, 
  onDeleteTask,
  projects = [],
  selectedProjects = [],
  dateRange,
  showDependencies = false,
  showCriticalPath = false,
  showMilestones = false,
  projectData,
  compactMode = false
}: GanttChartProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Memoize calculations for better performance
  const { startDate, endDate, totalDays, dayWidth } = useMemo(() => {
    const allDates = tasks.flatMap(task => [task.startDate, task.endDate]);
    const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
    const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();
    
    const startDate = dateRange?.from || (() => {
      const start = new Date(minDate);
      start.setDate(start.getDate() - 7);
      return start;
    })();
    
    const endDate = dateRange?.to || (() => {
      const end = new Date(maxDate);
      end.setDate(end.getDate() + 7);
      return end;
    })();

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayWidth = compactMode ? 20 : 25;

    return { startDate, endDate, totalDays, dayWidth };
  }, [tasks, dateRange, compactMode]);

  const getTaskPosition = useCallback((task: Task) => {
    const taskStart = task.startDate;
    const taskEnd = task.endDate;
    const left = Math.ceil((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
    const width = Math.max(Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth, dayWidth);
    return { left, width };
  }, [startDate, dayWidth]);

  const getProjectColor = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) return project.color;
    
    // Fallback to consistent color based on project ID
    const index = projects.findIndex(p => p.id === projectId);
    return PROJECT_COLORS[index % PROJECT_COLORS.length] || '#6b7280';
  }, [projects]);

  const getTaskBarColor = useCallback((task: Task) => {
    const projectColor = getProjectColor(task.projectId);
    const today = new Date();
    const taskEnd = task.endDate;
    const daysUntilDue = Math.ceil((taskEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Critical path styling
    if (showCriticalPath && daysUntilDue <= 3 && task.status !== 'Completed') {
      return '#ef4444'; // red for critical
    }
    
    // Status-based opacity
    switch (task.status) {
      case 'Completed':
        return projectColor;
      case 'In Progress':
        return projectColor;
      case 'Not Started':
        return `${projectColor}80`; // 50% opacity
      case 'On Hold':
        return '#f59e0b'; // amber
      default:
        return projectColor;
    }
  }, [getProjectColor, showCriticalPath]);

  const calculateProgressPercentage = useCallback((task: Task) => {
    const taskStart = task.startDate;
    const taskEnd = task.endDate;
    const today = new Date();
    
    if (today < taskStart) return 0;
    if (today > taskEnd) return 100;
    
    const totalDuration = taskEnd.getTime() - taskStart.getTime();
    const elapsedTime = today.getTime() - taskStart.getTime();
    return Math.round((elapsedTime / totalDuration) * 100);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setDraggedTask(taskId);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedTask) return;
    
    const ganttRect = e.currentTarget.getBoundingClientRect();
    const newLeft = e.clientX - ganttRect.left - dragOffset;
    const newDayOffset = Math.round(newLeft / dayWidth);
    
    const task = tasks.find(t => t.id === draggedTask);
    if (!task) return;
    
    const originalStart = task.startDate;
    const originalEnd = task.endDate;
    const duration = originalEnd.getTime() - originalStart.getTime();
    
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + newDayOffset);
    
    const newEnd = new Date(newStart.getTime() + duration);
    
    onUpdateTask(draggedTask, {
      startDate: newStart,
      endDate: newEnd
    });
  }, [draggedTask, dragOffset, dayWidth, tasks, startDate, onUpdateTask]);

  const handleMouseUp = useCallback(() => {
    setDraggedTask(null);
    setDragOffset(0);
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDeleteTask(taskId);
    }
  }, [onDeleteTask]);

  // Generate date headers with memoization
  const dateHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      headers.push(date);
    }
    return headers;
  }, [totalDays, startDate]);

  // Get unique projects for legend
  const activeProjects = useMemo(() => {
    const projectIds = [...new Set(tasks.map(task => task.projectId))];
    return projectIds.map(id => projects.find(p => p.id === id)).filter(Boolean);
  }, [tasks, projects]);

  return (
    <Card className={`w-full ${compactMode ? 'max-h-[400px]' : ''}`}>
      <CardHeader className={compactMode ? 'pb-3' : ''}>
        <CardTitle className={`flex items-center gap-2 ${compactMode ? 'text-lg' : ''}`}>
          <Calendar className={`${compactMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
          Project Gantt Chart
        </CardTitle>
      </CardHeader>
      <CardContent className={compactMode ? 'pt-0' : ''}>
        <div className={`overflow-auto ${compactMode ? 'max-h-[300px]' : ''}`}>
          {/* Date Headers */}
          <div className="flex mb-3 border-b pb-2 sticky top-0 bg-white z-10">
            <div className={`${compactMode ? 'w-48' : 'w-64'} flex-shrink-0`}></div>
            <div className="flex">
              {dateHeaders.map((date, index) => (
                <div
                  key={index}
                  className={`text-xs text-center border-l px-1 ${compactMode ? 'py-1' : ''}`}
                  style={{ width: dayWidth }}
                >
                  <div className="font-medium">{date.getDate()}</div>
                  <div className="text-gray-500 text-[10px]">
                    {date.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div
            className="relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {tasks.map((task) => {
              const { left, width } = getTaskPosition(task);
              const taskColor = getTaskBarColor(task);
              const taskEnd = task.endDate;
              const today = new Date();
              const daysUntilDue = Math.ceil((taskEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isCritical = showCriticalPath && daysUntilDue <= 3 && task.status !== 'Completed';
              const project = projects.find(p => p.id === task.projectId);

              return (
                <div key={task.id} className={`flex items-center ${compactMode ? 'mb-2' : 'mb-3'} group`}>
                  {/* Task Info */}
                  <div className={`${compactMode ? 'w-48' : 'w-64'} flex-shrink-0 pr-4`}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium ${compactMode ? 'text-xs' : 'text-sm'} truncate`}>
                          {task.title}
                        </div>
                        <div className={`flex items-center gap-2 ${compactMode ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                          {project && (
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: project.color }}
                              />
                              <span className="truncate max-w-16">{project.name}</span>
                            </div>
                          )}
                          <Badge variant="outline" className={`${compactMode ? 'text-[9px] px-1 py-0' : 'text-xs'}`}>
                            {task.status}
                          </Badge>
                          <span>{task.progress}%</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity ${compactMode ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'}`}
                      >
                        <Trash2 className={`${compactMode ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-red-500`} />
                      </Button>
                    </div>
                  </div>

                  {/* Gantt Bar */}
                  <div className="relative flex-1" style={{ height: compactMode ? '24px' : '32px' }}>
                    <div
                      className={`absolute top-1 rounded cursor-move transition-all duration-150 hover:shadow-lg ${
                        draggedTask === task.id ? 'shadow-xl z-10 scale-105' : ''
                      }`}
                      style={{
                        left: `${left}px`,
                        width: `${width}px`,
                        height: compactMode ? '16px' : '20px',
                        backgroundColor: taskColor,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, task.id)}
                    >
                      {/* Progress Overlay */}
                      <div
                        className="h-full rounded transition-all duration-300 bg-white bg-opacity-40"
                        style={{
                          width: `${task.progress}%`,
                        }}
                      />
                      
                      {/* Task Text */}
                      <div className={`absolute inset-0 flex items-center justify-center ${compactMode ? 'text-[10px]' : 'text-xs'} font-medium px-2 text-white`}>
                        <span className="truncate">{task.title}</span>
                      </div>
                      
                      {/* Critical indicator */}
                      {isCritical && (
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
                      )}
                    </div>

                    {/* Today line */}
                    {(() => {
                      const today = new Date();
                      const todayOffset = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
                      if (todayOffset >= 0 && todayOffset <= totalDays * dayWidth) {
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 opacity-60"
                            style={{ left: `${todayOffset}px` }}
                          />
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enhanced Legend */}
          <div className={`${compactMode ? 'mt-4 pt-3' : 'mt-6 pt-4'} border-t`}>
            <div className={`flex flex-wrap items-center gap-4 ${compactMode ? 'text-xs' : 'text-xs'}`}>
              {/* Status Legend */}
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-600">Status:</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded opacity-50"></div>
                  <span>Not Started</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Completed</span>
                </div>
                {showCriticalPath && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Critical (≤ 3 days)</span>
                  </div>
                )}
              </div>

              {/* Project Legend - only show if multiple projects */}
              {activeProjects.length > 1 && (
                <>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-600">Projects:</span>
                    {activeProjects.map((project) => (
                      <div key={project.id} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded" 
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="truncate max-w-20">{project.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Today indicator */}
              <div className="flex items-center gap-2 ml-auto">
                <div className="w-0.5 h-3 bg-red-500"></div>
                <span className="text-red-600 font-medium">Today</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
