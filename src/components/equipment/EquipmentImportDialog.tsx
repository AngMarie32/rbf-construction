
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EquipmentImportDialogProps {
  onImportComplete: () => void;
}

export function EquipmentImportDialog({ onImportComplete }: EquipmentImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

      setPreviewData(data);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('No data to import');
      return;
    }

    setIsLoading(true);
    try {
      const equipmentData = previewData.map(row => ({
        name: `${row.Description || ''} ${row.Model || ''}`.trim(),
        category: getCategoryFromDescription(row.Description || ''),
        year: row.Year ? parseInt(row.Year) : null,
        value: parseFloat(row['Est. Value']?.replace(/[$,]/g, '') || '0'),
        purchase_date: null,
        status: 'Available',
        location: null,
        description: row.Description || '',
        qr_code: row['VIN# / Serial#'] || '',
        specifications: {
          model: row.Model || '',
          serial: row['VIN# / Serial#'] || '',
          purchased_value: parseFloat(row.Purchased?.replace(/[$,]/g, '') || '0')
        }
      }));

      const { error } = await supabase
        .from('equipment')
        .insert(equipmentData);

      if (error) throw error;

      toast.success(`Successfully imported ${equipmentData.length} equipment items`);
      setIsOpen(false);
      setPreviewData([]);
      onImportComplete();
    } catch (error) {
      console.error('Error importing equipment:', error);
      toast.error('Failed to import equipment');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryFromDescription = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('excavator')) return 'Excavator';
    if (desc.includes('backhoe')) return 'Backhoe';
    if (desc.includes('skidsteer') || desc.includes('skid steer')) return 'Skid Steer';
    if (desc.includes('dozer')) return 'Dozer';
    if (desc.includes('telehandler')) return 'Telehandler';
    if (desc.includes('scraper')) return 'Scraper';
    if (desc.includes('roller') || desc.includes('packer')) return 'Compaction';
    return 'Other';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Equipment from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              Upload a CSV file with columns: Year, Description, Model, VIN#/Serial#, Purchased, Est. Value
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="csvFile">Select CSV File</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="mt-1"
            />
          </div>

          {previewData.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preview ({previewData.length} items)</h3>
              <div className="max-h-60 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Description</th>
                      <th className="px-2 py-1 text-left">Model</th>
                      <th className="px-2 py-1 text-left">Year</th>
                      <th className="px-2 py-1 text-left">Serial#</th>
                      <th className="px-2 py-1 text-left">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-2 py-1">{row.Description}</td>
                        <td className="px-2 py-1">{row.Model}</td>
                        <td className="px-2 py-1">{row.Year}</td>
                        <td className="px-2 py-1">{row['VIN# / Serial#']}</td>
                        <td className="px-2 py-1">{row['Est. Value']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="px-2 py-1 text-gray-500 text-center">
                    ... and {previewData.length - 10} more items
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={previewData.length === 0 || isLoading}
            >
              {isLoading ? 'Importing...' : `Import ${previewData.length} Items`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
