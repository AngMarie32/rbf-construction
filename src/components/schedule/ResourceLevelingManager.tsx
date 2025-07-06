
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Users, Calendar, Clock, TrendingUp } from 'lucide-react';
import { Task } from '@/types';
import { format, addDays, differenceInDays, isWeekend } from 'date-fns';

interface ResourceLevelingManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onUpdateTasks: (updates: { taskId: string; updates: Partial<Task> }[]) => Promise<void>;
}

interface Resource {
  id: string;
  name: string;
  capacity: number;
  cost: number;
}

interface ResourceConflict {
  date: Date;
  overAllocated: number;
  conflictingTasks: Task[];
}

const defaultResources: Resource[] = [
  { id: '1', name: 'Construction Crew A', capacity: 8, cost: 500 },
  { id: '2', name: 'Construction Crew B', capacity: 8, cost: 500 },
  { id: '3', name: 'Equipment Operator', capacity: 1, cost: 150 },
  { id: '4', name: 'Foreman', capacity: 1, cost: 200 },
  { id: '5', name: 'Electrician', capacity: 2, cost: 300 },
  { id: '6', name: 'Plumber', capacity: 2, cost: 280 }
];

export function ResourceLevelingManager({
  open,
  onOpenChange,
  tasks,
  onUpdateTasks
}: ResourceLevelingManagerProps) {
  const [resources, setResources] = useState<Resource[]>(defaultResources);
  const [selectedStrategy, setSelectedStrategy] = useState<'delay' | 'split' | 'extend'>('delay');
  const [loading, setLoading] = useState(false);

  // Analyze resource conflicts
  const resourceAnalysis = useMemo(() => {
    const conflicts: ResourceConflict[] = [];
    const resourceUtilization = new Map<string, Map<string, number>>();

    // Initialize resource utilization tracking
    resources.forEach(resource => {
      resourceUtilization.set(resource.id, new Map());
    });

    // Simulate resource assignments (in a real app, this would come from task assignments)
    tasks.forEach(task => {
      const resourceId = Math.floor(Math.random() * resources.length).toString();
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return;

      const utilization = resourceUtilization.get(resourceId)!;
      
      // Calculate daily resource usage for this task
      let currentDate = new Date(task.startDate);
      const endDate = new Date(task.endDate);
      
      while (currentDate <= endDate) {
        if (!isWeekend(currentDate)) {
          const dateKey = format(currentDate, 'yyyy-MM-dd');
          const currentUsage = utilization.get(dateKey) || 0;
          const taskResourceNeeds = Math.ceil(resource.capacity * 0.7); // Assume 70% resource usage per task
          
          utilization.set(dateKey, currentUsage + taskResourceNeeds);
          
          // Check for over-allocation
          if (currentUsage + taskResourceNeeds > resource.capacity) {
            const existingConflict = conflicts.find(c => 
              format(c.date, 'yyyy-MM-dd') === dateKey
            );
            
            if (existingConflict) {
              existingConflict.overAllocated += (currentUsage + taskResourceNeeds) - resource.capacity;
              existingConflict.conflictingTasks.push(task);
            } else {
              conflicts.push({
                date: currentDate,
                overAllocated: (currentUsage + taskResourceNeeds) - resource.capacity,
                conflictingTasks: [task]
              });
            }
          }
        }
        currentDate = addDays(currentDate, 1);
      }
    });

    return {
      conflicts: conflicts.slice(0, 10), // Show top 10 conflicts
      totalConflicts: conflicts.length,
      resourceUtilization
    };
  }, [tasks, resources]);

  const handleApplyLeveling = async () => {
    setLoading(true);
    try {
      const updates: { taskId: string; updates: Partial<Task> }[] = [];

      resourceAnalysis.conflicts.forEach(conflict => {
        conflict.conflictingTasks.forEach((task, index) => {
          if (index > 0) { // Keep first task, adjust others
            let adjustedStartDate = new Date(task.startDate);
            let adjustedEndDate = new Date(task.endDate);

            switch (selectedStrategy) {
              case 'delay':
                // Delay task by conflict severity
                adjustedStartDate = addDays(adjustedStartDate, Math.ceil(conflict.overAllocated));
                adjustedEndDate = addDays(adjustedEndDate, Math.ceil(conflict.overAllocated));
                break;
              
              case 'extend':
                // Extend task duration to reduce daily resource needs
                const extensionDays = Math.ceil(conflict.overAllocated * 0.5);
                adjustedEndDate = addDays(adjustedEndDate, extensionDays);
                break;
              
              case 'split':
                // Split task (simplified - just delay second half)
                const taskDuration = differenceInDays(task.endDate, task.startDate);
                if (taskDuration > 2) {
                  adjustedStartDate = addDays(adjustedStartDate, Math.ceil(taskDuration / 2));
                }
                break;
            }

            updates.push({
              taskId: task.id,
              updates: {
                startDate: adjustedStartDate,
                endDate: adjustedEndDate
              }
            });
          }
        });
      });

      if (updates.length > 0) {
        await onUpdateTasks(updates);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error applying resource leveling:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Resource Leveling & Conflict Resolution
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resource Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resource Capacity Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {resources.map(resource => (
                  <div key={resource.id} className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">{resource.name}</div>
                    <div className="text-xs text-gray-500">
                      Capacity: {resource.capacity} | Cost: ${resource.cost}/day
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conflict Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Resource Conflicts Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="text-2xl font-bold text-orange-600">
                  {resourceAnalysis.totalConflicts}
                </div>
                <div className="text-sm text-gray-600">
                  Total resource conflicts across all dates
                </div>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {resourceAnalysis.conflicts.map((conflict, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-orange-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">
                        {format(conflict.date, 'MMM dd, yyyy')}
                      </div>
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        Over-allocated by {conflict.overAllocated}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      Conflicting tasks: {conflict.conflictingTasks.map(t => t.title).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leveling Strategy */}
          <Card>
            <CardHeader>
              <CardTitle>Resolution Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="strategy">Choose Resolution Method</Label>
                  <Select value={selectedStrategy} onValueChange={(value: any) => setSelectedStrategy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delay">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Delay Conflicting Tasks
                        </div>
                      </SelectItem>
                      <SelectItem value="extend">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Extend Task Duration
                        </div>
                      </SelectItem>
                      <SelectItem value="split">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Split Tasks
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    {selectedStrategy === 'delay' && 
                      'Tasks will be delayed to avoid resource conflicts. This may extend project timeline.'
                    }
                    {selectedStrategy === 'extend' && 
                      'Task durations will be extended to reduce daily resource requirements.'
                    }
                    {selectedStrategy === 'split' && 
                      'Large tasks will be split into smaller chunks to better distribute resources.'
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApplyLeveling} 
            disabled={loading || resourceAnalysis.totalConflicts === 0}
          >
            {loading ? 'Applying...' : `Apply Leveling (${resourceAnalysis.totalConflicts} conflicts)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
