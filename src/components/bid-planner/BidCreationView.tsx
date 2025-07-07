import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, FileText, Edit, Trash2, Download, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BidItemForm } from './BidItemForm';
import { ImportBidItemsDialog } from './ImportBidItemsDialog';
import { ProposalCustomizationDialog } from './ProposalCustomizationDialog';

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
  const [showProposalDialog, setShowProposalDialog] = useState(false);

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
        // Convert ALL database items to UI format
        const formattedItems: BidItem[] = existingItems.map((item, index) => {
          return {
            id: item.id || String(Date.now() + index),
            division: item.category?.includes('Site') ? 'Site Work' : 
                     item.category?.includes('Building') || item.category?.includes('Masonry') || item.category?.includes('Concrete') ? 'Building' : 
                     item.category?.includes('General') ? 'General Conditions' : 
                     'Other',
            category: item.category || 'General',
            subcategory: item.subcategory || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'each',
            unitCost: item.unit_cost || 0,
            total: (item.unit_cost || 0) * (item.quantity || 1)
          };
        });

        setBidItems(formattedItems);
        onItemsChange(existingItems);
        
        toast.success(`Loaded ${formattedItems.length} existing bid items`);
      } else {
        setBidItems([{
          id: String(Date.now()),
          division: 'General Conditions',
          category: 'Labor/Supervision',
          subcategory: '',
          description: '',
          quantity: 1,
          unit: 'each',
          unitCost: 0,
          total: 0
        }]);
      }
    } catch (error) {
      console.error('Error loading existing bid items:', error);
      toast.error('Failed to load existing bid items');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle items imported from dialog
  const handleItemsImported = async () => {
    await loadExistingBidItems();
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
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    // Filter items - keep items with either category OR description
    const validItems = bidItems.filter((item) => {
      const hasCategory = item.category && item.category.trim().length > 0;
      const hasDescription = item.description && item.description.trim().length > 0;
      return hasCategory || hasDescription;
    });

    if (validItems.length === 0) {
      toast.error('No valid items to save');
      return;
    }

    // Convert to database format
    const itemsForDatabase = validItems.map((item, index) => {
      return {
        project_id: projectId,
        category: (item.category || 'General').trim(),
        subcategory: (item.subcategory || '').trim() || null,
        description: (item.description || `Item ${index + 1}`).trim(),
        quantity: Math.max(Number(item.quantity) || 1, 1),
        unit: (item.unit || 'each').trim(),
        unit_cost: Number(item.unitCost) || 0
      };
    });

    setSaving(true);
    try {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('bid_items')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) {
        throw new Error(`Failed to delete existing items: ${deleteError.message}`);
      }

      // Insert new items
      const { data: savedData, error: insertError } = await supabase
        .from('bid_items')
        .insert(itemsForDatabase)
        .select();

      if (insertError) {
        throw new Error(`Database insert error: ${insertError.message}`);
      }

      toast.success(`Successfully saved ${savedData?.length || 0} bid items!`);
      
      // Reload items to refresh UI
      await loadExistingBidItems();
      setCurrentBidId(projectId);
      
    } catch (error: any) {
      console.error('Save failed:', error);
      toast.error(`Failed to save bid: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Handler to update items from BidItemForm
  const handleItemsChange = (newItems: BidItem[]) => {
    setBidItems(newItems);
  };

  const handleDeleteBid = async () => {
    if (!projectId) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bid_items')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        throw new Error(`Failed to delete bid: ${error.message}`);
      }

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
      
      toast.success('Bid deleted successfully');
    } catch (error: any) {
      console.error('Error deleting bid:', error);
      toast.error(`Failed to delete bid: ${error.message}`);
    }
  };

  const handleBack = () => {
    onShowCreateViewChange(false);
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
            <p className="text-sm text-muted-foreground">
              {bidItems.length} line items | Total: ${calculateTotalValue().toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <ImportBidItemsDialog 
            onItemsImported={handleItemsImported} 
            projects={[{ id: projectId, name: 'Current Project' }]} 
          />
        </div>
      </div>

      {/* Bid Items Form */}
      <div className="w-full">
        <BidItemForm items={bidItems} onItemsChange={handleItemsChange} />
      </div>

      {/* Bid Summary */}
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
                onClick={() => setShowProposalDialog(true)} 
                disabled={bidItems.length === 0}
                variant="outline"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Export Proposal
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

      <ProposalCustomizationDialog
        open={showProposalDialog}
        onOpenChange={setShowProposalDialog}
        bidItems={bidItems}
        projectId={projectId}
      />
    </div>
  );
}
