import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Save, X, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SOVItem {
  id: string;
  itemNumber: string;
  description: string;
  scheduledValue: number;
  changeOrders: number;
  previousApplications: number;
  thisPeriod: number;
  materialsStored: number;
  totalCompletedAndStored: number;
  percentComplete: number;
  category: string;
  subcategory?: string;
}

interface SOVTableProps {
  sovItems: SOVItem[];
  setSovItems: (items: SOVItem[]) => void;
  projectId: string;
  selectedApplication: string;
  onUpdateItem: (id: string, value: number) => void;
}

export function SOVTable({ sovItems, setSovItems, projectId, selectedApplication, onUpdateItem }: SOVTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newSOVItem, setNewSOVItem] = useState<null | { itemNumber: string, description: string, scheduledValue: number, category: string, subcategory?: string }>(null);
  const [loading, setLoading] = useState(false);

  const categories = ['all', ...Array.from(new Set(sovItems.map(item => item.category)))];
  
  const filteredItems = sovItems.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.itemNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.subcategory && item.subcategory.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDeleteSOVItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      
      // Check if this SOV item is linked to change orders
      const { data: changeOrderLinks } = await supabase
        .from('sov_item_change_orders')
        .select('*')
        .eq('sov_item_id', itemId);

      // If linked to change orders, remove the linkages and update project net change orders
      if (changeOrderLinks && changeOrderLinks.length > 0) {
        const totalChangeOrderAmount = changeOrderLinks.reduce((sum, link) => sum + link.amount, 0);
        
        // Update project net_change_orders
        const { data: projectData } = await supabase
          .from('projects')
          .select('net_change_orders')
          .eq('id', projectId)
          .single();

        const currentNetChange = projectData?.net_change_orders || 0;
        
        await supabase
          .from('projects')
          .update({ 
            net_change_orders: Math.max(0, currentNetChange - totalChangeOrderAmount)
          })
          .eq('id', projectId);

        // Delete the linkages
        await supabase
          .from('sov_item_change_orders')
          .delete()
          .eq('sov_item_id', itemId);
      }

      // Delete the SOV item
      const { error } = await supabase.from('sov_items').delete().eq('id', itemId);
      if (error) throw error;

      setSovItems(sovItems.filter(item => item.id !== itemId));
      toast.success("SOV item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete SOV item");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewItem = () => {
    const nextItemNumber = sovItems.length > 0 ? String(Math.max(...sovItems.map(i => Number(i.itemNumber)).filter(Number.isFinite)) + 1) : "1";
    setNewSOVItem({ itemNumber: nextItemNumber, description: '', scheduledValue: 0, category: 'General', subcategory: '' });
  };

  const handleSaveNewItem = async () => {
    if (!newSOVItem || !newSOVItem.description || newSOVItem.scheduledValue <= 0) {
      toast.error("Please fill all required fields for the new item.");
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase.from('sov_items').insert({
        project_id: projectId,
        item_number: newSOVItem.itemNumber,
        description: newSOVItem.description,
        scheduled_value: newSOVItem.scheduledValue,
        category: newSOVItem.category,
        subcategory: newSOVItem.subcategory || null
      }).select().single();

      if (error) throw error;
      
      const mappedItem = {
        id: data.id,
        itemNumber: data.item_number,
        description: data.description,
        scheduledValue: data.scheduled_value,
        changeOrders: 0,
        previousApplications: 0,
        thisPeriod: 0,
        materialsStored: 0,
        totalCompletedAndStored: 0,
        percentComplete: 0,
        category: data.category,
        subcategory: data.subcategory
      };
      setSovItems([...sovItems, mappedItem]);
      setNewSOVItem(null);
      toast.success("New SOV item added.");
    } catch (error) {
      toast.error("Failed to save new item.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle updates with real-time sync
  const handleUpdateItemValue = async (itemId: string, value: number) => {
    try {
      // Update locally first for immediate UI feedback
      onUpdateItem(itemId, value);
      
      // Update in database
      const { error } = await supabase
        .from('sov_items')
        .update({ this_period: value })
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating SOV item:', error);
      toast.error('Failed to update SOV item');
    }
  };

  const calculateTotals = () => {
    const totalScheduledValue = filteredItems.reduce((sum, item) => sum + (item.scheduledValue || 0), 0);
    const totalChangeOrders = filteredItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0);
    const totalContract = totalScheduledValue + totalChangeOrders;
    const totalThisPeriod = filteredItems.reduce((sum, item) => sum + (item.thisPeriod || 0), 0);
    const totalCompleted = filteredItems.reduce((sum, item) => sum + (item.totalCompletedAndStored || 0), 0);

    return { totalScheduledValue, totalChangeOrders, totalContract, totalThisPeriod, totalCompleted };
  };

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Schedule of Values
            <Badge variant="outline">{filteredItems.length} items</Badge>
          </CardTitle>
          <Button onClick={handleAddNewItem} size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background min-w-48"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Improved Table with Better Column Spacing */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Item #
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Category
                  </th>
                  <th className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Subcategory
                  </th>
                  <th className="w-64 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Description
                  </th>
                  <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Scheduled Value
                  </th>
                  <th className="w-28 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Change Orders
                  </th>
                  <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Total Contract
                  </th>
                  <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Work This Period
                  </th>
                  <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Total Completed
                  </th>
                  <th className="w-28 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    % Complete
                  </th>
                  <th className="w-32 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                    Balance to Finish
                  </th>
                  <th className="w-20 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
                  const totalCompleted = (item.previousApplications || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
                  const percentComplete = totalContract > 0 ? (totalCompleted / totalContract) * 100 : 0;
                  const balanceToFinish = totalContract - totalCompleted;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-2 py-4 text-sm border-r">
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-center font-medium text-xs">
                          {item.itemNumber}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm border-r">
                        <div className="text-gray-900 font-medium text-xs">
                          {item.category}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm border-r">
                        <div className="text-gray-600 text-xs">
                          {item.subcategory || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm border-r">
                        <div className="text-gray-900 text-xs leading-tight">
                          {item.description}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-right font-mono border-r">
                        <div className="text-xs">
                          ${(item.scheduledValue || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-right font-mono text-green-600 border-r">
                        <div className="text-xs">
                          ${(item.changeOrders || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-right font-mono font-medium border-r">
                        <div className="text-xs">
                          ${totalContract.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm border-r">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.thisPeriod || 0}
                          onChange={(e) => handleUpdateItemValue(item.id, Number(e.target.value) || 0)}
                          className="w-full text-xs text-right font-mono h-8"
                          disabled={selectedApplication !== 'current'}
                        />
                      </td>
                      <td className="px-3 py-4 text-sm text-right font-mono border-r">
                        <div className="text-xs">
                          ${totalCompleted.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm border-r">
                        <div className="flex items-center justify-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(percentComplete, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium min-w-12 text-right">
                            {percentComplete.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-right font-mono border-r">
                        <div className="text-xs">
                          ${balanceToFinish.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteSOVItem(item.id)} 
                          className="text-red-500 hover:text-red-700 h-8 w-8"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {/* New Item Row */}
                {newSOVItem && (
                  <tr className="bg-blue-50 border-2 border-blue-200">
                    <td className="px-2 py-4 text-sm border-r">
                      <Input
                        value={newSOVItem.itemNumber}
                        onChange={(e) => setNewSOVItem({ ...newSOVItem, itemNumber: e.target.value })}
                        placeholder="Item #"
                        className="h-8 text-center text-xs"
                      />
                    </td>
                    <td className="px-3 py-4 text-sm border-r">
                      <Input
                        value={newSOVItem.category}
                        onChange={(e) => setNewSOVItem({ ...newSOVItem, category: e.target.value })}
                        placeholder="Category"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-3 py-4 text-sm border-r">
                      <Input
                        value={newSOVItem.subcategory || ''}
                        onChange={(e) => setNewSOVItem({ ...newSOVItem, subcategory: e.target.value })}
                        placeholder="Subcategory"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-3 py-4 text-sm border-r">
                      <Input
                        value={newSOVItem.description}
                        onChange={(e) => setNewSOVItem({ ...newSOVItem, description: e.target.value })}
                        placeholder="Description"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="px-3 py-4 text-sm border-r">
                      <Input
                        type="number"
                        value={newSOVItem.scheduledValue}
                        onChange={(e) => setNewSOVItem({ ...newSOVItem, scheduledValue: Number(e.target.value) || 0 })}
                        placeholder="Value"
                        className="h-8 text-right text-xs"
                      />
                    </td>
                    <td className="px-3 py-4 text-sm text-right text-gray-500 border-r">
                      <div className="text-xs">$0</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-right font-medium border-r">
                      <div className="text-xs">
                        ${(newSOVItem.scheduledValue || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-right text-gray-500 border-r">
                      <div className="text-xs">$0</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-right text-gray-500 border-r">
                      <div className="text-xs">$0</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-center text-gray-500 border-r">
                      <div className="text-xs">0.0%</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-right font-medium border-r">
                      <div className="text-xs">
                        ${(newSOVItem.scheduledValue || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-center">
                      <div className="flex gap-1 justify-center">
                        <Button onClick={handleSaveNewItem} size="sm" className="h-7 text-xs px-2" disabled={loading}>
                          <Save className="w-3 h-3 mr-1" />
                          {loading ? 'Saving...' : 'Save'}
                        </Button>
                        <Button onClick={() => setNewSOVItem(null)} variant="ghost" size="sm" className="h-7 text-xs px-2">
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              
              {/* Totals Row */}
              <tfoot className="bg-gray-100 border-t-2">
                <tr className="font-bold">
                  <td colSpan={4} className="px-3 py-4 text-sm border-r">
                    TOTALS ({filteredItems.length} items)
                  </td>
                  <td className="px-3 py-4 text-sm text-right font-mono border-r">
                    <div className="text-xs">
                      ${totals.totalScheduledValue.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-right font-mono text-green-600 border-r">
                    <div className="text-xs">
                      ${totals.totalChangeOrders.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-right font-mono border-r">
                    <div className="text-xs">
                      ${totals.totalContract.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-right font-mono text-blue-600 border-r">
                    <div className="text-xs">
                      ${totals.totalThisPeriod.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-right font-mono border-r">
                    <div className="text-xs">
                      ${totals.totalCompleted.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-center border-r">
                    <div className="text-xs">
                      {totals.totalContract > 0 ? ((totals.totalCompleted / totals.totalContract) * 100).toFixed(1) : 0}%
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-right font-mono border-r">
                    <div className="text-xs">
                      ${(totals.totalContract - totals.totalCompleted).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
