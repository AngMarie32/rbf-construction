
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Calendar, BarChart3, Clock, Users, AlertTriangle } from 'lucide-react';
import { Task } from '@/types';
import { format, differenceInDays } from 'date-fns';

interface EnhancedScheduleReportProps {
  tasks: Task[];
  projects: Array<{ id: string; name: string; color: string }>;
  selectedProjects: string[];
}

interface ReportOptions {
  includeGantt: boolean;
  includeTaskDetails: boolean;
  includeCriticalPath: boolean;
  includeResourceAnalysis: boolean;
  includeTimeline: boolean;
  includeDependencies: boolean;
  format: 'pdf' | 'html' | 'excel';
  groupBy: 'project' | 'status' | 'date' | 'none';
}

export function EnhancedScheduleReport({ tasks, projects, selectedProjects }: EnhancedScheduleReportProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ReportOptions>({
    includeGantt: true,
    includeTaskDetails: true,
    includeCriticalPath: false,
    includeResourceAnalysis: false,
    includeTimeline: true,
    includeDependencies: false,
    format: 'pdf',
    groupBy: 'project'
  });

  const filteredTasks = tasks.filter(task => selectedProjects.includes(task.projectId));
  
  const getTaskStats = () => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'Completed').length;
    const inProgress = filteredTasks.filter(t => t.status === 'In Progress').length;
    const notStarted = filteredTasks.filter(t => t.status === 'Not Started').length;
    const onHold = filteredTasks.filter(t => t.status === 'On Hold').length;
    
    const overdueTasks = filteredTasks.filter(t => 
      new Date(t.endDate) < new Date() && t.status !== 'Completed'
    ).length;

    const avgProgress = filteredTasks.reduce((sum, task) => sum + task.progress, 0) / total || 0;

    return {
      total,
      completed,
      inProgress,
      notStarted,
      onHold,
      overdueTasks,
      avgProgress: Math.round(avgProgress)
    };
  };

  const getCriticalPathTasks = () => {
    // Simplified critical path calculation
    return filteredTasks
      .filter(task => task.dependencies && task.dependencies.length > 0)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5); // Top 5 critical tasks
  };

  const generateReport = () => {
    const stats = getTaskStats();
    const criticalTasks = getCriticalPathTasks();
    
    const reportData = {
      title: 'Enhanced Schedule Report',
      generatedAt: new Date().toISOString(),
      projects: projects.filter(p => selectedProjects.includes(p.id)),
      tasks: filteredTasks,
      stats,
      criticalTasks,
      options
    };

    if (options.format === 'html') {
      generateHTMLReport(reportData);
    } else if (options.format === 'pdf') {
      generatePDFReport(reportData);
    } else {
      generateExcelReport(reportData);
    }
  };

  const generateHTMLReport = (data: any) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
          .stat-card { background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
          .task-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .task-table th, .task-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .task-table th { background: #f8f9fa; font-weight: bold; }
          .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-inprogress { background: #dbeafe; color: #1e40af; }
          .status-notstarted { background: #f3f4f6; color: #374151; }
          .status-onhold { background: #fef3c7; color: #92400e; }
          .critical-section { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.title}</h1>
          <p>Generated on: ${format(new Date(data.generatedAt), 'PPpp')}</p>
          <p>Projects: ${data.projects.map((p: any) => p.name).join(', ')}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Tasks</h3>
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${data.stats.total}</div>
          </div>
          <div class="stat-card">
            <h3>Completed</h3>
            <div style="font-size: 24px; font-weight: bold; color: #10b981;">${data.stats.completed}</div>
          </div>
          <div class="stat-card">
            <h3>In Progress</h3>
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${data.stats.inProgress}</div>
          </div>
          <div class="stat-card">
            <h3>Average Progress</h3>
            <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${data.stats.avgProgress}%</div>
          </div>
          <div class="stat-card">
            <h3>Overdue Tasks</h3>
            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${data.stats.overdueTasks}</div>
          </div>
        </div>

        ${options.includeCriticalPath ? `
          <div class="critical-section">
            <h2>🚨 Critical Path Tasks</h2>
            ${data.criticalTasks.map((task: Task) => `
              <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
                <strong>${task.title}</strong><br>
                <small>Due: ${format(task.endDate, 'PPP')} | Progress: ${task.progress}%</small>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${options.includeTaskDetails ? `
          <table class="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Duration</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.tasks.map((task: Task) => {
                const project = data.projects.find((p: any) => p.id === task.projectId);
                const duration = differenceInDays(task.endDate, task.startDate) + 1;
                const statusClass = task.status.toLowerCase().replace(/\s+/g, '');
                
                return `
                  <tr>
                    <td><strong>${task.title}</strong></td>
                    <td>${project?.name || 'Unknown'}</td>
                    <td>${format(task.startDate, 'MMM dd, yyyy')}</td>
                    <td>${format(task.endDate, 'MMM dd, yyyy')}</td>
                    <td>${duration} days</td>
                    <td>
                      <div style="background: #e5e7eb; border-radius: 10px; height: 8px; overflow: hidden;">
                        <div style="width: ${task.progress}%; height: 100%; background: #3b82f6; border-radius: 10px;"></div>
                      </div>
                      ${task.progress}%
                    </td>
                    <td><span class="status-badge status-${statusClass}">${task.status}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #6b7280; font-size: 12px;">
          <p>This report was generated automatically by the Construction Management System</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-report-${format(new Date(), 'yyyy-MM-dd')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDFReport = (data: any) => {
    // For now, generate HTML and suggest printing to PDF
    generateHTMLReport(data);
  };

  const generateExcelReport = (data: any) => {
    // Create CSV format for Excel compatibility
    const csvContent = [
      'Task,Project,Start Date,End Date,Duration (days),Progress (%),Status',
      ...data.tasks.map((task: Task) => {
        const project = data.projects.find((p: any) => p.id === task.projectId);
        const duration = differenceInDays(task.endDate, task.startDate) + 1;
        return [
          `"${task.title}"`,
          `"${project?.name || 'Unknown'}"`,
          format(task.startDate, 'yyyy-MM-dd'),
          format(task.endDate, 'yyyy-MM-dd'),
          duration,
          task.progress,
          `"${task.status}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = getTaskStats();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
          <FileText className="w-4 h-4 mr-2" />
          Enhanced Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Enhanced Schedule Report
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="options" className="space-y-4">
          <TabsList>
            <TabsTrigger value="options">Report Options</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="options" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Report Sections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeTaskDetails"
                      checked={options.includeTaskDetails}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, includeTaskDetails: checked === true }))
                      }
                    />
                    <Label htmlFor="includeTaskDetails">Task Details Table</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCriticalPath"
                      checked={options.includeCriticalPath}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, includeCriticalPath: checked === true }))
                      }
                    />
                    <Label htmlFor="includeCriticalPath">Critical Path Analysis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeTimeline"
                      checked={options.includeTimeline}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, includeTimeline: checked === true }))
                      }
                    />
                    <Label htmlFor="includeTimeline">Project Timeline</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeDependencies"
                      checked={options.includeDependencies}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, includeDependencies: checked === true }))
                      }
                    />
                    <Label htmlFor="includeDependencies">Task Dependencies</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Format & Grouping</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="format">Export Format</Label>
                    <Select 
                      value={options.format} 
                      onValueChange={(value: any) => setOptions(prev => ({ ...prev, format: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="html">HTML Report</SelectItem>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="excel">Excel/CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="groupBy">Group Tasks By</Label>
                    <Select 
                      value={options.groupBy} 
                      onValueChange={(value: any) => setOptions(prev => ({ ...prev, groupBy: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="date">Start Date</SelectItem>
                        <SelectItem value="none">No Grouping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Report Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total Tasks</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded">
                    <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
                    <div className="text-sm text-gray-600">In Progress</div>  
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">{stats.avgProgress}%</div>
                    <div className="text-sm text-gray-600">Avg Progress</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
                    <div className="text-sm text-gray-600">Overdue</div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Report will include {filteredTasks.length} tasks from {projects.filter(p => selectedProjects.includes(p.id)).length} selected projects.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={generateReport} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
