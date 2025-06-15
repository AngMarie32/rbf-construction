
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileSpreadsheet, Share, Printer, AlertCircle } from 'lucide-react';
import { Task } from '@/types';
import { exportToExcel, exportToGoogleSheets, printOptimizedReport } from '@/utils/enhancedExports';
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
  title = 'Project Schedule Export'
}: EnhancedExportDialogProps) {
  const [exportOptions, setExportOptions] = useState({
    includeProgress: true,
    includeDependencies: true,
    includeProjectInfo: true,
    dateFormat: 'yyyy-MM-dd' as 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy'
  });

  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(validateTaskList(tasks));

  const handleExportOption = (key: string, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleExcelExport = async () => {
    setLoading(true);
    try {
      await exportToExcel(tasks, projects, exportOptions);
      toast.success('Excel export completed successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to export to Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSheetsExport = async () => {
    setLoading(true);
    try {
      await exportToGoogleSheets(tasks, projects, exportOptions);
      toast.success('Google Sheets export opened in new tab');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to export to Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintExport = () => {
    try {
      printOptimizedReport(tasks, projects, title);
      toast.success('Print preview opened');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to generate print report');
    }
  };

  const validateAndUpdateData = () => {
    const result = validateTaskList(tasks);
    setValidationResult(result);
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export">Export Options</TabsTrigger>
            <TabsTrigger value="validation">Data Validation</TabsTrigger>
            <TabsTrigger value="formats">Export Formats</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Settings</CardTitle>
                <CardDescription>
                  Configure what data to include in your export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeProgress"
                      checked={exportOptions.includeProgress}
                      onCheckedChange={(checked) => 
                        handleExportOption('includeProgress', checked)
                      }
                    />
                    <Label htmlFor="includeProgress">Include Progress</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeDependencies"
                      checked={exportOptions.includeDependencies}
                      onCheckedChange={(checked) => 
                        handleExportOption('includeDependencies', checked)
                      }
                    />
                    <Label htmlFor="includeDependencies">Include Dependencies</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeProjectInfo"
                      checked={exportOptions.includeProjectInfo}
                      onCheckedChange={(checked) => 
                        handleExportOption('includeProjectInfo', checked)
                      }
                    />
                    <Label htmlFor="includeProjectInfo">Include Project Details</Label>
                  </div>
                </div>

                <div>
                  <Label>Date Format</Label>
                  <Select
                    value={exportOptions.dateFormat}
                    onValueChange={(value) => handleExportOption('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
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

          <TabsContent value="formats" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    Excel Export
                  </CardTitle>
                  <CardDescription>
                    Export as Excel workbook with multiple sheets for detailed analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleExcelExport}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Exporting...' : 'Export to Excel'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share className="w-5 h-5 text-blue-600" />
                    Google Sheets
                  </CardTitle>
                  <CardDescription>
                    Open directly in Google Sheets for collaborative editing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleGoogleSheetsExport}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    {loading ? 'Opening...' : 'Open in Google Sheets'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="w-5 h-5 text-gray-600" />
                    Print Report
                  </CardTitle>
                  <CardDescription>
                    Generate print-optimized report with proper formatting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handlePrintExport}
                    variant="outline"
                    className="w-full"
                  >
                    Generate Print Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <div className="text-sm text-gray-500">
            {tasks.length} tasks, {projects.length} projects
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
