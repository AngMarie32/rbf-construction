
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, FileSpreadsheet, AlertCircle, BarChart3, Calendar, List, Settings } from 'lucide-react';
import { Task } from '@/types';
import { generateExcelReport, generatePDFReport } from '@/utils/reportExports';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  color: string;
  client?: string;
  contractValue?: number;
  status?: string;
}

interface EnhancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  projects: Project[];
  selectedProjects?: string[];
  title?: string;
}

export function EnhancedExportDialog({
  open,
  onOpenChange,
  tasks,
  projects,
  selectedProjects = [],
  title = 'Project Schedule Report'
}: EnhancedExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [reportOptions, setReportOptions] = useState({
    includeGanttChart: true,
    includeTaskList: true,
    includeProjectSummary: true,
    includeProgressAnalysis: true,
    includeCriticalPath: true,
    includeResourceAllocation: false,
    dateFormat: 'MM/dd/yyyy' as 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd',
    groupBy: 'project' as 'project' | 'status' | 'none'
  });

  const [loading, setLoading] = useState(false);

  const handleReportOption = (key: string, value: any) => {
    setReportOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      
      const filteredTasks = selectedProjects.length > 0 
        ? tasks.filter(task => selectedProjects.includes(task.projectId))
        : tasks;

      const filteredProjects = selectedProjects.length > 0
        ? projects.filter(project => selectedProjects.includes(project.id))
        : projects;

      const exportData = {
        title,
        tasks: filteredTasks,
        projects: filteredProjects,
        options: reportOptions,
        metadata: {
          dateRange: `${filteredTasks.length > 0 ? new Date(Math.min(...filteredTasks.map(t => t.startDate.getTime()))).toLocaleDateString() : 'N/A'} - ${filteredTasks.length > 0 ? new Date(Math.max(...filteredTasks.map(t => t.endDate.getTime()))).toLocaleDateString() : 'N/A'}`,
          generatedBy: 'Project Management System',
          generatedAt: new Date().toLocaleString(),
          taskCount: filteredTasks.length,
          projectCount: filteredProjects.length
        }
      };

      if (exportFormat === 'excel') {
        await generateExcelReport(exportData);
        toast.success('Excel report generated successfully');
      } else {
        await generatePDFReport(exportData);
        toast.success('PDF report generated successfully');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedOptionsCount = () => {
    const options = [
      reportOptions.includeGanttChart,
      reportOptions.includeTaskList,
      reportOptions.includeProjectSummary,
      reportOptions.includeProgressAnalysis,
      reportOptions.includeCriticalPath,
      reportOptions.includeResourceAllocation
    ];
    return options.filter(Boolean).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Schedule Report
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="format" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="format">Export Format</TabsTrigger>
            <TabsTrigger value="content">Report Content</TabsTrigger>
            <TabsTrigger value="settings">Formatting</TabsTrigger>
          </TabsList>

          <TabsContent value="format" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Choose Export Format</CardTitle>
                <CardDescription>
                  Select the format for your project schedule report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`p-6 border rounded-lg cursor-pointer transition-all ${
                      exportFormat === 'excel' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setExportFormat('excel')}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold">Excel Workbook</h3>
                        <p className="text-sm text-gray-600">Comprehensive data analysis</p>
                      </div>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Multiple worksheets for different views</li>
                      <li>• Interactive charts and graphs</li>
                      <li>• Sortable and filterable data</li>
                      <li>• Progress tracking with formulas</li>
                      <li>• Professional formatting</li>
                    </ul>
                  </div>

                  <div 
                    className={`p-6 border rounded-lg cursor-pointer transition-all ${
                      exportFormat === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setExportFormat('pdf')}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-8 h-8 text-red-600" />
                      <div>
                        <h3 className="font-semibold">PDF Report</h3>
                        <p className="text-sm text-gray-600">Presentation-ready document</p>
                      </div>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Executive summary with key metrics</li>
                      <li>• Visual Gantt chart representation</li>
                      <li>• Professional layout and styling</li>
                      <li>• Print-optimized formatting</li>
                      <li>• Stakeholder-friendly presentation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Content</CardTitle>
                <CardDescription>
                  Select which sections to include in your report ({getSelectedOptionsCount()} selected)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="includeTaskList"
                        checked={reportOptions.includeTaskList}
                        onCheckedChange={(checked) => 
                          handleReportOption('includeTaskList', checked)
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <List className="w-4 h-4 text-blue-600" />
                          <Label htmlFor="includeTaskList" className="font-medium">Task List</Label>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Detailed table with all tasks, dates, and status
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="includeGanttChart"
                        checked={reportOptions.includeGanttChart}
                        onCheckedChange={(checked) => 
                          handleReportOption('includeGanttChart', checked)
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-green-600" />
                          <Label htmlFor="includeGanttChart" className="font-medium">Gantt Chart</Label>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Timeline visualization with dependencies
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="includeProjectSummary"
                        checked={reportOptions.includeProjectSummary}
                        onCheckedChange={(checked) => 
                          handleReportOption('includeProjectSummary', checked)
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <Label htmlFor="includeProjectSummary" className="font-medium">Project Summary</Label>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          High-level project metrics and overview
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="includeProgressAnalysis"
                        checked={reportOptions.includeProgressAnalysis}
                        onCheckedChange={(checked) => 
                          handleReportOption('includeProgressAnalysis', checked)
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-orange-600" />
                          <Label htmlFor="includeProgressAnalysis" className="font-medium">Progress Analysis</Label>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Charts showing completion rates and trends
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="includeCriticalPath"
                        checked={reportOptions.includeCriticalPath}
                        onCheckedChange={(checked) => 
                          handleReportOption('includeCriticalPath', checked)
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <Label htmlFor="includeCriticalPath" className="font-medium">Critical Path</Label>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Analysis of critical tasks and bottlenecks
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <Checkbox
                        id="includeResourceAllocation"
                        checked={reportOptions.includeResourceAllocation}
                        onCheckedChange={(checked) => 
                          handleReportOption('includeResourceAllocation', checked)
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-gray-600" />
                          <Label htmlFor="includeResourceAllocation" className="font-medium">Resource Allocation</Label>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Resource utilization and workload analysis
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Formatting Options</CardTitle>
                <CardDescription>
                  Customize the appearance and organization of your report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium">Date Format</Label>
                    <Select
                      value={reportOptions.dateFormat}
                      onValueChange={(value) => handleReportOption('dateFormat', value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (12/25/2024)</SelectItem>
                        <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (25/12/2024)</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (2024-12-25)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Group Tasks By</Label>
                    <Select
                      value={reportOptions.groupBy}
                      onValueChange={(value) => handleReportOption('groupBy', value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="none">No Grouping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {tasks.length} tasks • {projects.length} projects • {getSelectedOptionsCount()} sections selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateReport}
              disabled={loading || getSelectedOptionsCount() === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Generating...' : `Export ${exportFormat.toUpperCase()}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
