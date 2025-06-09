
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { format, differenceInDays, addDays, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { Task } from '@/types';
import { TaskEditDialog } from './TaskEditDialog';

interface Project {
  id: string;
  name: string;
  color: string;
  client?: string;
  contractValue?: number;
  status?: string;
}

interface GanttChartProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  projects: Project[];
  selectedProjects: string[];
  dateRange: { from: Date; to: Date };
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  showMilestones?: boolean;
  projectData?: any;
  compactMode?: boolean;
}

export function GanttChart({
  tasks,
  onUpdateTask,
  onDeleteTask,
  projects,
  selectedProjects,
  dateRange,
  showDependencies = false,
  showCriticalPath = false,
  showMilestones = false,
  projectData,
  compactMode = false
}: GanttChartProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isResizing, setIsResizing] = useState<{ taskId: string; side: 'start' | 'end' } | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);

  // Calculate proper completion percentages based on current date
  const calculateTaskProgress = (task: Task): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const taskStart = new Date(task.startDate);
    taskStart.setHours(0, 0, 0, 0);
    
    const taskEnd = new Date(task.endDate);
    taskEnd.setHours(0, 0, 0, 0);

    // If task hasn't started yet, progress should be 0%
    if (isBefore(today, taskStart)) {
      return 0;
    }

    // If task is completed or past end date, use stored progress or 100%
    if (isAfter(today, taskEnd)) {
      return task.progress || 100;
    }

    // If task is in progress, calculate based on time elapsed vs stored progress
    const totalDuration = differenceInDays(taskEnd, taskStart) + 1;
    const daysElapsed = differenceInDays(today, taskStart) + 1;
    const timeBasedProgress = Math.min((daysElapsed / totalDuration) * 100, 100);
    
    // Use the higher of time-based progress or stored progress
    return Math.max(timeBasedProgress, task.progress || 0);
  };

  const tasksWithCalculatedProgress = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      calculatedProgress: calculateTaskProgress(task)
    }));
  }, [tasks]);

  // Date range calculations
  const totalDays = differenceInDays(dateRange.to, dateRange.from) + 1;
  const dayWidth = Math.max(40, 800 / totalDays);

  const getTaskPosition = (task: Task) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    const startOffset = differenceInDays(taskStart, dateRange.from);
    const duration = differenceInDays(taskEnd, taskStart) + 1;
    
    return {
      left: Math.max(0, startOffset * dayWidth),
      width: Math.max(dayWidth * 0.8, duration * dayWidth),
      duration
    };
  };

  const getDateFromPosition = (x: number) => {
    const dayIndex = Math.round(x / dayWidth);
    return addDays(dateRange.from, dayIndex);
  };

  const handleTaskBarMouseDown = (e: React.MouseEvent, task: Task, side: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing({ taskId: task.id, side });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !ganttRef.current) return;

      const rect = ganttRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 200; // Account for left panel width
      const newDate = getDateFromPosition(x);
      
      const task = tasks.find(t => t.id === isResizing.taskId);
      if (!task) return;

      if (isResizing.side === 'start') {
        if (isBefore(newDate, task.endDate)) {
          onUpdateTask(task.id, { startDate: newDate });
        }
      } else {
        if (isAfter(newDate, task.startDate)) {
          onUpdateTask(task.id, { endDate: newDate });
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, tasks, onUpdateTask, dateRange.from, dayWidth]);

  const getStatusColor = (task: Task) => {
    const today = new Date();
    const progress = calculateTaskProgress(task);
    
    if (progress === 100) return 'bg-green-500';
    if (isBefore(today, task.startDate)) return 'bg-gray-400';
    if (isAfter(today, task.endDate) && progress < 100) return 'bg-red-500';
    return 'bg-blue-500';
  };

  const renderDateHeaders = () => {
    const headers = [];
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(dateRange.from, i);
      headers.push(
        <div
          key={i}
          className="text-xs text-center border-r border-gray-200 flex flex-col justify-center"
          style={{ width: dayWidth, minWidth: dayWidth }}
        >
          <div className="font-medium">{format(date, 'd')}</div>
          <div className="text-gray-500">{format(date, 'MMM')}</div>
        </div>
      );
    }
    return headers;
  };

  const renderTaskBar = (task: Task & { calculatedProgress: number }) => {
    const position = getTaskPosition(task);
    const project = projects.find(p => p.id === task.projectId);
    const progress = task.calculatedProgress;
    
    return (
      <div key={task.id} className="flex items-center h-12 border-b border-gray-100">
        {/* Task Info Panel */}
        <div className="w-48 px-3 flex items-center justify-between border-r border-gray-200">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{task.title}</div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span>{Math.round(progress)}%</span>
              <Badge 
                variant="outline" 
                className="text-xs px-1 py-0"
                style={{ 
                  backgroundColor: project?.color + '20',
                  borderColor: project?.color,
                  color: project?.color
                }}
              >
                {task.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setEditingTask(task)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
              onClick={() => onDeleteTask(task.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Timeline Area */}
        <div className="flex-1 relative h-full">
          <div
            className={`absolute top-2 h-8 rounded ${getStatusColor(task)} cursor-pointer group transition-all duration-200 hover:shadow-lg`}
            style={{
              left: position.left,
              width: position.width,
              backgroundColor: project?.color || '#3b82f6'
            }}
          >
            {/* Resize handles */}
            <div
              className="absolute left-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-20 rounded-l"
              onMouseDown={(e) => handleTaskBarMouseDown(e, task, 'start')}
            />
            <div
              className="absolute right-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black bg-opacity-20 rounded-r"
              onMouseDown={(e) => handleTaskBarMouseDown(e, task, 'end')}
            />
            
            {/* Progress overlay */}
            <div
              className="absolute top-0 left-0 h-full bg-white bg-opacity-30 rounded"
              style={{ width: `${progress}%` }}
            />
            
            {/* Task label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs font-medium truncate px-2">
                {task.title}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectLegend = () => {
    const uniqueProjects = projects.filter(p => 
      selectedProjects.length === 0 || selectedProjects.includes(p.id)
    );

    if (uniqueProjects.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-3 p-3 bg-gray-50 border-b">
        <span className="text-sm font-medium text-gray-700">Projects:</span>
        {uniqueProjects.map(project => (
          <div key={project.id} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: project.color }}
            />
            <span className="text-sm text-gray-600">{project.name}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Project Timeline</span>
          <div className="text-sm text-gray-500">
            {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {renderProjectLegend()}
        
        <div ref={ganttRef} className="overflow-auto" style={{ maxHeight: compactMode ? '400px' : '600px' }}>
          {/* Header */}
          <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <div className="w-48 px-3 py-2 border-r border-gray-200">
              <span className="font-medium text-sm">Task Details</span>
            </div>
            <div className="flex">
              {renderDateHeaders()}
            </div>
          </div>

          {/* Task Rows */}
          <div className="min-h-0">
            {tasksWithCalculatedProgress.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tasks found for the selected criteria.
              </div>
            ) : (
              tasksWithCalculatedProgress.map(renderTaskBar)
            )}
          </div>
        </div>
      </CardContent>

      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          onSave={(updates) => {
            onUpdateTask(editingTask.id, updates);
            setEditingTask(null);
          }}
          onCancel={() => setEditingTask(null)}
        />
      )}
    </Card>
  );
}
