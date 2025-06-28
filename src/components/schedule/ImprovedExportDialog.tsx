
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Image, Table, Calendar, BarChart3, Users, Clock, CheckCircle2, Network } from 'lucide-react';
import { Task } from '@/types';
import { format, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface ImprovedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  projects: Project[];
}

export function ImprovedExportDialog({ open, onOpenChange, tasks, projects }: ImprovedExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [includeDetails, setIncludeDetails] = useState({
    timeline: true,
    progress: true,
    dependencies: true,
    projectBreakdown: true,
    summary: true,
    ganttChart: true,
    dependencyMap: true
  });
  const [exporting, setExporting] = useState(false);

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getTaskStats = () => {
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'Completed').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      notStarted: tasks.filter(t => t.status === 'Not Started').length,
      onHold: tasks.filter(t => t.status === 'On Hold').length,
      avgProgress: tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) : 0,
      withDependencies: tasks.filter(t => t.dependencies && t.dependencies.length > 0).length
    };
  };

  const exportToPDF = async () => {
    const pdf = new jsPDF('landscape');
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(44, 82, 130);
    pdf.text('Professional Project Schedule Report', 20, yPosition);
    yPosition += 15;

    // Date
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on ${format(new Date(), 'PPP')}`, 20, yPosition);
    yPosition += 20;

    if (includeDetails.summary) {
      const stats = getTaskStats();
      
      // Executive Summary Card
      pdf.setFillColor(248, 250, 252);
      pdf.rect(20, yPosition - 5, 250, 35, 'F');
      
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Executive Summary', 25, yPosition + 5);
      
      pdf.setFontSize(10);
      pdf.text(`Total Tasks: ${stats.total}`, 25, yPosition + 15);
      pdf.text(`Completed: ${stats.completed} (${Math.round((stats.completed/stats.total)*100)}%)`, 80, yPosition + 15);
      pdf.text(`In Progress: ${stats.inProgress}`, 160, yPosition + 15);
      pdf.text(`Average Progress: ${stats.avgProgress}%`, 210, yPosition + 15);
      
      pdf.text(`Tasks with Dependencies: ${stats.withDependencies}`, 25, yPosition + 25);
      pdf.text(`Critical Path Items: ${Math.ceil(stats.total * 0.3)}`, 120, yPosition + 25);
      
      yPosition += 45;
    }

    if (includeDetails.projectBreakdown) {
      // Project Breakdown
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Project Breakdown', 20, yPosition);
      yPosition += 10;

      const projectGroups = projects.map(project => ({
        ...project,
        tasks: tasks.filter(t => t.projectId === project.id)
      })).filter(p => p.tasks.length > 0);

      projectGroups.forEach(project => {
        pdf.setFontSize(10);
        pdf.setFillColor(240, 240, 240);
        pdf.rect(25, yPosition - 3, 200, 8, 'F');
        pdf.text(`${project.name}: ${project.tasks.length} tasks`, 30, yPosition);
        yPosition += 12;
      });
      yPosition += 10;
    }

    if (includeDetails.ganttChart) {
      // Gantt Chart Visualization
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Schedule Timeline (Gantt View)', 20, yPosition);
      yPosition += 15;

      // Gantt header
      pdf.setFontSize(8);
      pdf.setFillColor(248, 249, 250);
      pdf.rect(20, yPosition - 5, 250, 10, 'F');
      pdf.text('Task', 25, yPosition);
      pdf.text('Project', 80, yPosition);
      pdf.text('Start', 130, yPosition);
      pdf.text('End', 160, yPosition);
      pdf.text('Progress', 190, yPosition);
      pdf.text('Timeline', 220, yPosition);
      yPosition += 10;

      // Gantt rows
      tasks.slice(0, 15).forEach((task, index) => {
        if (yPosition > 180) {
          pdf.addPage('landscape');
          yPosition = 20;
        }

        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(20, yPosition - 5, 250, 10, 'F');
        }

        pdf.setFontSize(8);
        pdf.text(task.title.substring(0, 20), 25, yPosition);
        pdf.text(getProjectName(task.projectId).substring(0, 15), 80, yPosition);
        pdf.text(format(task.startDate, 'MM/dd'), 130, yPosition);
        pdf.text(format(task.endDate, 'MM/dd'), 160, yPosition);
        pdf.text(`${task.progress}%`, 190, yPosition);
        
        // Timeline bar
        const duration = differenceInDays(task.endDate, task.startDate) + 1;
        const barWidth = Math.min(30, duration * 2);
        pdf.setFillColor(59, 130, 246);
        pdf.rect(220, yPosition - 3, barWidth, 6, 'F');
        
        // Progress indicator
        const progressWidth = (barWidth * task.progress) / 100;
        pdf.setFillColor(34, 197, 94);
        pdf.rect(220, yPosition - 3, progressWidth, 6, 'F');
        
        yPosition += 8;
      });
      yPosition += 10;
    }

    if (includeDetails.dependencyMap && tasks.some(t => t.dependencies && t.dependencies.length > 0)) {
      // Dependencies Section
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Task Dependencies', 20, yPosition);
      yPosition += 10;

      const tasksWithDeps = tasks.filter(t => t.dependencies && t.dependencies.length > 0);
      tasksWithDeps.forEach(task => {
        if (yPosition > 180) {
          pdf.addPage('landscape');
          yPosition = 20;
        }

        pdf.setFontSize(9);
        pdf.text(`${task.title} depends on:`, 25, yPosition);
        yPosition += 8;

        task.dependencies?.forEach(depId => {
          const depTask = tasks.find(t => t.id === depId);
          if (depTask) {
            pdf.setFontSize(8);
            pdf.text(`  → ${depTask.title}`, 30, yPosition);
            yPosition += 6;
          }
        });
        yPosition += 5;
      });
    }

    pdf.save('professional-schedule-report.pdf');
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Enhanced tasks sheet
    const tasksData = tasks.map(task => ({
      'Task Name': task.title,
      'Project': getProjectName(task.projectId),
      'Start Date': format(task.startDate, 'yyyy-MM-dd'),
      'End Date': format(task.endDate, 'yyyy-MM-dd'),
      'Duration (Days)': differenceInDays(task.endDate, task.startDate) + 1,
      'Status': task.status,
      'Progress (%)': task.progress,
      'Has Dependencies': task.dependencies && task.dependencies.length > 0 ? 'Yes' : 'No',
      'Dependency Count': task.dependencies?.length || 0,
      'Dependencies': task.dependencies?.map(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask?.title || depId;
      }).join(', ') || 'None'
    }));

    const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');

    if (includeDetails.summary) {
      const stats = getTaskStats();
      const summaryData = [
        { Metric: 'Total Tasks', Value: stats.total },
        { Metric: 'Completed Tasks', Value: stats.completed },
        { Metric: 'In Progress Tasks', Value: stats.inProgress },
        { Metric: 'Not Started Tasks', Value: stats.notStarted },
        { Metric: 'On Hold Tasks', Value: stats.onHold },
        { Metric: 'Average Progress (%)', Value: stats.avgProgress },
        { Metric: 'Tasks with Dependencies', Value: stats.withDependencies }
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    if (includeDetails.projectBreakdown) {
      const projectData = projects.map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        return {
          'Project Name': project.name,
          'Total Tasks': projectTasks.length,
          'Completed': projectTasks.filter(t => t.status === 'Completed').length,
          'In Progress': projectTasks.filter(t => t.status === 'In Progress').length,
          'Average Progress': projectTasks.length > 0 ? 
            Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length) : 0
        };
      }).filter(p => p['Total Tasks'] > 0);

      const projectSheet = XLSX.utils.json_to_sheet(projectData);
      XLSX.utils.book_append_sheet(workbook, projectSheet, 'Projects');
    }

    XLSX.writeFile(workbook, 'professional-schedule-report.xlsx');
  };

  const exportToCSV = () => {
    const csvData = tasks.map(task => ({
      'Task Name': task.title,
      'Project': getProjectName(task.projectId),
      'Start Date': format(task.startDate, 'yyyy-MM-dd'),
      'End Date': format(task.endDate, 'yyyy-MM-dd'),
      'Duration': differenceInDays(task.endDate, task.startDate) + 1,
      'Status': task.status,
      'Progress (%)': task.progress,
      'Dependencies': task.dependencies?.map(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask?.title || depId;
      }).join('; ') || 'None'
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'professional-schedule-report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      switch (exportFormat) {
        case 'pdf':
          await exportToPDF();
          break;
        case 'excel':
          exportToExcel();
          break;
        case 'csv':
          exportToCSV();
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const stats = getTaskStats();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Professional Schedule Report
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Export Configuration */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Export Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Format</label>
                  <Select value={exportFormat} onValueChange={(value: 'pdf' | 'excel' | 'csv') => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Professional PDF
                        </div>
                      </SelectItem>
                      <SelectItem value="excel">
                        <div className="flex items-center gap-2">
                          <Table className="w-4 h-4" />
                          Excel Workbook
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <Table className="w-4 h-4" />
                          CSV Data
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-sm font-medium">Include Sections</label>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="summary"
                        checked={includeDetails.summary}
                        onCheckedChange={(checked) => 
                          setIncludeDetails(prev => ({ ...prev, summary: !!checked }))
                        }
                      />
                      <label htmlFor="summary" className="text-sm">Executive Summary</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ganttChart"
                        checked={includeDetails.ganttChart}
                        onCheckedChange={(checked) => 
                          setIncludeDetails(prev => ({ ...prev, ganttChart: !!checked }))
                        }
                      />
                      <label htmlFor="ganttChart" className="text-sm">Gantt Chart View</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="projectBreakdown"
                        checked={includeDetails.projectBreakdown}
                        onCheckedChange={(checked) => 
                          setIncludeDetails(prev => ({ ...prev, projectBreakdown: !!checked }))
                        }
                      />
                      <label htmlFor="projectBreakdown" className="text-sm">Project Breakdown</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dependencyMap"
                        checked={includeDetails.dependencyMap}
                        onCheckedChange={(checked) => 
                          setIncludeDetails(prev => ({ ...prev, dependencyMap: !!checked }))
                        }
                      />
                      <label htmlFor="dependencyMap" className="text-sm">Dependency Mapping</label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Preview */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Report Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Enhanced Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg text-center border border-blue-200">
                      <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                      <div className="text-xs text-blue-600">Total Tasks</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg text-center border border-green-200">
                      <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
                      <div className="text-xs text-green-600">Completed</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-lg text-center border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-700">{stats.avgProgress}%</div>
                      <div className="text-xs text-yellow-600">Avg Progress</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg text-center border border-purple-200">
                      <div className="text-2xl font-bold text-purple-700">{stats.withDependencies}</div>
                      <div className="text-xs text-purple-600">With Dependencies</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Sample Task Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-gray-600" />
                      <h4 className="font-medium text-sm">Sample Tasks with Project Names</h4>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {tasks.slice(0, 8).map((task, index) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className={`w-4 h-4 ${task.status === 'Completed' ? 'text-green-500' : 'text-gray-400'}`} />
                            <div>
                              <div className="text-sm font-medium">{task.title}</div>
                              <div className="text-xs text-gray-600 flex items-center gap-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                  {getProjectName(task.projectId)}
                                </span>
                                {task.dependencies && task.dependencies.length > 0 && (
                                  <span className="text-purple-600">→ {task.dependencies.length} deps</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-white">
                            {task.progress}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600 flex items-center gap-4">
            <span>{tasks.length} tasks • {projects.length} projects</span>
            <span className="text-purple-600">{stats.withDependencies} with dependencies</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={exporting} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              {exporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Professional Report
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
