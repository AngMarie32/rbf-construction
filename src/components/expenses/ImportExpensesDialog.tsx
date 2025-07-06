
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportExpensesDialogProps {
  onExpensesImported: () => void;
  projects: Array<{ id: string; name: string }>;
}

interface ExpenseImport {
  date: string;
  division: string;
  vendor: string;
  invoice: string;
  amount: number;
  category: string;
}

export function ImportExpensesDialog({ onExpensesImported, projects }: ImportExpensesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Data extracted from the uploaded images
  const expenseData: ExpenseImport[] = [
    { date: '2022-05-05', division: 'Design Fees & Estimating — Printing & Reproduction', vendor: 'Burton Imaging', invoice: '107834', amount: 137.38, category: 'Professional Services' },
    { date: '2022-06-09', division: 'Design Fees & Estimating — Printing & Reproduction', vendor: 'Burton Imaging', invoice: '107950', amount: 57.24, category: 'Professional Services' },
    { date: '2022-07-28', division: 'Design Fees & Estimating — Printing & Reproduction', vendor: 'Burton Imaging', invoice: '108106', amount: 34.34, category: 'Professional Services' },
    { date: '2024-05-13', division: 'Design Fees & Estimating — Printing & Reproduction', vendor: 'Burton Imaging', invoice: '110125', amount: 65.83, category: 'Professional Services' },
    { date: '2025-01-30', division: 'Permits/Fees/Bonds/Insurances — Total', vendor: 'City of Fenton', invoice: '110125', amount: 9430.00, category: 'Permits' },
    { date: '2025-02-06', division: 'Site-General — Other Concrete', vendor: 'Tushim Concrete', invoice: '504', amount: 600.00, category: 'Materials' },
    { date: '2025-02-11', division: 'Doors, Windows, & Glass — Interior HM Frame Doors', vendor: 'FBH', invoice: 'S02021', amount: 285.75, category: 'Materials' },
    { date: '2025-02-11', division: 'Doors, Windows, & Glass — Overhead Doors (Closures)', vendor: 'Chad Hopkins', invoice: '3047', amount: 27225.00, category: 'Materials' },
    { date: '2025-02-17', division: 'General-Other — Dumpster Rental', vendor: 'Freedom Dumpster', invoice: '21882', amount: 2013.00, category: 'Other' },
    { date: '2025-02-18', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 207.94, category: 'Materials' },
    { date: '2025-02-19', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 13.64, category: 'Materials' },
    { date: '2025-02-21', division: 'Masonry — Masonry-CMU (Concrete Blocks)', vendor: 'Hartley Masonry', invoice: '1008', amount: 54000.00, category: 'Materials' },
    { date: '2025-02-28', division: 'Labor/Supervision — Total', vendor: 'RBF Construction', invoice: '1', amount: 1248.42, category: 'Labor' },
    { date: '2025-03-04', division: 'Site-General — Other Concrete', vendor: 'Mondern Concrete', invoice: '106301', amount: 1804.12, category: 'Materials' },
    { date: '2025-03-05', division: 'Site-General — Other Concrete', vendor: 'Mondern Concrete', invoice: '106327', amount: 2063.82, category: 'Materials' },
    { date: '2025-03-06', division: 'Site-General — Other Concrete', vendor: 'Mondern Concrete', invoice: '106370', amount: 2497.10, category: 'Materials' },
    { date: '2025-03-07', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 160.00, category: 'Materials' },
    { date: '2025-03-10', division: 'Labor/Supervision — Total', vendor: 'RBF Construction', invoice: '2', amount: 1999.28, category: 'Labor' },
    { date: '2025-03-10', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 13.31, category: 'Materials' },
    { date: '2025-03-10', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 343.27, category: 'Materials' },
    { date: '2025-03-11', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 32.98, category: 'Materials' },
    { date: '2025-03-16', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 13.64, category: 'Materials' },
    { date: '2025-03-17', division: 'Labor/Supervision — Total', vendor: 'RBF Construction', invoice: '3', amount: 1358.41, category: 'Labor' },
    { date: '2025-03-17', division: 'Masonry — Total', vendor: 'Hartley Masonry', invoice: '25-G702', amount: 63000.00, category: 'Materials' },
    { date: '2025-03-17', division: 'General-Other — Total', vendor: 'Lessors Welding Supply', invoice: 'CC Charge', amount: 175.57, category: 'Equipment' },
    { date: '2025-03-17', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 8.46, category: 'Materials' },
    { date: '2025-03-17', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 25.38, category: 'Materials' },
    { date: '2025-03-18', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 22.80, category: 'Materials' },
    { date: '2025-03-18', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 131.19, category: 'Materials' },
    { date: '2025-03-19', division: 'General-Other — Dumpster Rental', vendor: 'Freedom Dumpster', invoice: '22322', amount: 637.00, category: 'Other' },
    { date: '2025-03-19', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 92.83, category: 'Materials' },
    { date: '2025-03-20', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 14.78, category: 'Materials' },
    { date: '2025-03-20', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 64.01, category: 'Materials' },
    { date: '2025-03-20', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 66.09, category: 'Materials' },
    { date: '2025-03-21', division: 'General-Other — Total', vendor: 'Aldridge Trucking', invoice: '50992', amount: 1148.67, category: 'Equipment' },
    { date: '2025-03-21', division: 'General-Other — Total', vendor: 'Carter Lumber', invoice: '26300416601', amount: 330.97, category: 'Materials' },
    { date: '2025-03-21', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: -53.90, category: 'Materials' },
    { date: '2025-03-21', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 90.27, category: 'Materials' },
    { date: '2025-03-22', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 5.22, category: 'Materials' },
    { date: '2025-03-24', division: 'Labor/Supervision — Total', vendor: 'RBF Construction', invoice: '4', amount: 3356.00, category: 'Labor' },
    { date: '2025-03-24', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: -59.57, category: 'Materials' },
    { date: '2025-03-24', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 12.16, category: 'Materials' },
    { date: '2025-03-24', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 53.24, category: 'Materials' },
    { date: '2025-03-25', division: 'General-Other — Total', vendor: 'FBH Architectural', invoice: 'S02278', amount: 1627.10, category: 'Materials' },
    { date: '2025-03-27', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 65.43, category: 'Materials' },
    { date: '2025-03-31', division: 'General-Other — Total', vendor: 'FBH Architectural', invoice: 'S02310', amount: 50.88, category: 'Materials' },
    { date: '2025-03-31', division: 'Labor/Supervision — Total', vendor: 'RBF Construction', invoice: '5', amount: 988.55, category: 'Labor' },
    { date: '2025-04-14', division: 'Labor/Supervision — Total', vendor: 'RBF Construction', invoice: '6', amount: 1958.20, category: 'Labor' },
    { date: '2025-04-17', division: 'General-Other — Total', vendor: 'Mondern Concrete', invoice: '107677', amount: 5858.89, category: 'Materials' },
    { date: '2025-03-24', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 128.10, category: 'Materials' },
    { date: '2025-04-03', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 175.00, category: 'Materials' },
    { date: '2025-04-08', division: 'General-Other — Total', vendor: 'Easton Enterprises', invoice: '16749', amount: 325.06, category: 'Equipment' },
    { date: '2025-04-15', division: 'General-Other — Total', vendor: 'Mondern Concrete', invoice: '107532', amount: 5104.98, category: 'Materials' },
    { date: '2025-04-11', division: 'General-Other — Total', vendor: 'Hill Steel & Builders', invoice: '102405', amount: 78150.00, category: 'Materials' },
    { date: '2025-04-20', division: 'General-Other — Total', vendor: 'Tushim Concrete', invoice: '507', amount: 3810.00, category: 'Materials' },
    { date: '2025-04-25', division: 'General-Other — Total', vendor: 'Ferrigan Heating & Cooling', invoice: 'RBF230-2', amount: 27000.00, category: 'Subcontractors' },
    { date: '2025-04-15', division: 'General-Other — Total', vendor: 'Easton Enterprises', invoice: '167844', amount: 547.63, category: 'Equipment' },
    { date: '2025-05-02', division: 'General-Other — Total', vendor: 'Michigan Lumber', invoice: '2505-098083', amount: 435.33, category: 'Materials' },
    { date: '2025-04-03', division: 'General-Other — Total', vendor: 'Palmer Plumbing', invoice: '3236', amount: 2200.00, category: 'Subcontractors' },
    { date: '2025-05-07', division: 'General-Other — Total', vendor: 'Tushim Concrete', invoice: '511', amount: 7425.00, category: 'Materials' },
    { date: '2025-05-07', division: 'General-Other — Total', vendor: 'Mondern Concrete', invoice: '108767', amount: 2567.45, category: 'Materials' },
    { date: '2025-05-08', division: 'General-Other — Total', vendor: 'Diamond Precast', invoice: '12983', amount: 1061.00, category: 'Materials' },
    { date: '2025-05-08', division: 'General-Other — Total', vendor: 'Michigan Pipe & Valve', invoice: 'G023367', amount: 991.31, category: 'Materials' },
    { date: '2025-05-08', division: 'General-Other — Total', vendor: 'Diamond Precast', invoice: '12984', amount: 1022.90, category: 'Materials' },
    { date: '2025-05-08', division: 'General-Other — Total', vendor: 'Hartley Masonry', invoice: '1013', amount: 42664.50, category: 'Materials' },
    { date: '2025-05-07', division: 'General-Other — Total', vendor: 'Tushim Concrete', invoice: '511', amount: 7425.00, category: 'Materials' },
    { date: '2025-05-09', division: 'General-Other — Total', vendor: 'Diamond Precast', invoice: '13000', amount: 487.60, category: 'Materials' },
    { date: '2025-04-03', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 175.00, category: 'Materials' },
    { date: '2025-04-07', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 24.36, category: 'Materials' },
    { date: '2025-04-10', division: 'General-Other — Total', vendor: 'McNaughton', invoice: 'CC Charge', amount: 325.73, category: 'Equipment' },
    { date: '2025-04-10', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 23.82, category: 'Materials' },
    { date: '2025-04-15', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 121.90, category: 'Materials' },
    { date: '2025-04-16', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 48.78, category: 'Materials' },
    { date: '2025-04-19', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 266.87, category: 'Materials' },
    { date: '2025-04-21', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 260.28, category: 'Materials' },
    { date: '2025-04-21', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 13.48, category: 'Materials' },
    { date: '2025-04-22', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 46.64, category: 'Materials' },
    { date: '2025-04-22', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 274.31, category: 'Materials' },
    { date: '2025-05-06', division: 'General-Other — Total', vendor: 'Easton Enterprises', invoice: '168583', amount: 232.52, category: 'Equipment' },
    { date: '2025-05-09', division: 'General-Other — Total', vendor: 'Hill Steel & Builders', invoice: '102594', amount: 5100.00, category: 'Materials' },
    { date: '2025-05-23', division: 'General-Other — Total', vendor: 'PEC Electric', invoice: '1808', amount: 25773.00, category: 'Subcontractors' },
    { date: '2025-05-27', division: 'General-Other — Total', vendor: 'Michigan Pipe & Valve', invoice: 'G023367', amount: 991.31, category: 'Materials' },
    { date: '2025-05-07', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: -72.52, category: 'Materials' },
    { date: '2025-05-07', division: 'General-Other — Total', vendor: 'Michigan Landscape Supply', invoice: 'CC Charge', amount: 463.72, category: 'Materials' },
    { date: '2025-05-07', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 343.25, category: 'Materials' },
    { date: '2025-05-07', division: 'General-Other — Total', vendor: 'Menards', invoice: 'CC Charge', amount: 16.18, category: 'Materials' },
    { date: '2025-05-12', division: 'General-Other — Total', vendor: 'Easton Enterprises', invoice: '168780', amount: 8.79, category: 'Equipment' },
    { date: '2025-05-14', division: 'General-Other — Total', vendor: 'Signs by Crannie', invoice: '18329', amount: 2815.11, category: 'Other' },
    { date: '2025-05-23', division: 'General-Other — Total', vendor: 'P.E.C. Electric', invoice: '1808', amount: 25773.00, category: 'Subcontractors' },
    { date: '2025-05-23', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 434.97, category: 'Materials' },
    { date: '2025-05-24', division: 'General-Other — Total', vendor: 'Sherwin Williams', invoice: '9700-3', amount: 50.30, category: 'Materials' },
    { date: '2025-05-27', division: 'General-Other — Total', vendor: 'Rock Bottom', invoice: 'CC Charge', amount: 32.07, category: 'Materials' },
    { date: '2025-05-27', division: 'General-Other — Total', vendor: 'Rock Bottom', invoice: 'CC Charge', amount: 282.49, category: 'Materials' },
    { date: '2025-05-30', division: 'Labor/Supervision — Total', vendor: 'RBF Construction', invoice: 'May Labor', amount: 4873.88, category: 'Labor' },
    { date: '2025-05-29', division: 'General-Other — Total', vendor: 'Fick Landscaping', invoice: '64513', amount: 129.00, category: 'Other' },
    { date: '2005-06-03', division: 'General-Other — Total', vendor: 'Home Depot', invoice: 'CC Charge', amount: 106.47, category: 'Materials' },
    { date: '2025-06-09', division: 'General-Other — Total', vendor: 'Alta Equipment', invoice: 'SR2/210683', amount: 156.77, category: 'Equipment' },
    { date: '2025-06-10', division: 'General-Other — Total', vendor: 'FBH Architectural', invoice: 'SS02610', amount: 148.40, category: 'Materials' },
    { date: '2025-06-10', division: 'General-Other — Total', vendor: 'Calvin & Company', invoice: '37344', amount: 16500.00, category: 'Subcontractors' },
    { date: '2025-06-05', division: 'General-Other — Total', vendor: 'Freedom Dumpster', invoice: '23651', amount: 2232.50, category: 'Other' },
    { date: '2024-06-19', division: 'General-Other — Total', vendor: 'Valley Drywall', invoice: '23,564', amount: 46750.00, category: 'Subcontractors' },
    { date: '2025-06-23', division: 'Labor/Supervision — Total', vendor: 'RBF Construction', invoice: 'June Labor', amount: 6512.00, category: 'Labor' },
    { date: '2025-06-11', division: 'General-Other — Total', vendor: 'Viper Concrete Coating', invoice: '278', amount: 19860.00, category: 'Subcontractors' },
    { date: '2025-06-27', division: 'General-Other — Total', vendor: 'PEC Electric', invoice: '1,811', amount: 25773.00, category: 'Subcontractors' },
    { date: '2025-06-27', division: 'General-Other — Total', vendor: 'Floorsource', invoice: '532,273', amount: 281.91, category: 'Materials' },
    { date: '2025-07-01', division: 'Labor/Supervision — Total', vendor: 'Jay Singley', invoice: 'June Labor', amount: 1230.00, category: 'Labor' }
  ];

  const handleImport = async () => {
    const fentonProject = projects.find(p => p.name.toLowerCase().includes('fenton'));
    
    if (!fentonProject) {
      toast.error('Fenton Memorials project not found. Please create the project first.');
      return;
    }

    setLoading(true);
    try {
      const expensesToCreate = expenseData.map(expense => ({
        project_id: fentonProject.id,
        description: expense.division,
        category: expense.category,
        amount: expense.amount,
        date: expense.date,
        vendor: expense.vendor,
        receipt_number: expense.invoice,
        status: 'Paid'
      }));

      const { error } = await supabase
        .from('expenses')
        .insert(expensesToCreate);

      if (error) throw error;

      toast.success(`Successfully imported ${expenseData.length} expenses for Fenton Memorials`);
      onExpensesImported();
      setOpen(false);
    } catch (error) {
      console.error('Error importing expenses:', error);
      toast.error('Failed to import expenses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <Upload className="w-4 h-4 mr-2" />
        Import Fenton Data
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Fenton Memorials Expenses</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This will import {expenseData.length} expense entries for the Fenton Memorials project from the uploaded data.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Import Summary:</h4>
              <ul className="text-sm space-y-1">
                <li>• Total entries: {expenseData.length}</li>
                <li>• Date range: 2022-05-05 to 2025-07-01</li>
                <li>• Categories: Materials, Labor, Subcontractors, Equipment, Other, Professional Services, Permits</li>
                <li>• All expenses will be marked as "Paid"</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Importing...' : 'Import Expenses'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
