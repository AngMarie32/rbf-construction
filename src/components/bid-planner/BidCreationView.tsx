import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, FileText, Edit, Trash2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BidItemForm } from './BidItemForm';

interface BidCreationViewProps {
  projectId: string;
  selectedTemplate: any;
  onItemsChange: (items: any[]) => void;
  showCreateView: boolean;
  onShowCreateViewChange: (show: boolean) => void;
}

interface BidItem {
  id: string;
  division: string;
  category: string;
  subcategory: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
}

export function BidCreationView({ projectId, selectedTemplate, onItemsChange, showCreateView, onShowCreateViewChange }: BidCreationViewProps) {
  const [saving, setSaving] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [currentBidId, setCurrentBidId] = useState<string | null>(null);

  const [bidItems, setBidItems] = useState<BidItem[]>([
    {
      id: '1',
      division: 'General Conditions',
      category: 'Labor/Supervision',
      subcategory: '',
      description: '',
      quantity: 1,
      unit: 'each',
      unitCost: 0,
      total: 0
    }
  ]);

  const calculateTotalValue = () => {
    return bidItems.reduce((sum, item) => sum + item.total, 0);
  };

  const getDivisionBreakdown = () => {
    const breakdown: Record<string, Record<string, number>> = {};
    
    bidItems.forEach(item => {
      const division = item.division || 'Other';
      const category = item.category || 'Uncategorized';
      
      if (!breakdown[division]) {
        breakdown[division] = {};
      }
      
      if (!breakdown[division][category]) {
        breakdown[division][category] = 0;
      }
      
      breakdown[division][category] += item.total;
    });
    
    return breakdown;
  };

  const getDivisionTotals = () => {
    const breakdown = getDivisionBreakdown();
    const divisionTotals: Record<string, number> = {};
    
    Object.entries(breakdown).forEach(([division, categories]) => {
      divisionTotals[division] = Object.values(categories).reduce((sum, amount) => sum + amount, 0);
    });
    
    return divisionTotals;
  };

  const handleSaveBid = async () => {
    if (bidItems.length === 0) {
      toast.error('Please add at least one bid item');
      return;
    }

    // Filter out items without description
    const validItems = bidItems.filter(item => item.description && item.description.trim());
    
    if (validItems.length === 0) {
      toast.error('Please add at least one bid item with a description');
      return;
    }

    setSaving(true);
    try {
      const itemsToSave = validItems.map(item => ({
        project_id: projectId,
        category: item.category || 'Other',
        subcategory: item.subcategory || '',
        description: item.description.trim(),
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'each',
        unit_cost: Number(item.unitCost) || 0
      }));

      console.log('Saving bid items:', itemsToSave);

      const { data, error } = await supabase
        .from('bid_items')
        .insert(itemsToSave)
        .select();

      if (error) {
        console.error('Supabase error saving bid items:', error);
        throw error;
      }

      console.log('Bid items saved successfully:', data);
      toast.success(`Bid created successfully with ${itemsToSave.length} items`);
      onItemsChange(data || itemsToSave);
    } catch (error) {
      console.error('Error saving bid:', error);
      toast.error(`Failed to save bid: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBid = async () => {
    if (!currentBidId) {
      toast.error('No bid selected to delete');
      return;
    }

    try {
      const { error } = await supabase
        .from('bid_items')
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;

      toast.success('Bid deleted successfully');
      setBidItems([{
        id: '1',
        division: 'General Conditions',
        category: 'Labor/Supervision',
        subcategory: '',
        description: '',
        quantity: 1,
        unit: 'each',
        unitCost: 0,
        total: 0
      }]);
      setCurrentBidId(null);
    } catch (error) {
      console.error('Error deleting bid:', error);
      toast.error('Failed to delete bid');
    }
  };

  const handleExportPDF = async () => {
    if (bidItems.length === 0) {
      toast.error('Please add bid items before exporting');
      return;
    }

    setExportingPDF(true);
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

      // Create a temporary element to render the bid report
      const reportElement = document.createElement('div');
      reportElement.id = 'bid-report';
      reportElement.style.position = 'absolute';
      reportElement.style.left = '-9999px';
      reportElement.style.background = 'white';
      reportElement.style.padding = '40px';
      reportElement.style.width = '800px';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      
      const totalValue = bidItems.reduce((sum, item) => sum + item.total, 0);
      const breakdown = getDivisionBreakdown();
      
      reportElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          ${companyData?.logo_url ? `<img src="${companyData.logo_url}" alt="Company Logo" style="height: 60px; margin-bottom: 20px;" />` : ''}
          <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 5px;">${companyData?.company_name || 'Company Name'}</h1>
          <h2 style="font-size: 18px; color: #374151; margin-bottom: 20px;">BID PROPOSAL</h2>
          <div style="border-bottom: 2px solid #3b82f6; margin-bottom: 30px;"></div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 15px; text-transform: uppercase; background-color: #f3f4f6; padding: 8px;">${projectData?.name || 'Project Name'}</h3>
          <div style="margin-bottom: 20px;">
            <p style="margin-bottom: 5px;"><strong>Project:</strong> ${projectData?.name || 'N/A'}</p>
            <p style="margin-bottom: 5px;"><strong>Client:</strong> ${projectData?.client || 'N/A'}</p>
            <p style="margin-bottom: 5px;"><strong>Address:</strong> ${projectData?.address || 'N/A'}</p>
            <p style="margin-bottom: 5px;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Division</th>
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
                <td style="border: 1px solid #d1d5db; padding: 6px;">${item.division || ''}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px;">${item.category || ''}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px;">${item.subcategory || ''}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px;">${item.description || ''}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${item.quantity || 0}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${item.unit || 'each'}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${(item.unitCost || 0).toLocaleString()}</td>
                <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${(item.total || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 15px; text-transform: uppercase; background-color: #f3f4f6; padding: 8px;">SUMMARY BY DIVISION</h3>
          ${Object.entries(breakdown).map(([division, categories]) => `
            <div style="margin-bottom: 15px;">
              <h4 style="font-size: 12px; font-weight: bold; color: #4b5563; margin-bottom: 8px;">${division}</h4>
              <table style="width: 100%; font-size: 11px; margin-left: 20px;">
                ${Object.entries(categories).map(([category, amount]) => `
                  <tr>
                    <td style="padding: 2px 0; width: 70%;">${category}</td>
                    <td style="padding: 2px 0; text-align: right; font-weight: bold;">$${amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr style="border-top: 1px solid #ccc;">
                  <td style="padding: 4px 0; font-weight: bold;">Division Total:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: bold;">$${Object.values(categories).reduce((sum, val) => sum + val, 0).toLocaleString()}</td>
                </tr>
              </table>
            </div>
          `).join('')}
        </div>

        <div style="border-top: 2px solid #3b82f6; padding-top: 20px; margin-top: 30px;">
          <table style="width: 100%; font-size: 14px; font-weight: bold;">
            <tr>
              <td style="text-align: right; padding: 8px;">TOTAL BID AMOUNT:</td>
              <td style="text-align: right; padding: 8px; font-size: 18px; color: #3b82f6;">$${totalValue.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 10px;">
          <p>Bid proposal generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      `;

      document.body.appendChild(reportElement);
      
      const { exportToPDF } = await import('@/utils/pdfExport');
      await exportToPDF('bid-report', `Bid-Proposal-${projectData?.name?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      document.body.removeChild(reportElement);
      toast.success('Bid proposal exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleBack = () => {
    onShowCreateViewChange(false);
  };

  const handleExportToSOV = async () => {
    try {
      // Navigate to Schedule of Values page
      window.location.href = '/schedule-of-values';
    } catch (error) {
      console.error('Error navigating to SOV:', error);
      toast.error('Failed to navigate to Schedule of Values');
    }
  };

  const breakdown = getDivisionBreakdown();
  const divisionTotals = getDivisionTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bid Planner
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Bid</h1>
          </div>
        </div>
      </div>

      {/* Bid Items - Full width */}
      <div className="w-full">
        <BidItemForm items={bidItems} onItemsChange={setBidItems} />
      </div>

      {/* Extended Bid Summary - Full width */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Bid Summary & Actions</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleSaveBid} 
                disabled={saving} 
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Bid'}
              </Button>
              
              <Button 
                onClick={handleExportPDF} 
                disabled={exportingPDF || bidItems.length === 0}
                variant="outline"
                size="sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                {exportingPDF ? 'Exporting...' : 'Export PDF'}
              </Button>
              
              <Button 
                onClick={handleExportToSOV} 
                disabled={bidItems.length === 0}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to SOV
              </Button>

              <Button 
                onClick={handleDeleteBid} 
                disabled={!currentBidId}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Bid
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Summary */}
            <div className="space-y-6">
              {/* Total Summary */}
              <div className="space-y-4">
                <div className="text-4xl font-bold border-b pb-4 text-blue-600">
                  Total: ${calculateTotalValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-lg text-muted-foreground">
                  {bidItems.length} line item{bidItems.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Division Totals */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Division Breakdown</h4>
                {Object.entries(divisionTotals).map(([division, total]) => (
                  <div key={division} className="flex justify-between text-base border-b pb-2">
                    <span className="font-medium">{division}</span>
                    <span className="font-semibold">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Detailed Category Breakdown */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Detailed Category Breakdown</h4>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {Object.entries(breakdown).map(([division, categories]) => (
                  <div key={division} className="space-y-3">
                    <div className="font-medium text-base text-blue-600 border-b pb-1">
                      {division}
                    </div>
                    {Object.entries(categories).map(([category, amount]) => (
                      <div key={category} className="flex justify-between text-sm pl-4">
                        <span className="text-muted-foreground">{category}</span>
                        <span className="font-medium">${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
