
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportBudgetEstimatePDF } from '@/utils/budgetEstimatePdf';

interface ProposalCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidItems: any[];
  projectId: string;
}

export function ProposalCustomizationDialog({ open, onOpenChange, bidItems, projectId }: ProposalCustomizationDialogProps) {
  const [exportType, setExportType] = useState<'itemized' | 'category' | 'division'>('itemized');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Get unique categories and divisions
  const categories = Array.from(new Set(bidItems.map(item => item.category).filter(Boolean)));
  const divisions = Array.from(new Set(bidItems.map(item => item.division).filter(Boolean)));

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSelectAll = () => {
    setSelectedCategories(categories);
  };

  const handleSelectNone = () => {
    setSelectedCategories([]);
  };

  const getFilteredItems = () => {
    if (exportType === 'itemized' && selectedCategories.length > 0) {
      return bidItems.filter(item => selectedCategories.includes(item.category));
    }
    return bidItems;
  };

  const handleExportPDF = async () => {
    if (!projectId || bidItems.length === 0) {
      toast.error('No items to export');
      return;
    }

    setLoading(true);
    try {
      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      const filteredItems = getFilteredItems();

      await exportBudgetEstimatePDF(filteredItems, projectData, companyData, exportType, selectedCategories);

      toast.success('Budget estimate exported successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error exporting proposal:', error);
      toast.error('Failed to export proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Proposal Options</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Format</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={exportType} onValueChange={(value: any) => setExportType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="itemized" id="itemized" />
                  <Label htmlFor="itemized">Itemized - Show all line items in detail</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="category" id="category" />
                  <Label htmlFor="category">Category Summary - Group by category totals</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="division" id="division" />
                  <Label htmlFor="division">Division Summary - Group by division totals</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {exportType === 'itemized' && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Select Categories to Include</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSelectNone}>
                      Select None
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox 
                        id={category}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <Label htmlFor={category} className="text-sm">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedCategories.length === 0 && exportType === 'itemized' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Note: If no categories are selected, all items will be included.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportPDF} disabled={loading}>
              <FileText className="w-4 h-4 mr-2" />
              {loading ? 'Generating...' : 'Export Proposal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
