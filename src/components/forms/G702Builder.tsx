
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Import, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface G702BuilderProps {
  projectId: string;
  formData: any;
  setFormData: (data: any) => void;
  sovItems: any[];
  setSovItems: (items: any[]) => void;
}

export function G702Builder({ projectId, formData, setFormData, sovItems, setSovItems }: G702BuilderProps) {
  const [availableSOVItems, setAvailableSOVItems] = useState<any[]>([]);
  const [availableChangeOrders, setAvailableChangeOrders] = useState<any[]>([]);
  const [selectedSOVItems, setSelectedSOVItems] = useState<string[]>([]);
  const [selectedChangeOrders, setSelectedChangeOrders] = useState<string[]>([]);

  useEffect(() => {
    fetchAvailableItems();
  }, [projectId]);

  const fetchAvailableItems = async () => {
    try {
      // Fetch all SOV items for the project
      const { data: sovData, error: sovError } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', projectId)
        .order('item_number');

      if (sovError) throw sovError;
      setAvailableSOVItems(sovData || []);

      // Fetch all change orders for the project
      const { data: coData, error: coError } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'Approved')
        .order('number');

      if (coError) throw coError;
      setAvailableChangeOrders(coData || []);
    } catch (error) {
      console.error('Error fetching available items:', error);
      toast.error('Failed to load available items');
    }
  };

  const handleImportSOVItems = () => {
    const itemsToImport = availableSOVItems.filter(item => 
      selectedSOVItems.includes(item.id)
    );

    const newItems = itemsToImport.map(item => ({
      id: item.id,
      itemNumber: item.item_number,
      description: item.description,
      scheduledValue: item.scheduled_value,
      previousApplications: item.previous_applications || 0,
      thisPeriod: 0,
      materialsStored: 0,
      totalCompletedAndStored: item.total_completed_and_stored || 0,
      percentComplete: item.percent_complete || 0,
      category: item.category
    }));

    // Merge with existing items, avoiding duplicates
    const existingIds = sovItems.map(item => item.id);
    const filteredNewItems = newItems.filter(item => !existingIds.includes(item.id));
    
    setSovItems([...sovItems, ...filteredNewItems]);
    setSelectedSOVItems([]);
    toast.success(`Imported ${filteredNewItems.length} SOV items`);
  };

  const handleImportChangeOrders = () => {
    const ordersToImport = availableChangeOrders.filter(order => 
      selectedChangeOrders.includes(order.id)
    );

    const totalChangeOrderAmount = ordersToImport.reduce((sum, order) => sum + order.amount, 0);
    
    setFormData({
      ...formData,
      netChangeOrders: (formData.netChangeOrders || 0) + totalChangeOrderAmount
    });

    setSelectedChangeOrders([]);
    toast.success(`Imported ${ordersToImport.length} change orders totaling $${totalChangeOrderAmount.toLocaleString()}`);
  };

  const removeSOVItem = (itemId: string) => {
    setSovItems(sovItems.filter(item => item.id !== itemId));
  };

  return (
    <div className="space-y-6">
      {/* Project Information */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Application Number</Label>
              <Input
                type="number"
                value={formData.applicationNumber}
                onChange={(e) => setFormData({...formData, applicationNumber: parseInt(e.target.value) || 1})}
              />
            </div>
            <div>
              <Label>Project Number</Label>
              <Input
                value={formData.projectNumber}
                onChange={(e) => setFormData({...formData, projectNumber: e.target.value})}
                placeholder="Enter project number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Period From</Label>
              <Input
                type="date"
                value={formData.periodFrom}
                onChange={(e) => setFormData({...formData, periodFrom: e.target.value})}
              />
            </div>
            <div>
              <Label>Period To</Label>
              <Input
                type="date"
                value={formData.periodTo}
                onChange={(e) => setFormData({...formData, periodTo: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Contract Date</Label>
              <Input
                type="date"
                value={formData.contractDate}
                onChange={(e) => setFormData({...formData, contractDate: e.target.value})}
              />
            </div>
            <div>
              <Label>Architect Project No.</Label>
              <Input
                value={formData.architectProjectNo}
                onChange={(e) => setFormData({...formData, architectProjectNo: e.target.value})}
                placeholder="e.g. ABC-2025-123"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contractor Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contractor Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Contractor Name</Label>
            <Input
              value={formData.contractorName}
              onChange={(e) => setFormData({...formData, contractorName: e.target.value})}
              placeholder="Enter contractor name"
            />
          </div>
          <div>
            <Label>Contractor Address</Label>
            <Textarea
              value={formData.contractorAddress}
              onChange={(e) => setFormData({...formData, contractorAddress: e.target.value})}
              placeholder="Enter contractor address"
              className="min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial Information */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Original Contract Sum</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.originalContractSum}
                onChange={(e) => setFormData({...formData, originalContractSum: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Net Change by Change Orders</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.netChangeOrders}
                onChange={(e) => setFormData({...formData, netChangeOrders: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div>
            <Label>Retainage Percentage: {formData.retainagePercentage}%</Label>
            <Slider
              value={[formData.retainagePercentage]}
              onValueChange={(value) => setFormData({...formData, retainagePercentage: value[0]})}
              max={10}
              min={0}
              step={0.5}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Previous Certificates for Payment</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.previousCertificates}
              onChange={(e) => setFormData({...formData, previousCertificates: parseFloat(e.target.value) || 0})}
            />
          </div>
        </CardContent>
      </Card>

      {/* Import Change Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Import className="w-5 h-5" />
            Import Change Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableChangeOrders.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {availableChangeOrders.map((order) => (
                  <div key={order.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`co-${order.id}`}
                      checked={selectedChangeOrders.includes(order.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedChangeOrders([...selectedChangeOrders, order.id]);
                        } else {
                          setSelectedChangeOrders(selectedChangeOrders.filter(id => id !== order.id));
                        }
                      }}
                    />
                    <label htmlFor={`co-${order.id}`} className="flex-1 text-sm">
                      <div className="flex justify-between">
                        <span>{order.number} - {order.description}</span>
                        <Badge variant="outline">${order.amount.toLocaleString()}</Badge>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <Button 
                onClick={handleImportChangeOrders} 
                disabled={selectedChangeOrders.length === 0}
                className="w-full"
              >
                Import Selected Change Orders ({selectedChangeOrders.length})
              </Button>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No approved change orders available</p>
          )}
        </CardContent>
      </Card>

      {/* Import SOV Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Import className="w-5 h-5" />
            Import Schedule of Values Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableSOVItems.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableSOVItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sov-${item.id}`}
                      checked={selectedSOVItems.includes(item.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSOVItems([...selectedSOVItems, item.id]);
                        } else {
                          setSelectedSOVItems(selectedSOVItems.filter(id => id !== item.id));
                        }
                      }}
                    />
                    <label htmlFor={`sov-${item.id}`} className="flex-1 text-sm">
                      <div className="flex justify-between">
                        <span>{item.item_number} - {item.description}</span>
                        <Badge variant="outline">${item.scheduled_value.toLocaleString()}</Badge>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <Button 
                onClick={handleImportSOVItems} 
                disabled={selectedSOVItems.length === 0}
                className="w-full"
              >
                Import Selected SOV Items ({selectedSOVItems.length})
              </Button>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No SOV items available for this project</p>
          )}
        </CardContent>
      </Card>

      {/* Current SOV Items */}
      <Card>
        <CardHeader>
          <CardTitle>Current Application Items ({sovItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sovItems.length > 0 ? (
            <div className="space-y-2">
              {sovItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{item.itemNumber} - {item.description}</div>
                    <div className="text-sm text-gray-500">
                      Scheduled: ${item.scheduledValue.toLocaleString()} | 
                      This Period: ${item.thisPeriod.toLocaleString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSOVItem(item.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No items added to this application</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
