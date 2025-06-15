
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChangeOrderSelection } from '@/components/forms/change-orders/ChangeOrderSelection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChangeOrderSOVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onSuccess: () => void;
}

export function ChangeOrderSOVDialog({ 
  open, 
  onOpenChange, 
  projectId,
  onSuccess
}: ChangeOrderSOVDialogProps) {
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [selectedChangeOrders, setSelectedChangeOrders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      fetchApprovedChangeOrders();
    }
  }, [open, projectId]);

  const fetchApprovedChangeOrders = async () => {
    try {
      // Get approved change orders that haven't been added to SOV yet
      const { data: changeOrdersData, error: coError } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'Approved')
        .order('number');

      if (coError) throw coError;

      // Get existing SOV item linkages to filter out already added change orders
      const { data: existingLinks, error: linkError } = await supabase
        .from('sov_item_change_orders')
        .select('change_order_id');

      if (linkError) throw linkError;

      const linkedChangeOrderIds = new Set(existingLinks?.map(link => link.change_order_id) || []);
      
      // Filter out change orders already linked to SOV items
      const availableChangeOrders = (changeOrdersData || []).filter(co => 
        !linkedChangeOrderIds.has(co.id)
      );

      console.log('Available change orders for SOV:', availableChangeOrders);
      setChangeOrders(availableChangeOrders);
    } catch (error) {
      console.error('Error fetching change orders:', error);
      toast.error('Failed to load change orders');
    }
  };

  const handleToggleSelection = (id: string) => {
    setSelectedChangeOrders(prev =>
      prev.includes(id)
        ? prev.filter(coId => coId !== id)
        : [...prev, id]
    );
  };

  const handleAddToSOV = async () => {
    if (selectedChangeOrders.length === 0) {
      toast.error('Please select at least one change order');
      return;
    }

    setLoading(true);
    try {
      // Get selected change orders
      const selectedCOs = changeOrders.filter(co => selectedChangeOrders.includes(co.id));
      console.log('Selected change orders to add:', selectedCOs);
      
      // Get the highest item number from existing SOV items
      const { data: existingSovItems } = await supabase
        .from('sov_items')
        .select('item_number')
        .eq('project_id', projectId)
        .order('item_number', { ascending: false })
        .limit(1);

      let nextItemNumber = 1;
      if (existingSovItems && existingSovItems.length > 0) {
        const lastItemNumber = parseInt(existingSovItems[0].item_number) || 0;
        nextItemNumber = lastItemNumber + 1;
      }

      // Create SOV items for each selected change order
      const sovItemsToInsert = selectedCOs.map((co, index) => ({
        project_id: projectId,
        item_number: (nextItemNumber + index).toString().padStart(3, '0'),
        category: 'Change Orders',
        description: `CO-${co.number}: ${co.description}`,
        scheduled_value: 0, // Change orders are additions, not part of original scheduled value
        change_orders: co.amount, // This is the key - set the change_orders field
        previous_applications: 0,
        this_period: 0,
        materials_stored: 0,
        work_completed_from_previous: 0,
        materials_presently_stored: 0,
        percent_complete: 0,
        retainage_percentage: 10
      }));

      console.log('SOV items to insert:', sovItemsToInsert);

      const { data: newSovItems, error: insertError } = await supabase
        .from('sov_items')
        .insert(sovItemsToInsert)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Successfully inserted SOV items:', newSovItems);

      // Create linkages between SOV items and change orders
      if (newSovItems) {
        const linkagesToInsert = selectedCOs.map((co, index) => ({
          sov_item_id: newSovItems[index]?.id,
          change_order_id: co.id,
          amount: co.amount
        }));

        console.log('Linkages to insert:', linkagesToInsert);

        const { error: linkError } = await supabase
          .from('sov_item_change_orders')
          .insert(linkagesToInsert);

        if (linkError) {
          console.error('Link error:', linkError);
          throw linkError;
        }
      }

      // Update project's net_change_orders total
      const totalChangeOrderAmount = selectedCOs.reduce((sum, co) => sum + co.amount, 0);
      console.log('Total change order amount:', totalChangeOrderAmount);
      
      const { data: projectData } = await supabase
        .from('projects')
        .select('net_change_orders')
        .eq('id', projectId)
        .single();

      const currentNetChange = projectData?.net_change_orders || 0;
      const newNetChange = currentNetChange + totalChangeOrderAmount;
      
      console.log('Updating project net_change_orders from', currentNetChange, 'to', newNetChange);
      
      const { error: projectUpdateError } = await supabase
        .from('projects')
        .update({ 
          net_change_orders: newNetChange 
        })
        .eq('id', projectId);

      if (projectUpdateError) {
        console.error('Project update error:', projectUpdateError);
        throw projectUpdateError;
      }

      toast.success(`Added ${selectedChangeOrders.length} change orders to SOV`);
      onSuccess();
      onOpenChange(false);
      setSelectedChangeOrders([]);
    } catch (error) {
      console.error('Error adding change orders to SOV:', error);
      toast.error('Failed to add change orders to SOV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Change Orders to Schedule of Values</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex flex-col h-full">
          <ChangeOrderSelection
            changeOrders={changeOrders}
            selectedChangeOrders={selectedChangeOrders}
            onToggleSelection={handleToggleSelection}
            onAddToSOV={handleAddToSOV}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddToSOV} 
              disabled={selectedChangeOrders.length === 0 || loading}
            >
              {loading ? 'Adding...' : `Add to SOV (${selectedChangeOrders.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
