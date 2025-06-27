
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { G702Form } from './G702Form';
import { exportG702G703ToPDF } from '@/utils/pdfExport';
import { toast } from 'sonner';

interface G702DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  applicationId?: string;
  onSave?: () => void;
}

export function G702Dialog({ open, onOpenChange, projectId, applicationId, onSave }: G702DialogProps) {
  const [loading, setLoading] = useState(false);

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      await exportG702G703ToPDF('G702-G703-Application.pdf');
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
      <DialogContent className="max-w-[98vw] max-h-[98vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>
              {applicationId ? 'Edit G702/G703 Application' : 'G702/G703 - Application and Certificate for Payment'}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF} disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                {loading ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div>
          <G702Form onSave={handleSave} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
