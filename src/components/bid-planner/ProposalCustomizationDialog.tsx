
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
      // Get company settings for logo
      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      // Get project data
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      const filteredItems = getFilteredItems();
      const totalValue = filteredItems.reduce((sum, item) => sum + item.total, 0);
      
      // Create a temporary element to render the proposal
      const reportElement = document.createElement('div');
      reportElement.id = 'proposal-report';
      reportElement.style.position = 'absolute';
      reportElement.style.left = '-9999px';
      reportElement.style.background = 'white';
      reportElement.style.padding = '40px';
      reportElement.style.width = '800px';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      reportElement.style.fontSize = '12px';
      reportElement.style.lineHeight = '1.4';
      
      let content = '';

      // Header
      content += `
        <div style="text-align: center; margin-bottom: 30px; page-break-inside: avoid;">
          ${companyData?.logo_url ? `<img src="${companyData.logo_url}" alt="Company Logo" style="height: 60px; margin-bottom: 20px;" />` : ''}
          <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 5px;">${companyData?.company_name || 'Company Name'}</h1>
          <h2 style="font-size: 18px; color: #374151; margin-bottom: 20px;">BID PROPOSAL</h2>
          <div style="border-bottom: 2px solid #3b82f6; margin-bottom: 30px;"></div>
        </div>

        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h3 style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 15px; text-transform: uppercase; background-color: #f3f4f6; padding: 8px;">${projectData?.name || 'Project Name'}</h3>
          <div style="margin-bottom: 20px;">
            <p style="margin-bottom: 5px;"><strong>Project:</strong> ${projectData?.name || 'N/A'}</p>
            <p style="margin-bottom: 5px;"><strong>Client:</strong> ${projectData?.client || 'N/A'}</p>
            <p style="margin-bottom: 5px;"><strong>Address:</strong> ${projectData?.address || 'N/A'}</p>
            <p style="margin-bottom: 5px;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      `;

      if (exportType === 'itemized') {
        // Itemized view with table that can span multiple pages
        content += `
          <h3 style="font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 15px; text-transform: uppercase; background-color: #f3f4f6; padding: 8px;">ITEMIZED BREAKDOWN</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Division</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Category</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Description</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: bold;">Qty</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: bold;">Unit</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Unit Cost</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Total</th>
              </tr>
            </thead>
            <tbody>
        `;

        filteredItems.forEach((item, index) => {
          // Add page break every 25 rows to prevent cramming
          const pageBreak = index > 0 && index % 25 === 0 ? 'page-break-before: always;' : '';
          content += `
            <tr style="${pageBreak}">
              <td style="border: 1px solid #d1d5db; padding: 6px;">${item.division || ''}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px;">${item.category || ''}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px;">${item.description || ''}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${item.quantity || 0}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${item.unit || 'each'}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${(item.unitCost || 0).toLocaleString()}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${(item.total || 0).toLocaleString()}</td>
            </tr>
          `;
        });

        content += `
            </tbody>
          </table>
        `;
      } else if (exportType === 'category') {
        // Category summary
        const categoryTotals: Record<string, number> = {};
        filteredItems.forEach(item => {
          const category = item.category || 'Uncategorized';
          categoryTotals[category] = (categoryTotals[category] || 0) + item.total;
        });

        content += `
          <h3 style="font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 15px; text-transform: uppercase; background-color: #f3f4f6; padding: 8px;">CATEGORY SUMMARY</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">Category</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right; font-weight: bold;">Total</th>
              </tr>
            </thead>
            <tbody>
        `;

        Object.entries(categoryTotals).forEach(([category, total]) => {
          content += `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 12px;">${category}</td>
              <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right; font-weight: bold;">$${total.toLocaleString()}</td>
            </tr>
          `;
        });

        content += `
            </tbody>
          </table>
        `;
      } else {
        // Division summary
        const divisionTotals: Record<string, number> = {};
        filteredItems.forEach(item => {
          const division = item.division || 'Other';
          divisionTotals[division] = (divisionTotals[division] || 0) + item.total;
        });

        content += `
          <h3 style="font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 15px; text-transform: uppercase; background-color: #f3f4f6; padding: 8px;">DIVISION SUMMARY</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">Division</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: right; font-weight: bold;">Total</th>
              </tr>
            </thead>
            <tbody>
        `;

        Object.entries(divisionTotals).forEach(([division, total]) => {
          content += `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 12px;">${division}</td>
              <td style="border: 1px solid #d1d5db; padding: 12px; text-align: right; font-weight: bold;">$${total.toLocaleString()}</td>
            </tr>
          `;
        });

        content += `
            </tbody>
          </table>
        `;
      }

      // Total and footer
      content += `
        <div style="border-top: 2px solid #3b82f6; padding-top: 20px; margin-top: 30px; page-break-inside: avoid;">
          <table style="width: 100%; font-size: 16px; font-weight: bold;">
            <tr>
              <td style="text-align: right; padding: 8px;">TOTAL BID AMOUNT:</td>
              <td style="text-align: right; padding: 8px; font-size: 20px; color: #3b82f6;">$${totalValue.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 10px; page-break-inside: avoid;">
          <p>Proposal generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      `;

      reportElement.innerHTML = content;
      document.body.appendChild(reportElement);
      
      const { exportToPDF } = await import('@/utils/pdfExport');
      await exportToPDF('proposal-report', `Proposal-${projectData?.name?.replace(/\s+/g, '-').toLowerCase()}-${exportType}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      document.body.removeChild(reportElement);
      toast.success('Proposal exported successfully');
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
