
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  dependencies?: string[];
}

interface GanttChartProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

export function GanttChart({ tasks, onUpdateTask, onDeleteTask }: GanttChartProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Calculate date range
  const allDates = tasks.flatMap(task => [new Date(task.start_date), new Date(task.end_date)]);
  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();
  
  // Add padding to date range
  const startDate = new Date(minDate);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(maxDate);
  endDate.setDate(endDate.getDate() + 7);

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayWidth = 30; // pixels per day

  const getTaskPosition = (task: Task) => {
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    const left = Math.ceil((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
    const width = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
    return { left, width };
  };

  const calculateProgressPercentage = (task: Task) => {
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    const today = new Date();
    
    if (today < taskStart) return 0;
    if (today > taskEnd) return 100;
    
    const totalDuration = taskEnd.getTime() - taskStart.getTime();
    const elapsedTime = today.getTime() - taskStart.getTime();
    return Math.round((elapsedTime / totalDuration) * 100);
  };

  const updateTaskProgress = (task: Task) => {
    const calculatedProgress = calculateProgressPercentage(task);
    if (calculatedProgress !== task.progress) {
      onUpdateTask(task.id, { progress: calculatedProgress });
    }
  };

  useEffect(() => {
    // Update progress for all tasks based on current date
    tasks.forEach(task => {
      updateTaskProgress(task);
    });
  }, [tasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-400';
      case 'In Progress': return 'bg-blue-500';
      case 'Completed': return 'bg-green-500';
      case 'On Hold': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getCriticalPathColor = (task: Task) => {
    const taskEnd = new Date(task.end_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((taskEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= 3 && task.status !== 'Completed') {
      return 'bg-red-500';
    }
    return getStatusColor(task.status);
  };

  const handleMouseDown = (e: React.MouseEvent, taskId: string) => {
    setDraggedTask(taskId);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedTask) return;
    
    const ganttRect = e.currentTarget.getBoundingClientRect();
    const newLeft = e.clientX - ganttRect.left - dragOffset;
    const newDayOffset = Math.round(newLeft / dayWidth);
    
    const task = tasks.find(t => t.id === draggedTask);
    if (!task) return;
    
    const originalStart = new Date(task.start_date);
    const originalEnd = new Date(task.end_date);
    const duration = originalEnd.getTime() - originalStart.getTime();
    
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + newDayOffset);
    
    const newEnd = new Date(newStart.getTime() + duration);
    
    onUpdateTask(draggedTask, {
      start_date: newStart.toISOString().split('T')[0],
      end_date: newEnd.toISOString().split('T')[0]
    });
  };

  const handleMouseUp = () => {
    if (draggedTask) {
      const task = tasks.find(t => t.id === draggedTask);
      if (task) {
        updateTaskProgress(task);
        toast.success('Task updated successfully');
      }
    }
    setDraggedTask(null);
    setDragOffset(0);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDeleteTask(taskId);
      toast.success('Task deleted successfully');
    }
  };

  // Generate date headers
  const dateHeaders = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dateHeaders.push(date);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Project Gantt Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Date Headers */}
          <div className="flex mb-4 border-b pb-2">
            <div className="w-64 flex-shrink-0"></div>
            <div className="flex">
              {dateHeaders.map((date, index) => (
                <div
                  key={index}
                  className="text-xs text-center border-l px-1"
                  style={{ width: dayWidth }}
                >
                  <div>{date.getDate()}</div>
                  <div className="text-gray-500">
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
            {tasks.map((task, index) => {
              const { left, width } = getTaskPosition(task);
              const taskEnd = new Date(task.end_date);
              const today = new Date();
              const daysUntilDue = Math.ceil((taskEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isCritical = daysUntilDue <= 3 && task.status !== 'Completed';

              return (
                <div key={task.id} className="flex items-center mb-3 group">
                  {/* Task Info */}
                  <div className="w-64 flex-shrink-0 pr-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{task.title}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                          <span>{task.progress}%</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Gantt Bar */}
                  <div className="relative flex-1" style={{ height: '32px' }}>
                    <div
                      className={`absolute top-1 rounded cursor-move transition-all duration-200 hover:shadow-md ${
                        draggedTask === task.id ? 'shadow-lg z-10' : ''
                      } ${getCriticalPathColor(task)}`}
                      style={{
                        left: `${left}px`,
                        width: `${Math.max(width, 30)}px`,
                        height: '24px',
                      }}
                      onMouseDown={(e) => handleMouseDown(e, task.id)}
                    >
                      {/* Progress Overlay */}
                      <div
                        className={`h-full rounded transition-all duration-300 ${
                          isCritical 
                            ? 'bg-red-300 bg-opacity-90' 
                            : 'bg-white bg-opacity-30'
                        }`}
                        style={{
                          width: `${task.progress}%`,
                        }}
                      />
                      
                      {/* Task Text */}
                      <div className={`absolute inset-0 flex items-center justify-center text-xs font-medium px-2 ${
                        isCritical ? 'text-white' : 'text-white'
                      }`}>
                        <span className="truncate">{task.title}</span>
                      </div>
                      
                      {/* Critical indicator */}
                      {isCritical && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                      )}
                    </div>

                    {/* Today line */}
                    {(() => {
                      const today = new Date();
                      const todayOffset = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
                      if (todayOffset >= 0 && todayOffset <= totalDays * dayWidth) {
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
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

          {/* Legend */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded"></div>
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
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Critical (≤ 3 days)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3 bg-red-500"></div>
                <span>Today</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
