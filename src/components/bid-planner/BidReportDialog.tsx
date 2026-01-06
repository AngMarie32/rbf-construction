
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
      // Reduce top padding so the header sits higher on the page
      reportElement.style.padding = '16px 40px 32px 40px';
      reportElement.style.width = '800px';
      reportElement.style.fontFamily = 'Arial, sans-serif';

      const breakdown = getCategoryBreakdown();
      const itemsPerPage = 20;
      const totalPages = Math.ceil(bidItems.length / itemsPerPage) + 1; // +1 for summary page
      
      // Helper function to create page footer with page number
      const createPageFooter = (pageNum: number, total: number) => `
        <div style="position: relative; margin-top: auto; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #6b7280;">
          Page ${pageNum} of ${total}
        </div>
      `;

      // Page 1: Summary
      let content = `
        <div style="min-height: 700px; display: flex; flex-direction: column;">
          <div style="text-align: center; margin-bottom: 15px;">
            <h1 style="font-size: 14px; font-weight: bold; color: #1f2937; margin: 0 0 4px 0;">BUDGET ESTIMATE</h1>
            <div style="width: 100%; height: 1px; background-color: #3b82f6; margin: 6px 0;"></div>
          </div>

          <div style="margin-bottom: 15px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <h3 style="font-size: 10px; font-weight: bold; color: #374151; margin-bottom: 6px;">PROJECT INFORMATION</h3>
                <table style="width: 100%; font-size: 9px;">
                  <tr><td style="padding: 3px 0; font-weight: bold;">Project Name:</td><td style="padding: 3px 0;">${projectData?.name || 'N/A'}</td></tr>
                  <tr><td style="padding: 3px 0; font-weight: bold;">Project Code:</td><td style="padding: 3px 0;">${projectData?.project_code || 'N/A'}</td></tr>
                  <tr><td style="padding: 3px 0; font-weight: bold;">Client:</td><td style="padding: 3px 0;">${projectData?.client || 'N/A'}</td></tr>
                  <tr><td style="padding: 3px 0; font-weight: bold;">Address:</td><td style="padding: 3px 0;">${projectData?.address || 'N/A'}</td></tr>
                  <tr><td style="padding: 3px 0; font-weight: bold;">Date:</td><td style="padding: 3px 0;">${new Date().toLocaleDateString()}</td></tr>
                </table>
              </div>
              <div>
                <h3 style="font-size: 10px; font-weight: bold; color: #374151; margin-bottom: 6px;">ESTIMATE SUMMARY</h3>
                <table style="width: 100%; font-size: 9px;">
                  <tr><td style="padding: 3px 0; font-weight: bold;">Total Line Items:</td><td style="padding: 3px 0; text-align: right;">${bidItems.length}</td></tr>
                  <tr><td style="padding: 3px 0; font-weight: bold;">Base Estimate:</td><td style="padding: 3px 0; text-align: right;">$${totalBidValue.toLocaleString()}</td></tr>
                  <tr><td style="padding: 3px 0; font-weight: bold;">Contingency:</td><td style="padding: 3px 0; text-align: right;">${projectData?.contingency_type === 'percentage' ? projectData?.contingency_value + '%' : '$' + (projectData?.contingency_value || 0).toLocaleString()}</td></tr>
                  <tr style="border-top: 1px solid #ccc;"><td style="padding: 6px 0 3px 0; font-weight: bold; font-size: 12px;">TOTAL ESTIMATE:</td><td style="padding: 6px 0 3px 0; text-align: right; font-weight: bold; font-size: 12px;">$${totalBidValue.toLocaleString()}</td></tr>
                </table>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 12px; flex: 1;">
            <h3 style="font-size: 10px; font-weight: bold; color: #374151; margin-bottom: 6px;">CATEGORY BREAKDOWN</h3>
            ${Object.entries(breakdown).map(([category, subcategories]) => `
              <div style="margin-bottom: 10px;">
                <h4 style="font-size: 11px; font-weight: bold; color: #4b5563; margin-bottom: 4px;">${category}</h4>
                <table style="width: 100%; font-size: 9px; margin-left: 15px;">
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
          ${createPageFooter(1, totalPages)}
        </div>
      `;

      // Create item pages with proper page breaks
      for (let page = 0; page < Math.ceil(bidItems.length / itemsPerPage); page++) {
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, bidItems.length);
        const pageItems = bidItems.slice(startIndex, endIndex);
        const isLastPage = endIndex === bidItems.length;
        const currentPageNum = page + 2; // +2 because page 1 is summary

        content += `
          <div style="page-break-before: always; min-height: 700px; display: flex; flex-direction: column;">
            <div style="text-align: center; margin-bottom: 10px;">
              <h1 style="font-size: 12px; font-weight: bold; color: #1f2937; margin: 0;">BUDGET ESTIMATE - LINE ITEMS</h1>
              <div style="width: 100%; height: 1px; background-color: #3b82f6; margin: 4px 0;"></div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 9px; flex: 1;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: left; font-weight: bold;">Category</th>
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: left; font-weight: bold;">Subcategory</th>
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: left; font-weight: bold;">Description</th>
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: center; font-weight: bold;">Qty</th>
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: center; font-weight: bold;">Unit</th>
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: right; font-weight: bold;">Unit Cost</th>
                  <th style="border: 1px solid #d1d5db; padding: 6px; text-align: right; font-weight: bold;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.map(item => `
                  <tr>
                    <td style="border: 1px solid #d1d5db; padding: 5px;">${item.category || 'N/A'}</td>
                    <td style="border: 1px solid #d1d5db; padding: 5px;">${item.subcategory || 'N/A'}</td>
                    <td style="border: 1px solid #d1d5db; padding: 5px;">${item.description || 'N/A'}</td>
                    <td style="border: 1px solid #d1d5db; padding: 5px; text-align: center;">${item.quantity || 0}</td>
                    <td style="border: 1px solid #d1d5db; padding: 5px; text-align: center;">${item.unit || 'each'}</td>
                    <td style="border: 1px solid #d1d5db; padding: 5px; text-align: right;">$${(item.unit_cost || 0).toLocaleString()}</td>
                    <td style="border: 1px solid #d1d5db; padding: 5px; text-align: right;">$${(item.total || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
                ${isLastPage ? `
                  <tr style="background-color: #f8fafc; font-weight: bold;">
                    <td colspan="6" style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">TOTAL BUDGET ESTIMATE:</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$${totalBidValue.toLocaleString()}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
            ${createPageFooter(currentPageNum, totalPages)}
          </div>
        `;
      }

      reportElement.innerHTML = content;
      document.body.appendChild(reportElement);
      
      await exportToPDF('bid-report', `Budget-Estimate-${projectData?.name?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      document.body.removeChild(reportElement);
      toast.success('Budget estimate exported successfully');
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
          <DialogTitle>Budget Estimate Report Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">BUDGET ESTIMATE</h2>
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
                <h3 className="font-semibold text-gray-700 mb-3">ESTIMATE SUMMARY</h3>
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
              <p>Preview of budget estimate with {bidItems.length} line items</p>
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
