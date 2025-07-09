import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BidItemForm } from './BidItemForm';
import { ProposalCustomizationDialog } from './ProposalCustomizationDialog';
import { useNavigate } from 'react-router-dom';

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
  unit_cost: number;
  total: number;
}

export function BidCreationView({ projectId, selectedTemplate, onItemsChange, showCreateView, onShowCreateViewChange }: BidCreationViewProps) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const [bidItems, setBidItems] = useState<BidItem[]>([
    {
      id: '1',
      division: 'General Conditions',
      category: '',
      subcategory: '',
      description: '',
      quantity: 1,
      unit: 'each',
      unit_cost: 0,
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
          const division = getDivisionFromCategory(item.category || '');
          return {
            id: item.id || String(Date.now() + index),
            division: division,
            category: item.category || '',
            subcategory: item.subcategory || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'each',
            unit_cost: item.unit_cost || 0,
            total: (item.unit_cost || 0) * (item.quantity || 1)
          };
        });

        setBidItems(formattedItems);
        onItemsChange(existingItems);
        
        console.log(`Loaded ${formattedItems.length} existing bid items`);
      } else {
        setBidItems([{
          id: String(Date.now()),
          division: 'General Conditions',
          category: '',
          subcategory: '',
          description: '',
          quantity: 1,
          unit: 'each',
          unit_cost: 0,
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

  // Division mapping function (matching BidItemForm)
  const getDivisionFromCategory = (category: string): string => {
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('site') || 
        lowerCategory.includes('excavation') || 
        lowerCategory.includes('grading') || 
        lowerCategory.includes('landscaping') ||
        lowerCategory.includes('erosion') ||
        lowerCategory.includes('clearing') ||
        lowerCategory.includes('demolition')) {
      return 'Site Work';
    }
    
    if (lowerCategory.includes('concrete') || 
        lowerCategory.includes('masonry') || 
        lowerCategory.includes('carpentry') ||
        lowerCategory.includes('framing') ||
        lowerCategory.includes('roofing') ||
        lowerCategory.includes('insulation') ||
        lowerCategory.includes('doors') ||
        lowerCategory.includes('windows') ||
        lowerCategory.includes('finishes') ||
        lowerCategory.includes('painting') ||
        lowerCategory.includes('flooring') ||
        lowerCategory.includes('mechanical') ||
        lowerCategory.includes('plumbing') ||
        lowerCategory.includes('electrical') ||
        lowerCategory.includes('fire')) {
      return 'Building';
    }
    
    if (lowerCategory.includes('general') || 
        lowerCategory.includes('supervision') || 
        lowerCategory.includes('management') ||
        lowerCategory.includes('labor') ||
        lowerCategory.includes('design') ||
        lowerCategory.includes('permits') ||
        lowerCategory.includes('bonds') ||
        lowerCategory.includes('insurance')) {
      return 'General Conditions';
    }
    
    return 'Other';
  };

  // Auto-save functionality with more frequent saves
  const triggerAutoSave = (items: BidItem[]) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      handleSaveBid(items, true);
    }, 1000); // Auto-save after 1 second of no changes (reduced from 2 seconds)

    setAutoSaveTimeout(timeout);
  };

  // Handler to update items from BidItemForm
  const handleItemsChange = (newItems: BidItem[]) => {
    setBidItems(newItems);
    triggerAutoSave(newItems);
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

  const handleSaveBid = async (itemsToSave?: BidItem[], isAutoSave = false) => {
    if (!projectId) {
      if (!isAutoSave) toast.error('No project selected');
      return;
    }

    const itemsForSaving = itemsToSave || bidItems;

    // Filter items - only keep items with category OR description (not both required)
    const validItems = itemsForSaving.filter((item) => {
      const hasCategory = item.category && item.category.trim().length > 0;
      const hasDescription = item.description && item.description.trim().length > 0;
      return hasCategory || hasDescription;
    });

    if (validItems.length === 0) {
      if (!isAutoSave) toast.error('No valid items to save');
      return;
    }

    // Convert to database format - do NOT automatically insert description
    const itemsForDatabase = validItems.map((item, index) => {
      // Only use description if it's actually provided, don't use category as fallback
      const description = (item.description || '').trim() || ''; // Keep empty if not provided
      
      return {
        project_id: projectId,
        category: (item.category || '').trim() || 'General',
        subcategory: (item.subcategory || '').trim() || null,
        description: description, // Don't force a description
        quantity: Math.max(Number(item.quantity) || 1, 1),
        unit: (item.unit || 'each').trim(),
        unit_cost: Number(item.unit_cost) || 0
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

      if (!isAutoSave) {
        toast.success(`Successfully saved ${savedData?.length || 0} bid items!`);
      }
      
    } catch (error: any) {
      console.error('Save failed:', error);
      if (!isAutoSave) {
        toast.error(`Failed to save bid: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
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
        category: '',
        subcategory: '',
        description: '',
        quantity: 1,
        unit: 'each',
        unit_cost: 0,
        total: 0
      }]);
      
      onItemsChange([]);
      
      toast.success('Bid deleted successfully');
    } catch (error: any) {
      console.error('Error deleting bid:', error);
      toast.error(`Failed to delete bid: ${error.message}`);
    }
  };

  const handleExportToSOV = async () => {
    try {
      console.log('Exporting bid items to SOV for project:', projectId);
      console.log('Bid items to export:', bidItems);

      if (!bidItems || bidItems.length === 0) {
        toast.error('No bid items to export to Schedule of Values');
        return;
      }

      // Get project details first
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('Error fetching project:', projectError);
        throw new Error('Failed to fetch project details');
      }

      // Convert bid items to SOV format and insert them
      const sovItems = bidItems.map((item, index) => ({
        project_id: projectId,
        item_number: String(index + 1).padStart(3, '0'),
        category: item.category || 'General',
        subcategory: item.subcategory || null,
        description: item.description || '', // Don't force fallback description
        scheduled_value: (item.unit_cost || 0) * (item.quantity || 1),
        previous_applications: 0,
        this_period: 0,
        materials_stored: 0,
        percent_complete: 0,
        work_completed_from_previous: 0,
        materials_presently_stored: 0,
        retainage_percentage: 0, // Set to 0 by default
        change_orders: 0
      }));

      console.log('Converting to SOV items:', sovItems);

      const { data: insertedItems, error: insertError } = await supabase
        .from('sov_items')
        .insert(sovItems)
        .select();

      if (insertError) {
        console.error('Error inserting SOV items:', insertError);
        throw new Error(`Failed to create SOV items: ${insertError.message}`);
      }

      console.log('SOV items created successfully:', insertedItems);
      
      toast.success(`Successfully exported ${sovItems.length} bid items to Schedule of Values for ${project.name}`);
      
      // Navigate to SOV page
      navigate('/schedule-of-values');
    } catch (error) {
      console.error('Error exporting to SOV:', error);
      toast.error(`Failed to export to SOV: ${error.message || 'Unknown error'}`);
    }
  };

  const handleExportToPDF = async () => {
    try {
      // Get project details for PDF export
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('Error fetching project:', projectError);
        throw new Error('Failed to fetch project details');
      }

      // Get company details
      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      const exportData = {
        projectName: project?.name || 'Unnamed Project',
        client: project?.client || 'N/A',
        date: new Date().toLocaleDateString(),
        companyName: companyData?.company_name || 'BuildPro Construction',
        companyAddress: companyData?.company_address || '',
        companyPhone: companyData?.company_phone || '',
        companyEmail: companyData?.company_email || '',
        logoUrl: companyData?.logo_url || '',
        bidItems: bidItems.map(item => ({
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          total: item.total
        })),
        totalAmount: bidItems.reduce((sum, item) => sum + (item.total || 0), 0)
      };

      const { generateBidReport } = await import('@/utils/pdfExport');
      await generateBidReport(exportData);
      
      toast.success('Bid report exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export bid report');
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
              {saving && <span className="ml-2 text-blue-600">• Saving...</span>}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => handleSaveBid()} 
            disabled={saving} 
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Bid'}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportToSOV}>
                Export to SOV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowProposalDialog(true)}>
                Create Proposal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportToPDF}>
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bid Items Form */}
      <div className="w-full">
        <BidItemForm items={bidItems} onItemsChange={handleItemsChange} projectId={projectId} />
      </div>

      {/* Bid Summary */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Bid Summary</CardTitle>
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
