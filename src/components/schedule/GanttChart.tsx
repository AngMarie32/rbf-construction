
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, Edit3 } from 'lucide-react';
import { Task } from '@/types';
import { TaskEditDialog } from './TaskEditDialog';

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
  const [resizingTask, setResizingTask] = useState<{ taskId: string; side: 'start' | 'end'; startX: number; originalDate: Date } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
    const dayWidth = compactMode ? 25 : 35;

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
    
    const index = projects.findIndex(p => p.id === projectId);
    return PROJECT_COLORS[index % PROJECT_COLORS.length] || '#6b7280';
  }, [projects]);

  const getTaskBarColor = useCallback((task: Task) => {
    const projectColor = getProjectColor(task.projectId);
    const today = new Date();
    const taskEnd = task.endDate;
    const daysUntilDue = Math.ceil((taskEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (showCriticalPath && daysUntilDue <= 3 && task.status !== 'Completed') {
      return '#ef4444';
    }
    
    switch (task.status) {
      case 'Completed':
        return projectColor;
      case 'In Progress':
        return projectColor;
      case 'Not Started':
        return `${projectColor}80`;
      case 'On Hold':
        return '#f59e0b';
      default:
        return projectColor;
    }
  }, [getProjectColor, showCriticalPath]);

  const handleResizeStart = useCallback((e: React.MouseEvent, taskId: string, side: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setResizingTask({ 
      taskId, 
      side, 
      startX: e.clientX,
      originalDate: side === 'start' ? task.startDate : task.endDate
    });
  }, [tasks]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!resizingTask) return;
    
    const deltaX = e.clientX - resizingTask.startX;
    const daysDelta = Math.round(deltaX / dayWidth);
    
    if (daysDelta === 0) return;
    
    const task = tasks.find(t => t.id === resizingTask.taskId);
    if (!task) return;
    
    if (resizingTask.side === 'start') {
      const newStart = new Date(resizingTask.originalDate);
      newStart.setDate(newStart.getDate() + daysDelta);
      
      if (newStart < task.endDate) {
        onUpdateTask(resizingTask.taskId, { startDate: newStart });
      }
    } else {
      const newEnd = new Date(resizingTask.originalDate);
      newEnd.setDate(newEnd.getDate() + daysDelta);
      
      if (newEnd > task.startDate) {
        onUpdateTask(resizingTask.taskId, { endDate: newEnd });
      }
    }
  }, [resizingTask, dayWidth, tasks, onUpdateTask]);

  const handleMouseUp = useCallback(() => {
    setResizingTask(null);
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    onDeleteTask(taskId);
  }, [onDeleteTask]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  const renderDependencyLines = useCallback(() => {
    if (!showDependencies) return null;
    
    return tasks.map(task => {
      if (!task.dependencies || task.dependencies.length === 0) return null;
      
      return task.dependencies.map(depId => {
        const depTask = tasks.find(t => t.id === depId);
        if (!depTask) return null;
        
        const fromPos = getTaskPosition(depTask);
        const toPos = getTaskPosition(task);
        const rowHeight = compactMode ? 50 : 60;
        
        return (
          <line
            key={`${depId}-${task.id}`}
            x1={fromPos.left + fromPos.width}
            y1={tasks.indexOf(depTask) * rowHeight + rowHeight / 2}
            x2={toPos.left}
            y2={tasks.indexOf(task) * rowHeight + rowHeight / 2}
            stroke="#6b7280"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        );
      });
    });
  }, [showDependencies, tasks, getTaskPosition, compactMode]);

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

  const rowHeight = compactMode ? 50 : 60;

  return (
    <>
      <Card className={`w-full ${compactMode ? 'max-h-[500px]' : ''}`}>
        <CardHeader className={compactMode ? 'pb-3' : ''}>
          <CardTitle className={`flex items-center gap-2 ${compactMode ? 'text-lg' : ''}`}>
            <Calendar className={`${compactMode ? 'w-4 h-4' : 'w-5 h-5'}`} />
            Project Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className={compactMode ? 'pt-0' : ''}>
          <div className={`overflow-auto ${compactMode ? 'max-h-[400px]' : 'max-h-[600px]'}`}>
            {/* Date Headers */}
            <div className="flex mb-4 border-b pb-2 sticky top-0 bg-white z-10">
              <div className="w-64 flex-shrink-0 font-medium text-gray-700 px-4">Task Details</div>
              <div className="flex">
                {dateHeaders.map((date, index) => (
                  <div
                    key={index}
                    className="text-xs text-center border-l px-1 flex flex-col justify-center"
                    style={{ width: dayWidth, minWidth: dayWidth }}
                  >
                    <div className="font-semibold text-gray-800">{date.getDate()}</div>
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
              {/* SVG for dependency lines */}
              {showDependencies && (
                <svg 
                  className="absolute inset-0 pointer-events-none z-10" 
                  style={{ width: '100%', height: tasks.length * rowHeight }}
                >
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                    </marker>
                  </defs>
                  {renderDependencyLines()}
                </svg>
              )}

              {tasks.map((task, index) => {
                const { left, width } = getTaskPosition(task);
                const taskColor = getTaskBarColor(task);
                const project = projects.find(p => p.id === task.projectId);
                
                return (
                  <div 
                    key={task.id} 
                    className="flex items-center group relative border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    style={{ height: `${rowHeight}px` }}
                  >
                    {/* Task Info - Clean Left Side */}
                    <div className="w-64 flex-shrink-0 px-4 py-2">
                      <div className="flex items-center justify-between h-full">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {project && (
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: project.color }}
                              />
                            )}
                            <div className="font-medium text-sm truncate">{task.title}</div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{task.status}</span>
                            <span>•</span>
                            <span>{task.progress}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Gantt Bar Area */}
                    <div className="relative flex-1" style={{ height: `${rowHeight}px` }}>
                      {/* Today line - removed the text */}
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

                      {/* Task Bar */}
                      <div
                        className="absolute rounded-md transition-all duration-100 hover:shadow-md group/bar cursor-pointer"
                        style={{
                          left: `${left}px`,
                          width: `${width}px`,
                          height: '24px',
                          top: `${(rowHeight - 24) / 2}px`,
                          backgroundColor: taskColor,
                        }}
                      >
                        {/* Start Resize Handle */}
                        <div
                          className="absolute left-0 top-0 w-3 h-full bg-gray-900 bg-opacity-20 rounded-l-md cursor-w-resize opacity-0 group-hover/bar:opacity-100 transition-opacity hover:bg-opacity-40"
                          onMouseDown={(e) => handleResizeStart(e, task.id, 'start')}
                        />
                        
                        {/* Progress Overlay */}
                        <div
                          className="h-full rounded-md bg-white bg-opacity-30 transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                        
                        {/* Task Text */}
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white px-2">
                          <span className="truncate">{task.title}</span>
                        </div>
                        
                        {/* End Resize Handle */}
                        <div
                          className="absolute right-0 top-0 w-3 h-full bg-gray-900 bg-opacity-20 rounded-r-md cursor-e-resize opacity-0 group-hover/bar:opacity-100 transition-opacity hover:bg-opacity-40"
                          onMouseDown={(e) => handleResizeStart(e, task.id, 'end')}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t bg-white">
              <div className="flex flex-wrap items-center gap-6 text-xs">
                {/* Project Colors Legend */}
                {selectedProjects.length > 1 && (
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-600">Projects:</span>
                    {selectedProjects.map(projectId => {
                      const project = projects.find(p => p.id === projectId);
                      return project ? (
                        <div key={projectId} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="text-gray-700">{project.name}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Status Legend */}
                <div className="flex items-center gap-4">
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

      <TaskEditDialog
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        onSave={onUpdateTask}
      />
    </>
  );
}
