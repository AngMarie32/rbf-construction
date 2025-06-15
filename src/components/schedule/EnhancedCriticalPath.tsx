
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { Task } from '@/types';
import { differenceInDays, format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface CriticalPathProps {
  tasks: Task[];
  projects: Project[];
  selectedProjects: string[];
}

interface CriticalPathNode {
  task: Task;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
}

export function EnhancedCriticalPath({ tasks, projects, selectedProjects }: CriticalPathProps) {
  const [selectedView, setSelectedView] = useState<'analysis' | 'timeline' | 'float'>('analysis');

  const criticalPathAnalysis = useMemo(() => {
    const filteredTasks = tasks.filter(task => 
      selectedProjects.length === 0 || selectedProjects.includes(task.projectId)
    );

    if (filteredTasks.length === 0) {
      return {
        nodes: [],
        criticalPath: [],
        totalDuration: 0,
        criticalDuration: 0,
        projectSlack: 0
      };
    }

    // Create nodes with initial calculations
    const nodes: Map<string, CriticalPathNode> = new Map();
    const projectStartDate = new Date(Math.min(...filteredTasks.map(t => t.startDate.getTime())));
    
    filteredTasks.forEach(task => {
      const duration = differenceInDays(task.endDate, task.startDate) + 1;
      const earlyStart = differenceInDays(task.startDate, projectStartDate);
      
      nodes.set(task.id, {
        task,
        earlyStart,
        earlyFinish: earlyStart + duration,
        lateStart: 0,
        lateFinish: 0,
        totalFloat: 0,
        freeFloat: 0,
        isCritical: false
      });
    });

    // Forward pass - calculate early start/finish
    const processedForward = new Set<string>();
    const processForward = (taskId: string) => {
      if (processedForward.has(taskId)) return;
      
      const node = nodes.get(taskId);
      if (!node) return;

      // Process dependencies first
      if (node.task.dependencies && node.task.dependencies.length > 0) {
        let maxEarlyFinish = 0;
        node.task.dependencies.forEach(depId => {
          processForward(depId);
          const depNode = nodes.get(depId);
          if (depNode) {
            maxEarlyFinish = Math.max(maxEarlyFinish, depNode.earlyFinish);
          }
        });
        
        const duration = differenceInDays(node.task.endDate, node.task.startDate) + 1;
        node.earlyStart = maxEarlyFinish;
        node.earlyFinish = node.earlyStart + duration;
      }
      
      processedForward.add(taskId);
    };

    filteredTasks.forEach(task => processForward(task.id));

    // Calculate project end date
    const projectEndDate = Math.max(...Array.from(nodes.values()).map(n => n.earlyFinish));

    // Backward pass - calculate late start/finish
    const processedBackward = new Set<string>();
    const processBackward = (taskId: string) => {
      if (processedBackward.has(taskId)) return;
      
      const node = nodes.get(taskId);
      if (!node) return;

      // Find tasks that depend on this task
      const dependentTasks = filteredTasks.filter(t => 
        t.dependencies && t.dependencies.includes(taskId)
      );

      if (dependentTasks.length === 0) {
        // End task
        node.lateFinish = projectEndDate;
      } else {
        // Process dependent tasks first
        let minLateStart = Infinity;
        dependentTasks.forEach(depTask => {
          processBackward(depTask.id);
          const depNode = nodes.get(depTask.id);
          if (depNode) {
            minLateStart = Math.min(minLateStart, depNode.lateStart);
          }
        });
        node.lateFinish = minLateStart;
      }

      const duration = differenceInDays(node.task.endDate, node.task.startDate) + 1;
      node.lateStart = node.lateFinish - duration;
      node.totalFloat = node.lateStart - node.earlyStart;
      node.isCritical = node.totalFloat === 0;

      processedBackward.add(taskId);
    };

    filteredTasks.forEach(task => processBackward(task.id));

    // Calculate free float
    nodes.forEach((node, taskId) => {
      const dependentTasks = filteredTasks.filter(t => 
        t.dependencies && t.dependencies.includes(taskId)
      );
      
      if (dependentTasks.length === 0) {
        node.freeFloat = node.totalFloat;
      } else {
        const minEarlyStart = Math.min(...dependentTasks.map(t => {
          const depNode = nodes.get(t.id);
          return depNode ? depNode.earlyStart : Infinity;
        }));
        node.freeFloat = minEarlyStart - node.earlyFinish;
      }
    });

    // Identify critical path
    const criticalTasks = Array.from(nodes.values()).filter(n => n.isCritical);
    const criticalDuration = criticalTasks.reduce((sum, node) => {
      const duration = differenceInDays(node.task.endDate, node.task.startDate) + 1;
      return sum + duration;
    }, 0);

    return {
      nodes: Array.from(nodes.values()),
      criticalPath: criticalTasks.map(n => n.task),
      totalDuration: projectEndDate,
      criticalDuration,
      projectSlack: Math.min(...Array.from(nodes.values()).map(n => n.totalFloat))
    };
  }, [tasks, selectedProjects]);

  const renderAnalysisView = () => (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {criticalPathAnalysis.criticalPath.length}
            </div>
            <div className="text-sm text-gray-600">Critical Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {criticalPathAnalysis.criticalDuration}
            </div>
            <div className="text-sm text-gray-600">Critical Days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {criticalPathAnalysis.totalDuration}
            </div>
            <div className="text-sm text-gray-600">Total Duration</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {criticalPathAnalysis.projectSlack}
            </div>
            <div className="text-sm text-gray-600">Project Slack</div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Path Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Critical Path Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {criticalPathAnalysis.criticalPath.map((task, index) => {
              const project = projects.find(p => p.id === task.projectId);
              return (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full text-red-600 font-medium text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-sm text-gray-600">
                        {format(task.startDate, 'MMM d')} - {format(task.endDate, 'MMM d')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {project && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                    )}
                    <Badge className="bg-red-100 text-red-800">Critical</Badge>
                    <div className="text-sm text-gray-500">
                      {task.progress}% complete
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTimelineView = () => (
    <div className="space-y-4">
      {criticalPathAnalysis.nodes
        .sort((a, b) => a.earlyStart - b.earlyStart)
        .map((node) => {
          const project = projects.find(p => p.id === node.task.projectId);
          const duration = differenceInDays(node.task.endDate, node.task.startDate) + 1;
          
          return (
            <Card key={node.task.id} className={node.isCritical ? 'border-red-200 bg-red-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{node.task.title}</div>
                      <div className="text-sm text-gray-600">
                        Duration: {duration} days | Float: {node.totalFloat} days
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {project && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                    )}
                    {node.isCritical && (
                      <Badge className="bg-red-100 text-red-800">Critical</Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Early: Day {node.earlyStart} - {node.earlyFinish}</span>
                    <span>Late: Day {node.lateStart} - {node.lateFinish}</span>
                  </div>
                  <Progress 
                    value={node.task.progress} 
                    className={`h-2 ${node.isCritical ? 'bg-red-100' : 'bg-gray-100'}`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );

  const renderFloatView = () => (
    <div className="space-y-4">
      {criticalPathAnalysis.nodes
        .sort((a, b) => a.totalFloat - b.totalFloat)
        .map((node) => {
          const project = projects.find(p => p.id === node.task.projectId);
          
          return (
            <Card key={node.task.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{node.task.title}</div>
                      <div className="text-sm text-gray-600">
                        {format(node.task.startDate, 'MMM d')} - {format(node.task.endDate, 'MMM d')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {project && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                    )}
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Total Float: {node.totalFloat} days
                      </div>
                      <div className="text-xs text-gray-500">
                        Free Float: {node.freeFloat} days
                      </div>
                    </div>
                    {node.isCritical && (
                      <Badge className="bg-red-100 text-red-800">Critical</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Enhanced Critical Path Analysis
          </CardTitle>
          <div className="text-sm text-gray-500">
            {criticalPathAnalysis.nodes.length} tasks analyzed
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="float">Float Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="mt-6">
            {renderAnalysisView()}
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            {renderTimelineView()}
          </TabsContent>

          <TabsContent value="float" className="mt-6">
            {renderFloatView()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
