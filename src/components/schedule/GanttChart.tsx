
import { useMemo } from 'react';
import { format, differenceInDays, eachMonthOfInterval } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

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
  const months = useMemo(() => {
    return eachMonthOfInterval({
      start: dateRange.from,
      end: dateRange.to
    });
  }, [dateRange]);

  const filteredTasks = tasks.filter(task => 
    selectedProjects.length === 0 || selectedProjects.includes(task.projectId)
  );

  const getProjectColor = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || '#3b82f6';
  };

  const getTaskPosition = (task: Task) => {
    const totalDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const taskStartDays = Math.ceil((task.startDate.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const taskDuration = task.duration;
    
    const leftPercent = Math.max(0, (taskStartDays / totalDays) * 100);
    const widthPercent = Math.min(100 - leftPercent, (taskDuration / totalDays) * 100);
    
    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  const getTaskColor = (task: Task, projectColor: string) => {
    if (showCriticalPath && task.isCritical) {
      return '#dc2626'; // Red for critical tasks
    }
    return projectColor;
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

        // Calculate line positions
        const startX = parseFloat(depPosition.left.replace('%', '')) + parseFloat(depPosition.width.replace('%', ''));
        const endX = parseFloat(taskPosition.left.replace('%', ''));
        const startY = (depTaskIndex + 1) * 48 + 24; // Adjust for project headers
        const endY = (taskIndex + 1) * 48 + 24;

        return (
          <g key={`${task.id}-${depId}`}>
            {/* Horizontal line from end of dependency task */}
            <line
              x1={`${startX}%`}
              y1={startY}
              x2={`${startX + 2}%`}
              y2={startY}
              stroke="#666"
              strokeWidth="1"
              markerEnd="url(#arrowhead)"
            />
            {/* Vertical connector */}
            <line
              x1={`${startX + 2}%`}
              y1={startY}
              x2={`${startX + 2}%`}
              y2={endY}
              stroke="#666"
              strokeWidth="1"
            />
            {/* Horizontal line to start of task */}
            <line
              x1={`${startX + 2}%`}
              y1={endY}
              x2={`${endX}%`}
              y2={endY}
              stroke="#666"
              strokeWidth="1"
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      });
    });
  };

  return (
    <div className="bg-white rounded-lg border relative">
      {/* SVG for dependency lines */}
      {showDependencies && (
        <svg 
          className="absolute inset-0 pointer-events-none z-10" 
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
            </marker>
          </defs>
          {renderDependencyLines()}
        </svg>
      )}

      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Project Timeline</h3>
        {showCriticalPath && (
          <p className="text-sm text-gray-600 mt-1">
            Critical path tasks are highlighted in red
          </p>
        )}
        {showDependencies && (
          <p className="text-sm text-gray-600 mt-1">
            Dependency arrows show task relationships
          </p>
        )}
      </div>
      
      {/* Timeline Header */}
      <div className="flex border-b bg-gray-50">
        <div className="w-80 p-4 border-r font-semibold">Project / Task</div>
        <div className="flex-1 flex">
          {months.map((month, index) => (
            <div 
              key={index} 
              className="flex-1 p-4 text-center border-r font-medium text-sm"
            >
              {format(month, 'MMM yyyy')}
            </div>
          ))}
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
                <div className="flex border-b bg-gray-50">
                  <div className="w-80 p-3 border-r">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="font-semibold">{project.name}</span>
                      {projectTasks.length > 0 && (
                        <span className="text-sm text-gray-500">
                          ({Math.round(projectTasks.reduce((sum, task) => sum + task.progress, 0) / projectTasks.length)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 relative p-3">
                    {/* Project timeline bar */}
                  </div>
                </div>

                {/* Project Tasks */}
                {projectTasks.map((task) => {
                  const position = getTaskPosition(task);
                  const taskColor = getTaskColor(task, project.color);
                  
                  return (
                    <div key={task.id} className={`flex border-b hover:bg-gray-50 ${task.isCritical && showCriticalPath ? 'bg-red-50' : ''}`}>
                      <div className="w-80 p-3 border-r">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 flex items-center justify-center">
                            {task.isCritical && showCriticalPath ? (
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                            ) : (
                              <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
                            )}
                          </div>
                          <span className="font-medium text-sm">{task.title}</span>
                        </div>
                        {showDependencies && task.dependencies && task.dependencies.length > 0 && (
                          <div className="ml-6 mt-1">
                            <span className="text-xs text-gray-500">
                              Dependencies: {task.dependencies.length}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 relative h-12">
                        <div className="flex h-full">
                          {months.map((_, index) => (
                            <div key={index} className="flex-1 border-r border-gray-100"></div>
                          ))}
                        </div>
                        <div 
                          className="absolute top-2 h-8 rounded flex items-center justify-between px-2 text-white text-xs font-medium cursor-pointer hover:opacity-80"
                          style={{ 
                            ...position,
                            backgroundColor: taskColor,
                            minWidth: '60px'
                          }}
                          onClick={() => {
                            onTaskUpdate(task.id, { progress: Math.min(100, task.progress + 10) });
                          }}
                        >
                          <span className="truncate">{task.title.split(' ')[0]}</span>
                          {task.progress > 0 && (
                            <span className="text-xs">({task.progress}%)</span>
                          )}
                        </div>
                        
                        {/* Progress bar overlay */}
                        {task.progress > 0 && (
                          <div 
                            className="absolute top-2 h-8 rounded-l"
                            style={{ 
                              left: position.left,
                              width: `${(parseFloat(position.width.replace('%', '')) * task.progress) / 100}%`,
                              backgroundColor: 'rgba(255, 255, 255, 0.3)',
                              pointerEvents: 'none'
                            }}
                          />
                        )}
                        
                        {/* Milestone indicator */}
                        {showMilestones && task.progress === 100 && (
                          <div 
                            className="absolute top-1 w-2 h-2 bg-yellow-500 rotate-45"
                            style={{ 
                              left: `calc(${position.left} + ${position.width} - 4px)`
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
          No tasks found for selected projects
        </div>
      )}
    </div>
  );
}
