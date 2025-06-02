
import { useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';

interface Task {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: string;
  projectId: string;
  dependencies: string[];
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
}

export function GanttChart({ tasks, projects, selectedProjects, onTaskUpdate }: GanttChartProps) {
  const { startDate, endDate, dateRange } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        dateRange: []
      };
    }

    const start = new Date(Math.min(...tasks.map(t => t.startDate.getTime())));
    const end = new Date(Math.max(...tasks.map(t => t.endDate.getTime())));
    const totalDays = differenceInDays(end, start) + 1;
    
    const range = Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      return date;
    });

    return { startDate: start, endDate: end, dateRange: range };
  }, [tasks]);

  const filteredTasks = tasks.filter(task => 
    selectedProjects.length === 0 || selectedProjects.includes(task.projectId)
  );

  const getProjectColor = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || '#3b82f6';
  };

  const getTaskPosition = (task: Task) => {
    const taskStart = differenceInDays(task.startDate, startDate);
    const taskDuration = differenceInDays(task.endDate, task.startDate) + 1;
    const leftPercent = (taskStart / dateRange.length) * 100;
    const widthPercent = (taskDuration / dateRange.length) * 100;
    
    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Gantt Chart View</h3>
      </div>
      
      {/* Date Header */}
      <div className="flex border-b">
        <div className="w-64 p-3 border-r bg-gray-50 font-medium">Task Name</div>
        <div className="flex-1 relative">
          <div className="flex">
            {dateRange.map((date, index) => (
              <div 
                key={index} 
                className="flex-1 min-w-[40px] p-2 text-xs text-center border-r border-gray-200"
              >
                <div className="font-medium">{format(date, 'dd')}</div>
                <div className="text-gray-500">{format(date, 'EEE')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="max-h-96 overflow-y-auto">
        {filteredTasks.map((task) => {
          const position = getTaskPosition(task);
          const projectColor = getProjectColor(task.projectId);
          
          return (
            <div key={task.id} className="flex border-b hover:bg-gray-50">
              <div className="w-64 p-3 border-r">
                <div className="font-medium text-sm">{task.title}</div>
                <div className="text-xs text-gray-500">
                  {projects.find(p => p.id === task.projectId)?.name}
                </div>
              </div>
              <div className="flex-1 relative h-12">
                <div className="flex h-full">
                  {dateRange.map((_, index) => (
                    <div key={index} className="flex-1 min-w-[40px] border-r border-gray-100"></div>
                  ))}
                </div>
                <div 
                  className="absolute top-2 h-8 rounded flex items-center justify-between px-2 text-white text-xs font-medium cursor-pointer hover:opacity-80"
                  style={{ 
                    ...position,
                    backgroundColor: projectColor,
                    minWidth: '60px'
                  }}
                  onClick={() => {
                    // Handle task click for editing
                  }}
                >
                  <span className="truncate">{task.progress}%</span>
                </div>
              </div>
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
