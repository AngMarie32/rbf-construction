import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, FileText, Edit, Trash2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BidItemForm } from './BidItemForm';
import { ImportBidItemsDialog } from './ImportBidItemsDialog';

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
  const [loading, setLoading] = useState(false);
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

  // Load existing bid items for this project on component mount
  useEffect(() => {
    if (projectId) {
      loadExistingBidItems();
    }
  }, [projectId]);

  const loadExistingBidItems = async () => {
    try {
      setLoading(true);
      console.log('🔍 LOADING EXISTING BID ITEMS for project:', projectId);

      const { data: existingItems, error } = await supabase
        .from('bid_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading bid items:', error);
        return;
      }

      console.log('✅ RAW DATABASE RESPONSE:', existingItems);
      console.log('📊 Number of items from database:', existingItems?.length || 0);

      if (existingItems && existingItems.length > 0) {
        // Convert database items to component format with detailed logging
        const formattedItems: BidItem[] = existingItems.map((item, index) => {
          console.log(`🔄 Converting item ${index + 1}/${existingItems.length}:`, {
            id: item.id,
            category: item.category,
            description: item.description,
            unit_cost: item.unit_cost,
            quantity: item.quantity
          });

          return {
            id: item.id || String(index + 1),
            division: 'General Conditions', // Default division since it's not stored in DB
            category: item.category || 'Labor/Supervision',
            subcategory: item.subcategory || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'each',
            unitCost: item.unit_cost || 0,
            total: (item.unit_cost || 0) * (item.quantity || 1)
          };
        });

        console.log('✅ FORMATTED ITEMS for state:', formattedItems);
        console.log('📊 Setting state with', formattedItems.length, 'items');
        
        setBidItems(formattedItems);
        onItemsChange(existingItems); // Update parent component
      } else {
        console.log('ℹ️ No existing items found, keeping default item');
      }
    } catch (error) {
      console.error('❌ Critical error loading existing bid items:', error);
    } finally {
      setLoading(false);
    }
  };

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
    console.log('🚀 STARTING COMPREHENSIVE BID SAVE PROCESS');
    console.log('=' .repeat(80));
    
    if (!projectId) {
      console.log('❌ No project ID provided');
      toast.error('No project selected');
      return;
    }

    if (!bidItems || !Array.isArray(bidItems)) {
      console.log('❌ Invalid bid items array');
      toast.error('Invalid bid items data');
      return;
    }

    console.log('📊 CURRENT BIDDING STATE:');
    console.log('- Project ID:', projectId);
    console.log('- Bid items count:', bidItems.length);
    console.log('- Bid items array:', bidItems);

    // Process each item with detailed validation
    const validItemsForSave: any[] = [];
    const invalidItems: any[] = [];
    
    bidItems.forEach((item, index) => {
      console.log(`\n📋 PROCESSING ITEM ${index + 1}/${bidItems.length}:`);
      console.log('- Raw item:', item);
      
      // Extract and validate fields
      const description = String(item?.description || '').trim();
      const category = String(item?.category || '').trim();
      const quantity = Number(item?.quantity) || 1;
      const unitCost = Number(item?.unitCost) || 0;
      const unit = String(item?.unit || 'each').trim();
      const subcategory = String(item?.subcategory || '').trim();
      
      console.log('- Processed fields:', {
        description,
        category,
        quantity,
        unitCost,
        unit,
        subcategory,
        hasDescription: description.length > 0,
        hasCategory: category.length > 0
      });

      // Validation logic
      if (description.length > 0 && category.length > 0) {
        const validItem = {
          project_id: projectId,
          category: category,
          subcategory: subcategory || null,
          description: description,
          quantity: Math.max(quantity, 1),
          unit: unit,
          unit_cost: unitCost
        };
        
        validItemsForSave.push(validItem);
        console.log('✅ VALID - Added to save list');
      } else {
        invalidItems.push({
          index: index + 1,
          item,
          reason: `Missing ${!description ? 'description' : ''} ${!description && !category ? 'and' : ''} ${!category ? 'category' : ''}`
        });
        console.log('❌ INVALID - Skipped:', !description ? 'missing description' : 'missing category');
      }
    });

    console.log('\n📈 VALIDATION SUMMARY:');
    console.log('- Total items processed:', bidItems.length);
    console.log('- Valid items for save:', validItemsForSave.length);
    console.log('- Invalid items skipped:', invalidItems.length);
    
    if (invalidItems.length > 0) {
      console.log('❌ Invalid items details:', invalidItems);
    }

    if (validItemsForSave.length === 0) {
      console.log('🛑 SAVE ABORTED: No valid items to save');
      toast.error('No valid items found to save. Please ensure items have both description and category filled out.');
      return;
    }

    console.log('\n💾 PREPARING DATABASE SAVE:');
    console.log('- Items to save:', validItemsForSave);

    setSaving(true);
    try {
      // First, delete existing bid items for this project
      console.log('🗑️ Deleting existing items for project:', projectId);
      const { error: deleteError } = await supabase
        .from('bid_items')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        throw new Error(`Failed to delete existing items: ${deleteError.message}`);
      }
      console.log('✅ Existing items deleted successfully');

      // Insert new items
      console.log('💾 Inserting', validItemsForSave.length, 'new items...');
      const { data, error } = await supabase
        .from('bid_items')
        .insert(validItemsForSave)
        .select();

      if (error) {
        console.error('❌ INSERT ERROR:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('🎉 DATABASE SAVE SUCCESS!');
      console.log('- Items saved:', data?.length || 0);
      console.log('- Saved data:', data);
      
      const savedCount = data?.length || 0;
      
      if (savedCount === bidItems.length) {
        toast.success(`Perfect! All ${savedCount} bid items saved successfully!`);
      } else if (savedCount === validItemsForSave.length) {
        toast.success(`${savedCount} valid items saved successfully!`);
        if (invalidItems.length > 0) {
          toast.warning(`${invalidItems.length} items were skipped due to missing required fields.`);
        }
      } else {
        toast.warning(`${savedCount} items saved, but expected ${validItemsForSave.length}. Please check the data.`);
      }
      
      // Update parent component with the saved data
      onItemsChange(data || validItemsForSave);
      setCurrentBidId(projectId);
      
    } catch (error: any) {
      console.error('💥 SAVE OPERATION FAILED:', error);
      toast.error(`Failed to save bid: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
      console.log('🏁 BID SAVE PROCESS COMPLETED');
      console.log('=' .repeat(80));
    }
  };

  const handleDeleteBid = async () => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    try {
      console.log('Deleting bid for project:', projectId);

      const { error } = await supabase
        .from('bid_items')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        console.error('Error deleting bid:', error);
        throw new Error(`Failed to delete bid: ${error.message}`);
      }

      toast.success('Bid deleted successfully');
      
      // Reset to default state
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
      onItemsChange([]);
      
    } catch (error: any) {
      console.error('Error deleting bid:', error);
      toast.error(`Failed to delete bid: ${error.message || 'Unknown error'}`);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
        
        <div className="flex gap-2">
          <ImportBidItemsDialog 
            onItemsImported={loadExistingBidItems} 
            projects={[{ id: projectId, name: 'Current Project' }]} 
          />
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
            <CardTitle>Bid Summary</CardTitle>
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
                onClick={handleDeleteBid} 
                disabled={bidItems.length === 0}
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
