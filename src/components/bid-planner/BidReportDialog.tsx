
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { exportBidReportPDF } from '@/utils/budgetEstimatePdf';

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
      exportBidReportPDF(bidItems, projectData);
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
