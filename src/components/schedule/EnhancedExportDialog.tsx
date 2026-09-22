import { localDateISO } from '@/utils/dates';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Printer, AlertCircle, BarChart3, Calendar, List, GitBranch, Download } from 'lucide-react';
import { Task } from '@/types';
import { generateProfessionalGanttPDF, generateProfessionalExcel } from './ProfessionalGanttExport';
import { validateTaskList, formatValidationMessage, getValidationSummary } from '@/utils/dataValidation';
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
  title?: string;
}

export function EnhancedExportDialog({
  open,
  onOpenChange,
  tasks,
  projects,
  title = 'Project Schedule Report'
}: EnhancedExportDialogProps) {
  const [reportOptions, setReportOptions] = useState({
    includeGanttChart: true,
    includeTaskList: true,
    includeCalendarView: true,
    includeCriticalPath: true,
    includeProgress: true,
    includeDependencies: true,
    includeProjectInfo: true,
    showBusinessDaysOnly: true,
    dateFormat: 'yyyy-MM-dd' as 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy'
  });

  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(validateTaskList(tasks));

  const handleReportOption = (key: string, value: any) => {
    setReportOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleGeneratePDF = async () => {
    try {
      setLoading(true);
      const dateRange = {
        from: new Date(Math.min(...tasks.map(t => t.startDate.getTime()))),
        to: new Date(Math.max(...tasks.map(t => t.endDate.getTime())))
      };
      
      const doc = generateProfessionalGanttPDF(tasks, projects, dateRange, {
        title,
        showProgress: reportOptions.includeProgress,
        showDependencies: reportOptions.includeDependencies,
        dateFormat: reportOptions.dateFormat
      });
      
      doc.save(`${title.replace(/\s+/g, '_')}_${localDateISO()}.pdf`);
      toast.success('PDF report generated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExcel = async () => {
    try {
      setLoading(true);
      const dateRange = {
        from: new Date(Math.min(...tasks.map(t => t.startDate.getTime()))),
        to: new Date(Math.max(...tasks.map(t => t.endDate.getTime())))
      };
      
      const workbook = generateProfessionalExcel(tasks, projects, dateRange, {
        title,
        showProgress: reportOptions.includeProgress,
        showDependencies: reportOptions.includeDependencies,
        dateFormat: reportOptions.dateFormat
      });
      
      const XLSX = await import('xlsx');
      XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}_${localDateISO()}.xlsx`);
      toast.success('Excel report generated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel report');
    } finally {
      setLoading(false);
    }
  };

  const validateAndUpdateData = () => {
    const result = validateTaskList(tasks);
    setValidationResult(result);
    return result;
  };

  const getIncludedViewsCount = () => {
    const views = [
      reportOptions.includeGanttChart,
      reportOptions.includeTaskList,
      reportOptions.includeCalendarView,
      reportOptions.includeCriticalPath
    ];
    return views.filter(Boolean).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Professional Project Report
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="views" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="views">Report Views</TabsTrigger>
            <TabsTrigger value="options">Data Options</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="views" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Professional Report Views</CardTitle>
                <CardDescription>
                  Generate reports similar to Microsoft Project with business day calculations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id="includeGanttChart"
                      checked={reportOptions.includeGanttChart}
                      onCheckedChange={(checked) => 
                        handleReportOption('includeGanttChart', checked)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <Label htmlFor="includeGanttChart" className="font-medium">Professional Gantt Chart</Label>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        High-quality timeline with business day calculations and professional formatting
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id="showBusinessDaysOnly"
                      checked={reportOptions.showBusinessDaysOnly}
                      onCheckedChange={(checked) => 
                        handleReportOption('showBusinessDaysOnly', checked)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <Label htmlFor="showBusinessDaysOnly" className="font-medium">Business Days Only</Label>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Calculate durations excluding weekends and holidays for accurate project planning
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id="includeTaskList"
                      checked={reportOptions.includeTaskList}
                      onCheckedChange={(checked) => 
                        handleReportOption('includeTaskList', checked)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <List className="w-4 h-4 text-green-600" />
                        <Label htmlFor="includeTaskList" className="font-medium">Task List</Label>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Detailed table with all tasks, dates, status, and progress information
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id="includeCalendarView"
                      checked={reportOptions.includeCalendarView}
                      onCheckedChange={(checked) => 
                        handleReportOption('includeCalendarView', checked)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <Label htmlFor="includeCalendarView" className="font-medium">Calendar Overview</Label>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Calendar-style view highlighting upcoming and overdue tasks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id="includeCriticalPath"
                      checked={reportOptions.includeCriticalPath}
                      onCheckedChange={(checked) => 
                        handleReportOption('includeCriticalPath', checked)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-red-600" />
                        <Label htmlFor="includeCriticalPath" className="font-medium">Critical Path Analysis</Label>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Analysis of critical tasks that impact project completion timeline
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Professional Formatting Options</CardTitle>
                <CardDescription>
                  Configure report appearance and data presentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeProgress"
                      checked={reportOptions.includeProgress}
                      onCheckedChange={(checked) => 
                        handleReportOption('includeProgress', checked)
                      }
                    />
                    <Label htmlFor="includeProgress">Progress Indicators</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeDependencies"
                      checked={reportOptions.includeDependencies}
                      onCheckedChange={(checked) => 
                        handleReportOption('includeDependencies', checked)
                      }
                    />
                    <Label htmlFor="includeDependencies">Task Dependencies</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeProjectInfo"
                      checked={reportOptions.includeProjectInfo}
                      onCheckedChange={(checked) => 
                        handleReportOption('includeProjectInfo', checked)
                      }
                    />
                    <Label htmlFor="includeProjectInfo">Project Details</Label>
                  </div>
                </div>

                <div>
                  <Label>Date Format</Label>
                  <Select
                    value={reportOptions.dateFormat}
                    onValueChange={(value) => handleReportOption('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (2025-06-15)</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (06/15/2025)</SelectItem>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (15/06/2025)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Data Validation Results
                </CardTitle>
                <CardDescription>
                  {getValidationSummary(validationResult)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={validateAndUpdateData}
                  variant="outline"
                  className="mb-4"
                >
                  Re-validate Data
                </Button>

                {validationResult.errors.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-red-600 mb-2">Errors</h4>
                    <div className="space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {formatValidationMessage(error)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-yellow-600 mb-2">Warnings</h4>
                    <div className="space-y-1">
                      {validationResult.warnings.map((warning, index) => (
                        <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                          {formatValidationMessage(warning)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validationResult.info.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-blue-600 mb-2">Information</h4>
                    <div className="space-y-1">
                      {validationResult.info.map((info, index) => (
                        <div key={index} className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                          {formatValidationMessage(info)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validationResult.isValid && validationResult.warnings.length === 0 && validationResult.info.length === 0 && (
                  <div className="text-center py-8 text-green-600">
                    ✓ All data validation checks passed successfully
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {tasks.length} tasks, {projects.length} projects • Professional format with business days
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateExcel}
              disabled={loading}
              variant="outline"
              className="bg-green-50 hover:bg-green-100"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel Report
            </Button>
            <Button 
              onClick={handleGeneratePDF}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="w-4 h-4 mr-2" />
              PDF Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
