
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { G702Form } from './G702Form';
import { exportToPDF } from '@/utils/pdfExport';
import { toast } from 'sonner';

interface G702DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSave?: () => void;
}

export function G702Dialog({ open, onOpenChange, projectId, onSave }: G702DialogProps) {
  const [loading, setLoading] = useState(false);

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      await exportToPDF('g702-form', 'G702-G703-Application.pdf');
      toast.success('G702/G703 exported to PDF successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSave?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>G702/G703 - Application and Certificate for Payment</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF} disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                {loading ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div id="g702-form">
          <G702Form projectId={projectId} onSave={handleSave} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
