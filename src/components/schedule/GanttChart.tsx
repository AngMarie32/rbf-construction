
import { useMemo } from 'react';
import { format, differenceInDays, eachMonthOfInterval } from 'date-fns';

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
}

export function GanttChart({ 
  tasks, 
  projects, 
  selectedProjects, 
  onTaskUpdate, 
  dateRange,
  showDependencies = false 
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

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Project Timeline</h3>
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
              {format(month, 'MMM')}
            </div>
          ))}
        </div>
      </div>

      {/* Task Rows */}
      <div className="max-h-96 overflow-y-auto">
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
                    {projectTasks.length > 0 && (
                      <div 
                        className="absolute top-2 h-6 rounded flex items-center px-2 text-white text-xs font-medium"
                        style={{ 
                          backgroundColor: project.color,
                          left: getTaskPosition(projectTasks[0]).left,
                          width: `${Math.max(...projectTasks.map(t => {
                            const pos = getTaskPosition(t);
                            return parseFloat(pos.left.replace('%', '')) + parseFloat(pos.width.replace('%', ''));
                          })) - Math.min(...projectTasks.map(t => parseFloat(getTaskPosition(t).left.replace('%', ''))))}%`
                        }}
                      >
                        {project.name} ({Math.round(projectTasks.reduce((sum, task) => sum + task.progress, 0) / projectTasks.length)}%)
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Tasks */}
                {projectTasks.map((task) => {
                  const position = getTaskPosition(task);
                  return (
                    <div key={task.id} className="flex border-b hover:bg-gray-50">
                      <div className="w-80 p-3 border-r">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 flex items-center justify-center">
                            <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
                          </div>
                          <span className="font-medium text-sm">{task.title}</span>
                        </div>
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
                            backgroundColor: project.color,
                            minWidth: '60px'
                          }}
                          onClick={() => {
                            onTaskUpdate(task.id, { progress: task.progress + 10 });
                          }}
                        >
                          <span className="truncate">{task.title.split(' ')[0]}</span>
                          {task.progress > 0 && (
                            <span className="text-xs">({task.progress}%)</span>
                          )}
                        </div>
                        {showDependencies && task.dependencies.length > 0 && (
                          <div className="absolute top-10 left-2 text-xs text-gray-500">
                            ↳ Dependencies: {task.dependencies.length}
                          </div>
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
