import { useMemo, useState, useCallback, useRef } from 'react';
import { format, differenceInDays, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, isSameDay, isWeekend, addDays, isAfter, isBefore } from 'date-fns';
import { AlertTriangle, Calendar, Link2, Target, Edit2, Save, X, Download, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

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
  client?: string;
  contractValue?: number;
  status?: string;
}

interface GanttChartProps {
  tasks: Task[];
  projects: Project[];
  selectedProjects: string[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  dateRange: { from: Date; to: Date };
  showDependencies?: boolean;
  showCriticalPath?: boolean;
  showMilestones?: boolean;
  projectData?: Project;
  compactMode?: boolean;
}

// Helper function to get current date in Eastern Time
const getCurrentDateEST = () => {
  const now = new Date();
  // Convert to Eastern Time (UTC-5 or UTC-4 depending on daylight saving)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const est = new Date(utc + (-5 * 3600000)); // EST is UTC-5
  est.setHours(0, 0, 0, 0); // Reset to start of day
  return est;
};

export function GanttChart({ 
  tasks, 
  projects, 
  selectedProjects, 
  onTaskUpdate, 
  onTaskDelete,
  dateRange,
  showDependencies = false,
  showCriticalPath = false,
  showMilestones = false,
  projectData,
  compactMode = false
}: GanttChartProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ title: string; progress: number }>({ title: '', progress: 0 });
  const [dragging, setDragging] = useState<{ taskId: string; type: 'move' | 'resize-start' | 'resize-end' } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; originalStartDate: Date; originalEndDate: Date } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

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

  const getTaskStatus = (task: Task) => {
    const today = getCurrentDateEST();
    
    const taskStart = new Date(task.startDate);
    taskStart.setHours(0, 0, 0, 0);
    
    const taskEnd = new Date(task.endDate);
    taskEnd.setHours(23, 59, 59, 999);
    
    // If manually set to 100%, always completed
    if (task.progress === 100) return 'Completed';
    
    // Check if task hasn't started yet
    if (isBefore(today, taskStart)) return 'Not Started';
    
    // Check if task is overdue
    if (isAfter(today, taskEnd) && task.progress < 100) return 'Overdue';
    
    // Check if task is currently active
    if (!isBefore(today, taskStart) && !isAfter(today, taskEnd)) {
      return 'In Progress';
    }
    
    return task.status || 'Not Started';
  };

  const calculateExpectedProgress = (task: Task) => {
    const today = getCurrentDateEST();
    
    const taskStart = new Date(task.startDate);
    taskStart.setHours(0, 0, 0, 0);
    
    const taskEnd = new Date(task.endDate);
    taskEnd.setHours(23, 59, 59, 999);
    
    // If task hasn't started, return 0
    if (isBefore(today, taskStart)) return 0;
    
    // If task is complete or overdue, don't auto-calculate
    if (task.progress === 100 || isAfter(today, taskEnd)) return task.progress;
    
    // Calculate expected progress based on days elapsed
    const totalDuration = differenceInDays(taskEnd, taskStart) + 1;
    const daysElapsed = differenceInDays(today, taskStart) + 1;
    const expectedProgress = Math.min(100, Math.max(0, (daysElapsed / totalDuration) * 100));
    
    return Math.floor(expectedProgress);
  };

  const getTaskColor = (task: Task, projectColor: string) => {
    if (showCriticalPath && task.isCritical) {
      return '#dc2626'; // Red for critical path
    }
    // Replace teal with blue variants
    if (projectColor === '#14b8a6' || projectColor === '#0d9488') {
      return '#3b82f6'; // Blue instead of teal
    }
    return projectColor;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, taskId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    const task = filteredTasks.find(t => t.id === taskId);
    if (!task) return;

    setDragging({ taskId, type });
    setDragStart({
      x: e.clientX,
      originalStartDate: new Date(task.startDate),
      originalEndDate: new Date(task.endDate)
    });
  }, [filteredTasks]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStart || !timelineRef.current) return;

    const deltaX = e.clientX - dragStart.x;
    const timelineWidth = timelineRef.current.getBoundingClientRect().width;
    const dayWidth = timelineWidth / timeData.days.length;
    const daysDelta = Math.round(deltaX / dayWidth);

    const task = filteredTasks.find(t => t.id === dragging.taskId);
    if (!task) return;

    let newStartDate = new Date(dragStart.originalStartDate);
    let newEndDate = new Date(dragStart.originalEndDate);

    if (dragging.type === 'move') {
      newStartDate = addDays(dragStart.originalStartDate, daysDelta);
      newEndDate = addDays(dragStart.originalEndDate, daysDelta);
    } else if (dragging.type === 'resize-start') {
      newStartDate = addDays(dragStart.originalStartDate, daysDelta);
      if (newStartDate >= newEndDate) {
        newStartDate = addDays(newEndDate, -1);
      }
    } else if (dragging.type === 'resize-end') {
      newEndDate = addDays(dragStart.originalEndDate, daysDelta);
      if (newEndDate <= newStartDate) {
        newEndDate = addDays(newStartDate, 1);
      }
    }

    const newDuration = differenceInDays(newEndDate, newStartDate) + 1;

    onTaskUpdate(dragging.taskId, {
      startDate: newStartDate,
      endDate: newEndDate,
      duration: newDuration
    });
  }, [dragging, dragStart, timeData.days.length, filteredTasks, onTaskUpdate]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      toast.success('Task updated successfully');
    }
    setDragging(null);
    setDragStart(null);
  }, [dragging]);

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

  const handleDeleteTask = (taskId: string) => {
    if (onTaskDelete && confirm('Are you sure you want to delete this task?')) {
      onTaskDelete(taskId);
      toast.success('Task deleted successfully');
    }
  };

  const handleTaskClick = (task: Task) => {
    const expectedProgress = calculateExpectedProgress(task);
    const newStatus = getTaskStatus({ ...task, progress: expectedProgress });
    
    // Only update if there's a meaningful change
    if (expectedProgress !== task.progress || newStatus !== task.status) {
      onTaskUpdate(task.id, { 
        progress: expectedProgress,
        status: newStatus
      });
    }
  };

  const scrollTimeline = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newPosition = direction === 'left' 
        ? Math.max(0, currentScroll - scrollAmount)
        : currentScroll + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
    }
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Title and Header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROJECT SCHEDULE REPORT', 20, 20);
      
      let yOffset = 30;
      
      // Project Information Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROJECT INFORMATION', 20, yOffset);
      yOffset += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      if (selectedProjects.length > 0) {
        const selectedProjectNames = projects
          .filter(p => selectedProjects.includes(p.id))
          .map(p => p.name)
          .join(', ');
        pdf.text(`Projects: ${selectedProjectNames}`, 20, yOffset);
      } else {
        pdf.text('Projects: All Projects', 20, yOffset);
      }
      yOffset += 6;
      
      if (projectData?.client) {
        pdf.text(`Client: ${projectData.client}`, 20, yOffset);
        yOffset += 6;
      }
      
      pdf.text(`Report Date: ${format(new Date(), 'MMM dd, yyyy')}`, 20, yOffset);
      yOffset += 6;
      pdf.text(`Schedule Period: ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`, 20, yOffset);
      yOffset += 12;

      // Summary Statistics
      const totalTasks = filteredTasks.length;
      const completedTasks = filteredTasks.filter(t => getTaskStatus(t) === 'Completed').length;
      const inProgressTasks = filteredTasks.filter(t => getTaskStatus(t) === 'In Progress').length;
      const overdueTasks = filteredTasks.filter(t => getTaskStatus(t) === 'Overdue').length;
      const notStartedTasks = filteredTasks.filter(t => getTaskStatus(t) === 'Not Started').length;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SUMMARY', 20, yOffset);
      yOffset += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Tasks: ${totalTasks}`, 20, yOffset);
      pdf.text(`Completed: ${completedTasks}`, 70, yOffset);
      pdf.text(`In Progress: ${inProgressTasks}`, 120, yOffset);
      pdf.text(`Overdue: ${overdueTasks}`, 170, yOffset);
      pdf.text(`Not Started: ${notStartedTasks}`, 220, yOffset);
      yOffset += 15;

      // Task List Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TASK DETAILS', 20, yOffset);
      yOffset += 8;

      // Table headers
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Task Name', 20, yOffset);
      pdf.text('Start Date', 100, yOffset);
      pdf.text('End Date', 140, yOffset);
      pdf.text('Progress', 180, yOffset);
      pdf.text('Status', 220, yOffset);
      yOffset += 6;
      
      // Draw header line
      pdf.setDrawColor(0, 0, 0);
      pdf.line(20, yOffset, pageWidth - 20, yOffset);
      yOffset += 4;

      // Task rows
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      filteredTasks.forEach((task) => {
        if (yOffset > 180) { // Start new page if needed
          pdf.addPage();
          yOffset = 20;
        }
        
        const taskStatus = getTaskStatus(task);
        const project = projects.find(p => p.id === task.projectId);
        
        // Truncate long task names
        const taskName = task.title.length > 35 ? task.title.substring(0, 32) + '...' : task.title;
        
        pdf.text(taskName, 20, yOffset);
        pdf.text(format(task.startDate, 'MM/dd/yyyy'), 100, yOffset);
        pdf.text(format(task.endDate, 'MM/dd/yyyy'), 140, yOffset);
        pdf.text(`${task.progress}%`, 180, yOffset);
        pdf.text(taskStatus, 220, yOffset);
        
        // Add project name in smaller text
        if (project) {
          pdf.setFontSize(7);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`[${project.name}]`, 20, yOffset + 3);
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(8);
        }
        
        yOffset += 8;
      });
      
      pdf.save(`project-schedule-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
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
        const startY = (depTaskIndex + 1) * 70 + 35;
        const endY = (taskIndex + 1) * 70 + 35;

        return (
          <g key={`${task.id}-${depId}`} className="dependency-line">
            <defs>
              <marker
                id={`arrow-${task.id}-${depId}`}
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,8 L8,4 z" fill="#8b5cf6" />
              </marker>
            </defs>
            <path
              d={`M ${startX}% ${startY} L ${startX + 2}% ${startY} L ${startX + 2}% ${endY} L ${endX}% ${endY}`}
              stroke="#8b5cf6"
              strokeWidth="2"
              fill="none"
              markerEnd={`url(#arrow-${task.id}-${depId})`}
              className="opacity-80"
            />
            <circle
              cx={`${startX + 1}%`}
              cy={startY}
              r="3"
              fill="#8b5cf6"
              className="animate-pulse"
            />
          </g>
        );
      });
    });
  };

  const containerHeight = compactMode ? 'h-[300px]' : 'h-[500px]';

  return (
    <div className={`bg-background rounded-lg border relative overflow-hidden ${compactMode ? 'max-h-[400px]' : ''}`} id="gantt-chart-export">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-muted/50 to-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {compactMode ? 'Schedule Overview' : 'Project Timeline'}
            </h3>
            {!compactMode && (
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {showCriticalPath && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Critical path highlighted in red
                  </div>
                )}
                {showDependencies && (
                  <div className="flex items-center gap-1">
                    <Link2 className="w-4 h-4 text-purple-500" />
                    Dependencies shown with purple arrows
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => scrollTimeline('left')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => scrollTimeline('right')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {!compactMode && (
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            )}
            <Badge variant="outline" className="text-xs">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* SVG for dependency lines */}
      {showDependencies && (
        <svg 
          className="absolute inset-0 pointer-events-none z-10" 
          style={{ width: '100%', height: '100%' }}
        >
          {renderDependencyLines()}
        </svg>
      )}
      
      {/* Timeline Header */}
      <div className="border-b bg-muted/50 sticky top-0 z-20">
        {/* Week Headers */}
        <div className="flex border-b">
          <div className="w-80 p-3 border-r font-semibold bg-background sticky left-0 z-30">Project / Task</div>
          <div className="flex-1 overflow-hidden">
            <div 
              ref={scrollContainerRef}
              className="overflow-x-auto"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div className="flex min-w-max">
                {timeData.weeks.map((week, index) => {
                  const weekStart = startOfWeek(week);
                  const weekEnd = endOfWeek(week);
                  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })
                    .filter(day => day >= dateRange.from && day <= dateRange.to);
                  
                  const widthPixels = daysInWeek.length * 40;
                  
                  return (
                    <div 
                      key={index} 
                      className="border-r text-center py-2 font-medium text-sm bg-primary/5 flex-shrink-0"
                      style={{ width: `${widthPixels}px` }}
                    >
                      Week of {format(weekStart, 'MMM dd')}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Day Headers */}
        <div className="flex">
          <div className="w-80 p-2 border-r text-xs text-muted-foreground bg-background sticky left-0 z-30">
            Click tasks to update progress
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="overflow-x-auto">
              <div 
                ref={timelineRef}
                className="flex min-w-max"
              >
                {timeData.days.map((day, index) => {
                  const isWeekendDay = isWeekend(day);
                  const isToday = isSameDay(day, getCurrentDateEST());
                  
                  return (
                    <div 
                      key={index} 
                      className={`
                        p-1 border-r text-center text-xs font-medium flex-shrink-0
                        ${isWeekendDay ? 'bg-muted text-muted-foreground' : 'bg-background'}
                        ${isToday ? 'bg-primary/20 text-primary font-bold' : ''}
                      `}
                      style={{ width: '40px' }}
                    >
                      <div>{format(day, 'EEE')}</div>
                      <div className="text-xs">{format(day, 'dd')}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Rows */}
      <div className={containerHeight}>
        <div className="relative h-full overflow-auto"
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}>
          {projects
            .filter(project => selectedProjects.length === 0 || selectedProjects.includes(project.id))
            .map((project) => {
              const projectTasks = filteredTasks.filter(task => task.projectId === project.id);
              if (projectTasks.length === 0) return null;

              return (
                <div key={project.id}>
                  {/* Project Header */}
                  <div className="flex border-b bg-gradient-to-r from-muted/50 to-muted/30">
                    <div className="w-80 p-3 border-r sticky left-0 bg-gradient-to-r from-muted/50 to-muted/30 z-10">
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
                    <div className="flex-1 relative overflow-hidden">
                      <div className="overflow-x-auto">
                        <div className="flex min-w-max">
                          {timeData.days.map((day, index) => (
                            <div 
                              key={index} 
                              className={`border-r border-border flex-shrink-0 ${isWeekend(day) ? 'bg-muted/30' : ''}`}
                              style={{ width: '40px' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Tasks */}
                  {projectTasks.map((task) => {
                    const position = getTaskPosition(task);
                    const taskColor = getTaskColor(task, project.color);
                    const isEditing = editingTask === task.id;
                    const hasDependencies = task.dependencies && task.dependencies.length > 0;
                    const taskStatus = getTaskStatus(task);
                    
                    return (
                      <div key={task.id} className={`
                        flex border-b hover:bg-muted/30 transition-colors group h-16
                        ${task.isCritical && showCriticalPath ? 'bg-destructive/10 border-destructive/20' : ''}
                      `}>
                        <div className="w-80 p-3 border-r sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 flex items-center justify-center">
                              {taskStatus === 'Completed' ? (
                                <Target className="w-3 h-3 text-green-500" />
                              ) : taskStatus === 'In Progress' ? (
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                              ) : taskStatus === 'Overdue' ? (
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                              ) : (
                                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                              )}
                            </div>
                            
                            {isEditing ? (
                              <div className="flex-1 flex items-center gap-1">
                                <Input
                                  value={editValues.title}
                                  onChange={(e) => setEditValues(prev => ({ ...prev, title: e.target.value }))}
                                  className="h-6 text-sm flex-1"
                                  autoFocus
                                />
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editValues.progress}
                                  onChange={(e) => setEditValues(prev => ({ ...prev, progress: parseInt(e.target.value) || 0 }))}
                                  className="h-6 text-sm w-16"
                                  placeholder="%"
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
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleTaskEdit(task)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  {onTaskDelete && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-6 mt-1 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}</span>
                              <Badge 
                                variant={taskStatus === 'Completed' ? 'default' : taskStatus === 'Overdue' ? 'destructive' : 'secondary'} 
                                className="text-xs"
                              >
                                {taskStatus}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1 relative h-16 group overflow-hidden">
                          <div className="overflow-x-auto w-full h-full">
                            <div className="relative min-w-max h-full">
                              {/* Timeline background */}
                              <div className="flex h-full">
                                {timeData.days.map((day, index) => (
                                  <div 
                                    key={index} 
                                    className={`border-r border-border flex-shrink-0 ${isWeekend(day) ? 'bg-muted/30' : ''}`}
                                    style={{ width: '40px' }}
                                  />
                                ))}
                              </div>
                              
                              {/* Task bar with drag handles */}
                              <div 
                                className="absolute top-2 h-10 rounded-lg shadow-sm border border-background hover:shadow-md transition-all duration-200 flex items-center justify-between px-3 cursor-move select-none"
                                style={{ 
                                  left: position.left,
                                  width: position.width,
                                  backgroundColor: taskColor,
                                  minWidth: '80px'
                                }}
                                onMouseDown={(e) => handleMouseDown(e, task.id, 'move')}
                              >
                                {/* Left resize handle */}
                                <div
                                  className="absolute left-0 top-0 h-full w-2 cursor-w-resize hover:bg-white/20 transition-colors"
                                  onMouseDown={(e) => handleMouseDown(e, task.id, 'resize-start')}
                                />
                                
                                <span className="text-primary-foreground text-xs font-medium truncate flex-1 text-center pointer-events-none">
                                  {task.title}
                                </span>
                                <span className="text-primary-foreground/90 text-xs font-medium pointer-events-none">
                                  {task.progress}%
                                </span>
                                
                                {/* Right resize handle */}
                                <div
                                  className="absolute right-0 top-0 h-full w-2 cursor-e-resize hover:bg-white/20 transition-colors"
                                  onMouseDown={(e) => handleMouseDown(e, task.id, 'resize-end')}
                                />
                              </div>
                              
                              {/* Progress overlay - improved visibility */}
                              {task.progress > 0 && (
                                <div 
                                  className={`absolute top-2 h-10 rounded-l-lg pointer-events-none ${
                                    task.isCritical && showCriticalPath 
                                      ? 'bg-yellow-400/80' 
                                      : 'bg-blue-400/70'
                                  }`}
                                  style={{ 
                                    left: position.left,
                                    width: `${(parseFloat(position.width.replace('%', '')) * task.progress) / 100}%`
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>
      </div>

      {filteredTasks.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 text-muted mx-auto mb-4" />
          <p>No tasks found for selected projects</p>
        </div>
      )}
    </div>
  );
}
