
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Image, Table, Calendar, BarChart3, Users, Clock, CheckCircle2 } from 'lucide-react';
import { Task } from '@/types';
import { format } from 'date-fns';
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
    dependencies: false,
    projectBreakdown: true,
    summary: true
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
      avgProgress: tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) : 0
    };
  };

  const exportToPDF = async () => {
    const pdf = new jsPDF('landscape');
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(44, 82, 130);
    pdf.text('Project Schedule Report', 20, yPosition);
    yPosition += 15;

    // Date
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on ${format(new Date(), 'PPP')}`, 20, yPosition);
    yPosition += 20;

    if (includeDetails.summary) {
      const stats = getTaskStats();
      
      // Summary Section
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Executive Summary', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.text(`Total Tasks: ${stats.total}`, 20, yPosition);
      pdf.text(`Completed: ${stats.completed}`, 80, yPosition);
      pdf.text(`In Progress: ${stats.inProgress}`, 140, yPosition);
      pdf.text(`Average Progress: ${stats.avgProgress}%`, 200, yPosition);
      yPosition += 20;
    }

    // Tasks Table
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Task Details', 20, yPosition);
    yPosition += 15;

    // Table Header
    pdf.setFontSize(9);
    pdf.setFillColor(248, 249, 250);
    pdf.rect(20, yPosition - 5, 250, 10, 'F');
    pdf.text('Task', 25, yPosition);
    pdf.text('Project', 80, yPosition);
    pdf.text('Start Date', 130, yPosition);
    pdf.text('End Date', 170, yPosition);
    pdf.text('Status', 210, yPosition);
    pdf.text('Progress', 240, yPosition);
    yPosition += 10;

    // Table Rows
    tasks.forEach((task, index) => {
      if (yPosition > 180) {
        pdf.addPage('landscape');
        yPosition = 20;
      }

      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(20, yPosition - 5, 250, 10, 'F');
      }

      pdf.text(task.title.substring(0, 25), 25, yPosition);
      pdf.text(getProjectName(task.projectId).substring(0, 20), 80, yPosition);
      pdf.text(format(task.startDate, 'MM/dd/yy'), 130, yPosition);
      pdf.text(format(task.endDate, 'MM/dd/yy'), 170, yPosition);
      pdf.text(task.status, 210, yPosition);
      pdf.text(`${task.progress}%`, 240, yPosition);
      yPosition += 8;
    });

    pdf.save('project-schedule-report.pdf');
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Main tasks sheet
    const tasksData = tasks.map(task => ({
      'Task Name': task.title,
      'Project': getProjectName(task.projectId),
      'Start Date': format(task.startDate, 'yyyy-MM-dd'),
      'End Date': format(task.endDate, 'yyyy-MM-dd'),
      'Status': task.status,
      'Progress (%)': task.progress,
      'Dependencies': task.dependencies?.join(', ') || 'None'
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
        { Metric: 'Average Progress (%)', Value: stats.avgProgress }
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    XLSX.writeFile(workbook, 'project-schedule-report.xlsx');
  };

  const exportToCSV = () => {
    const csvData = tasks.map(task => ({
      'Task Name': task.title,
      'Project': getProjectName(task.projectId),
      'Start Date': format(task.startDate, 'yyyy-MM-dd'),
      'End Date': format(task.endDate, 'yyyy-MM-dd'),
      'Status': task.status,
      'Progress (%)': task.progress,
      'Dependencies': task.dependencies?.join(', ') || 'None'
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'project-schedule-report.csv');
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Schedule Report
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Export Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Export Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={exportFormat} onValueChange={(value: 'pdf' | 'excel' | 'csv') => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        PDF Report
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Include Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                    id="timeline"
                    checked={includeDetails.timeline}
                    onCheckedChange={(checked) => 
                      setIncludeDetails(prev => ({ ...prev, timeline: !!checked }))
                    }
                  />
                  <label htmlFor="timeline" className="text-sm">Timeline Details</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="progress"
                    checked={includeDetails.progress}
                    onCheckedChange={(checked) => 
                      setIncludeDetails(prev => ({ ...prev, progress: !!checked }))
                    }
                  />
                  <label htmlFor="progress" className="text-sm">Progress Tracking</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dependencies"
                    checked={includeDetails.dependencies}
                    onCheckedChange={(checked) => 
                      setIncludeDetails(prev => ({ ...prev, dependencies: !!checked }))
                    }
                  />
                  <label htmlFor="dependencies" className="text-sm">Task Dependencies</label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Report Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                      <div className="text-xs text-blue-800">Total Tasks</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                      <div className="text-xs text-green-800">Completed</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
                      <div className="text-xs text-yellow-800">In Progress</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-600">{stats.avgProgress}%</div>
                      <div className="text-xs text-gray-800">Avg Progress</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Sample Task List */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Sample Tasks (First 5)</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {tasks.slice(0, 5).map((task, index) => (
                        <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className={`w-4 h-4 ${task.status === 'Completed' ? 'text-green-500' : 'text-gray-400'}`} />
                            <span className="text-sm font-medium">{task.title}</span>
                          </div>
                          <Badge variant="outline">{task.progress}%</Badge>
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
          <div className="text-sm text-gray-600">
            {tasks.length} tasks • {projects.length} projects
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Exporting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
