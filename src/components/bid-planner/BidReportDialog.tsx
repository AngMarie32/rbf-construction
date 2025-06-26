
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { exportToPDF } from '@/utils/pdfExport';
import { toast } from 'sonner';

interface BidReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectData: any;
  bidItems: any[];
}

export function BidReportDialog({ open, onOpenChange, projectData, bidItems }: BidReportDialogProps) {
  const [loading, setLoading] = useState(false);

  const totalBidValue = bidItems.reduce((sum, item) => sum + (item.total || 0), 0);

  const getCategoryBreakdown = () => {
    const breakdown: Record<string, Record<string, number>> = {};
    
    bidItems.forEach(item => {
      if (!item.description?.trim()) return;
      
      const category = item.category || 'Other';
      const subcategory = item.subcategory || 'Uncategorized';
      
      if (!breakdown[category]) {
        breakdown[category] = {};
      }
      
      if (!breakdown[category][subcategory]) {
        breakdown[category][subcategory] = 0;
      }
      
      breakdown[category][subcategory] += item.total || 0;
    });
    
    return breakdown;
  };

  const handleExportPDF = async () => {
    if (!projectData) return;

    setLoading(true);
    try {
      const reportElement = document.createElement('div');
      reportElement.id = 'bid-report';
      reportElement.style.position = 'absolute';
      reportElement.style.left = '-9999px';
      reportElement.style.background = 'white';
      reportElement.style.padding = '60px';
      reportElement.style.width = '800px';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      
      const breakdown = getCategoryBreakdown();
      
      reportElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 10px;">BID PROPOSAL</h1>
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
                <tr><td style="padding: 4px 0; font-weight: bold;">Address:</td><td style="padding: 4px 0;">${projectData?.address || 'N/A'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Date:</td><td style="padding: 4px 0;">${new Date().toLocaleDateString()}</td></tr>
              </table>
            </div>
            <div>
              <h3 style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 15px;">BID SUMMARY</h3>
              <table style="width: 100%; font-size: 12px;">
                <tr><td style="padding: 4px 0; font-weight: bold;">Total Line Items:</td><td style="padding: 4px 0; text-align: right;">${bidItems.length}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Base Bid Amount:</td><td style="padding: 4px 0; text-align: right;">$${totalBidValue.toLocaleString()}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold;">Contingency:</td><td style="padding: 4px 0; text-align: right;">${projectData?.contingency_type === 'percentage' ? projectData?.contingency_value + '%' : '$' + (projectData?.contingency_value || 0).toLocaleString()}</td></tr>
                <tr style="border-top: 1px solid #ccc;"><td style="padding: 8px 0 4px 0; font-weight: bold; font-size: 14px;">TOTAL BID:</td><td style="padding: 8px 0 4px 0; text-align: right; font-weight: bold; font-size: 14px;">$${totalBidValue.toLocaleString()}</td></tr>
              </table>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 15px;">CATEGORY BREAKDOWN</h3>
          ${Object.entries(breakdown).map(([category, subcategories]) => `
            <div style="margin-bottom: 15px;">
              <h4 style="font-size: 14px; font-weight: bold; color: #4b5563; margin-bottom: 8px;">${category}</h4>
              <table style="width: 100%; font-size: 11px; margin-left: 20px;">
                ${Object.entries(subcategories).map(([subcategory, amount]) => `
                  <tr>
                    <td style="padding: 2px 0; width: 70%;">${subcategory}</td>
                    <td style="padding: 2px 0; text-align: right;">$${amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          `).join('')}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Category</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Subcategory</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Description</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: bold;">Qty</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: bold;">Unit</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Unit Cost</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${bidItems.map(item => `
              <tr>
                <td style="border: 1px solid #d1d5db; padding: 6px;">${item.category || 'N/A'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px;">${item.subcategory || 'N/A'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px;">${item.description || 'N/A'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${item.quantity || 0}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${item.unit || 'each'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${(item.unit_cost || 0).toLocaleString()}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${(item.total || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="6" style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">TOTAL BID AMOUNT:</td>
              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$${totalBidValue.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 50px; text-align: center; color: #6b7280; font-size: 10px;">
          <p>Bid proposal generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      `;

      document.body.appendChild(reportElement);
      
      await exportToPDF('bid-report', `Bid-Proposal-${projectData?.name?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      document.body.removeChild(reportElement);
      toast.success('Bid proposal exported successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const breakdown = getCategoryBreakdown();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bid Proposal Report Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">BID PROPOSAL</h2>
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
                    <span className="font-medium">Total Items:</span>
                    <span>{bidItems.length}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">BID SUMMARY</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Amount:</span>
                    <span>${totalBidValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Categories:</span>
                    <span>{Object.keys(breakdown).length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>Preview of bid proposal with {bidItems.length} line items</p>
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
