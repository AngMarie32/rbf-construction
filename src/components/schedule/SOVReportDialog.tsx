
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { exportToPDF } from '@/utils/pdfExport';
import { toast } from 'sonner';

interface SOVReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectData: any;
  sovItems: any[];
}

export function SOVReportDialog({ open, onOpenChange, projectData, sovItems }: SOVReportDialogProps) {
  const [loading, setLoading] = useState(false);

  const totalScheduledValue = sovItems.reduce((sum, item) => sum + (item.scheduled_value || 0), 0);
  const totalCompleted = sovItems.reduce((sum, item) => sum + (item.total_completed_and_stored || 0), 0);
  const completionPercentage = totalScheduledValue ? Math.round((totalCompleted / totalScheduledValue) * 100) : 0;

  const handleExportPDF = async () => {
    if (!projectData) return;

    setLoading(true);
    try {
      const reportElement = document.createElement('div');
      reportElement.id = 'sov-report';
      reportElement.style.position = 'absolute';
      reportElement.style.left = '-9999px';
      reportElement.style.background = 'white';
      reportElement.style.padding = '60px';
      reportElement.style.width = '800px';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      
      reportElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 10px;">SCHEDULE OF VALUES</h1>
          <div style="width: 100%; height: 2px; background-color: #3b82f6; margin: 20px 0;"></div>
        </div>

        <div style="margin-bottom: 40px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <div>
              <h3 style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 15px;">PROJECT INFORMATION</h3>
              <table style="width: 100%; font-size: 12px;">
                <tr><td style="padding: 4px 0; font-weight: bold;">Project Name:</td><td style="padding: 4px 0;">${projectData?.name || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Project Code:</td><td style="padding: 4px 0;">${projectData?.project_code || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Client:</td><td style="padding: 4px 0;">${projectData?.client || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Status:</td><td style="padding: 4px 0;">${projectData?.status || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Address:</td><td style="padding: 4px 0;">${projectData?.address || 'N/A'}</td></tr>
              </table>
            </div>
            <div>
              <h3 style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 15px;">CONTRACT SUMMARY</h3>
              <table style="width: 100%; font-size: 12px;">
                <tr><td style="padding: 4px 0; font-weight: bold;">Original Contract Sum:</td><td style="padding: 4px 0; text-align: right;">$${totalScheduledValue.toLocaleString()}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Net Change Orders:</td><td style="padding: 4px 0; text-align: right;">$${(projectData?.net_change_orders || 0).toLocaleString()}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Contract Sum to Date:</td><td style="padding: 4px 0; text-align: right;">$${(totalScheduledValue + (projectData?.net_change_orders || 0)).toLocaleString()}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Total Completed:</td><td style="padding: 4px 0; text-align: right;">$${totalCompleted.toLocaleString()}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Balance to Finish:</td><td style="padding: 4px 0; text-align: right;">$${(totalScheduledValue - totalCompleted).toLocaleString()}</td></tr>
              </table>
            </div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Item No.</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Description of Work</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Scheduled Value</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Work Completed<br>& Stored to Date</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: bold;">% Complete</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Balance to<br>Finish</th>
            </tr>
          </thead>
          <tbody>
            ${sovItems.map(item => {
              const balance = (item.scheduled_value || 0) - (item.total_completed_and_stored || 0);
              return `
                <tr>
                  <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold;">${item.item_number}</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px;">${item.description}</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${(item.scheduled_value || 0).toLocaleString()}</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${(item.total_completed_and_stored || 0).toLocaleString()}</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${item.percent_complete || 0}%</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${balance.toLocaleString()}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="2" style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">TOTALS:</td>
              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$${totalScheduledValue.toLocaleString()}</td>
              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$${totalCompleted.toLocaleString()}</td>
              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${completionPercentage}%</td>
              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$${(totalScheduledValue - totalCompleted).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 50px; text-align: center; color: #6b7280; font-size: 10px;">
          <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <div style="margin-top: 20px; font-size: 9px;">
            <p>This Schedule of Values represents the breakdown of work items and their completion status for the above-referenced project.</p>
          </div>
        </div>
      `;

      document.body.appendChild(reportElement);
      
      await exportToPDF('sov-report', `SOV-Report-${projectData?.name?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      document.body.removeChild(reportElement);
      toast.success('SOV report generated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Schedule of Values Report Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">SCHEDULE OF VALUES</h2>
              <div className="w-full h-0.5 bg-blue-600"></div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">PROJECT INFORMATION</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Project Name:</span>
                    <span>{projectData?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Project Code:</span>
                    <span>{projectData?.project_code || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Client:</span>
                    <span>{projectData?.client || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span>{projectData?.status || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">CONTRACT SUMMARY</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Contract Sum:</span>
                    <span>${totalScheduledValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Completed:</span>
                    <span>${totalCompleted.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Progress:</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Balance to Finish:</span>
                    <span>${(totalScheduledValue - totalCompleted).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>Preview of SOV report with {sovItems.length} line items</p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportPDF} disabled={loading}>
              {loading ? 'Generating PDF...' : 'Export Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
