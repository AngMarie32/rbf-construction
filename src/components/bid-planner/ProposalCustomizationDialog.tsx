
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
      // Reduce top padding so the header sits higher on the page
      reportElement.style.padding = '16px 40px 32px 40px';
      reportElement.style.width = '800px';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      reportElement.style.fontSize = '12px';
      reportElement.style.lineHeight = '1.4';
      
      const itemsPerPage = 25;
      const totalPages = Math.ceil(filteredItems.length / itemsPerPage) + 1; // +1 for first page with header
      
      // Helper function to create page footer with page number
      const createPageFooter = (pageNum: number, total: number) => `
        <div style="margin-top: auto; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #6b7280;">
          Page ${pageNum} of ${total}
        </div>
      `;
      
      // Helper function to create mini header for continuation pages
      const createMiniHeader = (companyName: string) => `
        <div style="text-align: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #3b82f6;">
          <span style="font-size: 10px; font-weight: bold; color: #1f2937;">${companyName}</span>
          <span style="font-size: 10px; color: #374151; margin-left: 10px;">BUDGET ESTIMATE</span>
        </div>
      `;

      let content = '';

      // Page 1: Header and first batch of items
      content += `
        <div style="min-height: 700px; display: flex; flex-direction: column;">
          <div style="text-align: center; margin-bottom: 12px; page-break-inside: avoid;">
            ${companyData?.logo_url ? `<img src="${companyData.logo_url}" alt="Company Logo" style="height: 36px; margin: 0 0 6px 0;" />` : ''}
            <h1 style="font-size: 14px; font-weight: bold; color: #1f2937; margin: 0 0 2px 0;">${companyData?.company_name || 'Company Name'}</h1>
            <h2 style="font-size: 11px; color: #374151; margin: 0 0 6px 0;">BUDGET ESTIMATE</h2>
            <div style="border-bottom: 2px solid #3b82f6;"></div>
          </div>

          <div style="margin-bottom: 15px; page-break-inside: avoid;">
            <div style="font-size: 11px; font-weight: bold; color: #374151; margin-bottom: 8px; text-transform: uppercase; background-color: #f3f4f6; padding: 6px;">${projectData?.name || 'Project Name'}</div>
            <div style="font-size: 10px; margin-bottom: 12px;">
              <p style="margin-bottom: 3px;"><strong>Project:</strong> ${projectData?.name || 'N/A'}</p>
              <p style="margin-bottom: 3px;"><strong>Client:</strong> ${projectData?.client || 'N/A'}</p>
              <p style="margin-bottom: 3px;"><strong>Address:</strong> ${projectData?.address || 'N/A'}</p>
              <p style="margin-bottom: 3px;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
      `;

      if (exportType === 'itemized') {
        // Calculate items for first page (fewer due to header)
        const firstPageItems = 18;
        const firstPageData = filteredItems.slice(0, firstPageItems);
        const remainingItems = filteredItems.slice(firstPageItems);
        const actualTotalPages = remainingItems.length > 0 ? Math.ceil(remainingItems.length / itemsPerPage) + 1 : 1;
        
        content += `
          <div style="font-size: 10px; font-weight: bold; color: #374151; margin-bottom: 8px; text-transform: uppercase; background-color: #f3f4f6; padding: 6px;">ITEMIZED BREAKDOWN</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 9px; flex: 1;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="border: 1px solid #d1d5db; padding: 5px; text-align: left; font-weight: bold;">Category</th>
                <th style="border: 1px solid #d1d5db; padding: 5px; text-align: left; font-weight: bold;">Description</th>
                <th style="border: 1px solid #d1d5db; padding: 5px; text-align: center; font-weight: bold;">Qty</th>
                <th style="border: 1px solid #d1d5db; padding: 5px; text-align: center; font-weight: bold;">Unit</th>
                <th style="border: 1px solid #d1d5db; padding: 5px; text-align: right; font-weight: bold;">Unit Cost</th>
                <th style="border: 1px solid #d1d5db; padding: 5px; text-align: right; font-weight: bold;">Total</th>
              </tr>
            </thead>
            <tbody>
        `;

        firstPageData.forEach((item) => {
          content += `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 4px;">${item.category || ''}</td>
              <td style="border: 1px solid #d1d5db; padding: 4px;">${item.description || ''}</td>
              <td style="border: 1px solid #d1d5db; padding: 4px; text-align: center;">${item.quantity || 0}</td>
              <td style="border: 1px solid #d1d5db; padding: 4px; text-align: center;">${item.unit || 'each'}</td>
              <td style="border: 1px solid #d1d5db; padding: 4px; text-align: right;">$${(item.unitCost || item.unit_cost || 0).toLocaleString()}</td>
              <td style="border: 1px solid #d1d5db; padding: 4px; text-align: right;">$${(item.total || 0).toLocaleString()}</td>
            </tr>
          `;
        });

        // Close first page if there are more items
        if (remainingItems.length > 0) {
          content += `
              </tbody>
            </table>
            ${createPageFooter(1, actualTotalPages)}
          </div>
          `;

          // Create additional pages for remaining items
          for (let page = 0; page < Math.ceil(remainingItems.length / itemsPerPage); page++) {
            const startIndex = page * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, remainingItems.length);
            const pageItems = remainingItems.slice(startIndex, endIndex);
            const isLastPage = endIndex === remainingItems.length;
            const currentPageNum = page + 2;

            content += `
              <div style="page-break-before: always; min-height: 700px; display: flex; flex-direction: column;">
                ${createMiniHeader(companyData?.company_name || 'Company Name')}
                <table style="width: 100%; border-collapse: collapse; font-size: 9px; flex: 1;">
                  <thead>
                    <tr style="background-color: #f8fafc;">
                      <th style="border: 1px solid #d1d5db; padding: 5px; text-align: left; font-weight: bold;">Category</th>
                      <th style="border: 1px solid #d1d5db; padding: 5px; text-align: left; font-weight: bold;">Description</th>
                      <th style="border: 1px solid #d1d5db; padding: 5px; text-align: center; font-weight: bold;">Qty</th>
                      <th style="border: 1px solid #d1d5db; padding: 5px; text-align: center; font-weight: bold;">Unit</th>
                      <th style="border: 1px solid #d1d5db; padding: 5px; text-align: right; font-weight: bold;">Unit Cost</th>
                      <th style="border: 1px solid #d1d5db; padding: 5px; text-align: right; font-weight: bold;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
            `;

            pageItems.forEach((item) => {
              content += `
                <tr>
                  <td style="border: 1px solid #d1d5db; padding: 4px;">${item.category || ''}</td>
                  <td style="border: 1px solid #d1d5db; padding: 4px;">${item.description || ''}</td>
                  <td style="border: 1px solid #d1d5db; padding: 4px; text-align: center;">${item.quantity || 0}</td>
                  <td style="border: 1px solid #d1d5db; padding: 4px; text-align: center;">${item.unit || 'each'}</td>
                  <td style="border: 1px solid #d1d5db; padding: 4px; text-align: right;">$${(item.unitCost || item.unit_cost || 0).toLocaleString()}</td>
                  <td style="border: 1px solid #d1d5db; padding: 4px; text-align: right;">$${(item.total || 0).toLocaleString()}</td>
                </tr>
              `;
            });

            if (isLastPage) {
              content += `
                    <tr style="background-color: #f8fafc; font-weight: bold;">
                      <td colspan="5" style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">TOTAL BUDGET ESTIMATE:</td>
                      <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right; color: #3b82f6;">$${totalValue.toLocaleString()}</td>
                    </tr>
              `;
            }

            content += `
                  </tbody>
                </table>
                ${createPageFooter(currentPageNum, actualTotalPages)}
              </div>
            `;
          }
        } else {
          // Only one page - add total and close
          content += `
                <tr style="background-color: #f8fafc; font-weight: bold;">
                  <td colspan="5" style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">TOTAL BUDGET ESTIMATE:</td>
                  <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right; color: #3b82f6;">$${totalValue.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            ${createPageFooter(1, 1)}
          </div>
          `;
        }
      } else if (exportType === 'category') {
        // Category summary
        const categoryTotals: Record<string, number> = {};
        filteredItems.forEach(item => {
          const category = item.category || 'Uncategorized';
          categoryTotals[category] = (categoryTotals[category] || 0) + item.total;
        });

        content += `
          <div style="font-size: 10px; font-weight: bold; color: #374151; margin-bottom: 8px; text-transform: uppercase; background-color: #f3f4f6; padding: 6px;">CATEGORY SUMMARY</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; flex: 1;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Category</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Total</th>
              </tr>
            </thead>
            <tbody>
        `;

        Object.entries(categoryTotals).forEach(([category, total]) => {
          content += `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 8px;">${category}</td>
              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">$${total.toLocaleString()}</td>
            </tr>
          `;
        });

        content += `
              <tr style="background-color: #f8fafc; font-weight: bold;">
                <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">TOTAL BUDGET ESTIMATE:</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right; color: #3b82f6;">$${totalValue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          ${createPageFooter(1, 1)}
        </div>
        `;
      } else {
        // Division summary
        const divisionTotals: Record<string, number> = {};
        filteredItems.forEach(item => {
          const division = item.division || 'Other';
          divisionTotals[division] = (divisionTotals[division] || 0) + item.total;
        });

        content += `
          <div style="font-size: 10px; font-weight: bold; color: #374151; margin-bottom: 8px; text-transform: uppercase; background-color: #f3f4f6; padding: 6px;">DIVISION SUMMARY</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; flex: 1;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Division</th>
                <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Total</th>
              </tr>
            </thead>
            <tbody>
        `;

        Object.entries(divisionTotals).forEach(([division, total]) => {
          content += `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 8px;">${division}</td>
              <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">$${total.toLocaleString()}</td>
            </tr>
          `;
        });

        content += `
              <tr style="background-color: #f8fafc; font-weight: bold;">
                <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">TOTAL BUDGET ESTIMATE:</td>
                <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right; color: #3b82f6;">$${totalValue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          ${createPageFooter(1, 1)}
        </div>
        `;
      }

      reportElement.innerHTML = content;
      document.body.appendChild(reportElement);
      
      const { exportToPDF } = await import('@/utils/pdfExport');
      await exportToPDF('proposal-report', `Budget-Estimate-${projectData?.name?.replace(/\s+/g, '-').toLowerCase()}-${exportType}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      document.body.removeChild(reportElement);
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
