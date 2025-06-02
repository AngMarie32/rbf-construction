
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  dependencies: string[];
  projectId: string;
}

interface CriticalPathProps {
  tasks: Task[];
  selectedProjects: string[];
}

export function CriticalPath({ tasks, selectedProjects }: CriticalPathProps) {
  const criticalPathData = useMemo(() => {
    const filteredTasks = tasks.filter(task => 
      selectedProjects.length === 0 || selectedProjects.includes(task.projectId)
    );

    // Simple critical path calculation
    // In a real implementation, this would use more sophisticated algorithms
    const taskDurations = new Map(
      filteredTasks.map(task => [
        task.id, 
        Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24))
      ])
    );

    // Find tasks with dependencies and calculate critical path
    const criticalTasks = filteredTasks.filter(task => {
      const duration = taskDurations.get(task.id) || 0;
      return duration >= 5 || task.dependencies.length > 0; // Simple heuristic
    });

    const totalDuration = Array.from(taskDurations.values()).reduce((sum, duration) => sum + duration, 0);
    const criticalDuration = criticalTasks.reduce((sum, task) => sum + (taskDurations.get(task.id) || 0), 0);

    return {
      criticalTasks,
      totalDuration,
      criticalDuration,
      criticalPercentage: totalDuration > 0 ? Math.round((criticalDuration / totalDuration) * 100) : 0
    };
  }, [tasks, selectedProjects]);

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Critical Path Analysis</h3>
        </div>
      </div>

      <div className="p-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {criticalPathData.criticalTasks.length}
            </div>
            <div className="text-sm text-gray-600">Critical Tasks</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {criticalPathData.criticalDuration}
            </div>
            <div className="text-sm text-gray-600">Critical Days</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {criticalPathData.criticalPercentage}%
            </div>
            <div className="text-sm text-gray-600">Critical Ratio</div>
          </div>
        </div>

        {/* Critical Tasks List */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Critical Tasks</h4>
          {criticalPathData.criticalTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No critical tasks identified</p>
          ) : (
            criticalPathData.criticalTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                <div>
                  <div className="font-medium text-sm">{task.title}</div>
                  <div className="text-xs text-gray-600">
                    {task.startDate.toLocaleDateString()} - {task.endDate.toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.dependencies.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {task.dependencies.length} deps
                    </Badge>
                  )}
                  <Badge className="bg-red-100 text-red-800 text-xs">Critical</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
