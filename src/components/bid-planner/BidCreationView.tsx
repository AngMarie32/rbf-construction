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
      console.log('Loading existing bid items for project:', projectId);

      const { data: existingItems, error } = await supabase
        .from('bid_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading bid items:', error);
        return;
      }

      if (existingItems && existingItems.length > 0) {
        console.log('Found existing bid items:', existingItems);
        
        // Convert database items to component format
        const formattedItems: BidItem[] = existingItems.map((item, index) => ({
          id: item.id || String(index + 1),
          division: 'General Conditions', // Default division since it's not stored in DB
          category: item.category || 'Labor/Supervision',
          subcategory: item.subcategory || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'each',
          unitCost: item.unit_cost || 0,
          total: (item.unit_cost || 0) * (item.quantity || 1)
        }));

        setBidItems(formattedItems);
        onItemsChange(existingItems); // Update parent component
      }
    } catch (error) {
      console.error('Error loading existing bid items:', error);
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
    console.log('🔍 === COMPREHENSIVE BID SAVE ANALYSIS START ===');
    console.log('📊 Current bidItems state - Total count:', bidItems.length);
    
    // Log EVERY SINGLE BID ITEM in complete detail
    console.log('📋 === COMPLETE BID ITEMS INVENTORY ===');
    bidItems.forEach((item, index) => {
      console.log(`📝 Item ${index + 1}/${bidItems.length}:`, {
        id: item.id,
        division: `"${item.division}"`,
        category: `"${item.category}"`,
        subcategory: `"${item.subcategory}"`,
        description: `"${item.description}"`,
        descriptionLength: item.description?.length || 0,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        total: item.total,
        hasDescription: !!(item.description && item.description.trim().length > 0),
        hasCategory: !!(item.category && item.category.trim().length > 0),
        willBeSaved: !!(item.description && item.description.trim().length > 0 && item.category && item.category.trim().length > 0)
      });
    });
    
    // Create summary stats
    const summary = {
      totalItems: bidItems.length,
      itemsWithDescription: bidItems.filter(item => item.description && item.description.trim().length > 0).length,
      itemsWithCategory: bidItems.filter(item => item.category && item.category.trim().length > 0).length,
      itemsWithBothDescAndCategory: bidItems.filter(item => 
        item.description && item.description.trim().length > 0 && 
        item.category && item.category.trim().length > 0
      ).length,
      emptyDescriptions: bidItems.filter(item => !item.description || item.description.trim().length === 0).length,
      emptyCategories: bidItems.filter(item => !item.category || item.category.trim().length === 0).length
    };
    
    console.log('📈 SUMMARY ANALYSIS:', summary);

    if (bidItems.length === 0) {
      console.log('❌ ERROR: No bid items found in state');
      toast.error('Please add at least one bid item');
      return;
    }

    // Filter valid items with detailed logging
    const validItems = bidItems.filter((item, index) => {
      const hasDescription = item.description && item.description.trim().length > 0;
      const hasCategory = item.category && item.category.trim().length > 0;
      const isValid = hasDescription && hasCategory;
      
      if (!isValid) {
        console.log(`❌ Item ${index + 1} REJECTED:`, {
          reason: !hasDescription ? 'Missing description' : 'Missing category',
          description: `"${item.description}"`,
          category: `"${item.category}"`
        });
      } else {
        console.log(`✅ Item ${index + 1} ACCEPTED for saving`);
      }
      
      return isValid;
    });

    console.log(`📊 FILTERING RESULTS: ${validItems.length} valid items out of ${bidItems.length} total items`);
    
    if (validItems.length === 0) {
      console.log('❌ ERROR: No valid items after filtering');
      toast.error('No valid bid items found. Items need both description and category.');
      return;
    }

    const skippedCount = bidItems.length - validItems.length;
    if (skippedCount > 0) {
      console.log(`⚠️  WARNING: ${skippedCount} items will be skipped due to missing required fields`);
      toast.warning(`${skippedCount} items will be skipped (missing description or category)`);
    }

    setSaving(true);
    try {
      console.log('💾 Starting database save process...');

      // First, delete existing bid items for this project to avoid duplicates
      const { error: deleteError } = await supabase
        .from('bid_items')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) {
        console.error('Error deleting existing bid items:', deleteError);
      } else {
        console.log('✅ Existing bid items cleared successfully');
      }

      // Prepare items for database insert
      const itemsToSave = validItems.map((item, index) => {
        const preparedItem = {
          project_id: projectId,
          category: item.category.trim(),
          subcategory: item.subcategory && item.subcategory.trim() ? item.subcategory.trim() : null,
          description: item.description.trim(),
          quantity: Math.max(Number(item.quantity) || 1, 1),
          unit: item.unit && item.unit.trim() ? item.unit.trim() : 'each',
          unit_cost: Number(item.unitCost) || 0
        };
        
        console.log(`📝 Prepared item ${index + 1} for database:`, preparedItem);
        return preparedItem;
      });

      console.log('💾 FINAL DATABASE PAYLOAD:');
      console.log('Items to save count:', itemsToSave.length);
      console.log('Full payload:', JSON.stringify(itemsToSave, null, 2));

      const { data, error } = await supabase
        .from('bid_items')
        .insert(itemsToSave)
        .select();

      if (error) {
        console.error('❌ DATABASE ERROR:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ DATABASE SUCCESS:');
      console.log('Items actually saved:', data?.length || 0);
      console.log('Database response:', data);
      
      const savedCount = data?.length || itemsToSave.length;
      toast.success(`Bid saved successfully! ${savedCount} out of ${bidItems.length} total items saved.`);
      
      if (savedCount < bidItems.length) {
        toast.warning(`${bidItems.length - savedCount} items were skipped. Check console for details.`);
      }
      
      // Update parent component with the saved data
      onItemsChange(data || itemsToSave);
      
      // Mark that we have a current bid
      setCurrentBidId(projectId);
      
      console.log('🔍 === COMPREHENSIVE BID SAVE ANALYSIS END ===');
      
    } catch (error) {
      console.error('❌ SAVE ERROR:', error);
      toast.error(`Failed to save bid: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
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
      
    } catch (error) {
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
