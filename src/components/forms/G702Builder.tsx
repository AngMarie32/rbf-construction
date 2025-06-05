
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [previousPayments, setPreviousPayments] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPreviousPayments();
  }, [projectId]);

  const fetchPreviousPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('current_payment_due')
        .eq('project_id', projectId)
        .lt('application_number', formData.applicationNumber);

      if (error) throw error;

      const total = data.reduce((sum, app) => sum + (app.current_payment_due || 0), 0);
      setPreviousPayments(total);
      setFormData(prev => ({ ...prev, previousCertificates: total }));
    } catch (error) {
      console.error('Error fetching previous payments:', error);
    }
  };

  const updateSOVItemThisPeriod = async (id: string, value: number) => {
    setLoading(true);
    try {
      const item = sovItems.find(i => i.id === id);
      if (!item) return;

      const workCompletedFromPrevious = previousPayments;
      const totalCompletedAndStored = workCompletedFromPrevious + value + (item.materialsStored || 0);
      const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
      const percentComplete = totalContract > 0 ? (totalCompletedAndStored / totalContract) * 100 : 0;

      const { error } = await supabase
        .from('sov_items')
        .update({
          this_period: value,
          total_completed_and_stored: totalCompletedAndStored,
          percent_complete: Math.min(percentComplete, 100)
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setSovItems(sovItems.map(item => 
        item.id === id 
          ? { 
              ...item, 
              thisPeriod: value,
              totalCompletedAndStored,
              percentComplete: Math.min(percentComplete, 100)
            }
          : item
      ));

    } catch (error) {
      console.error('Error updating SOV item:', error);
      toast.error('Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalScheduledValue = sovItems.reduce((sum, item) => sum + (item.scheduledValue || 0), 0);
    const totalChangeOrders = sovItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0);
    const totalContract = totalScheduledValue + totalChangeOrders;
    const totalThisPeriod = sovItems.reduce((sum, item) => sum + (item.thisPeriod || 0), 0);
    const totalCompleted = sovItems.reduce((sum, item) => sum + (item.totalCompletedAndStored || 0), 0);
    const balanceToFinish = totalContract - totalCompleted;

    return {
      totalScheduledValue,
      totalChangeOrders,
      totalContract,
      totalThisPeriod,
      totalCompleted,
      balanceToFinish
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>G703 Continuation Sheet Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium border-b pb-2">
              <div>Item & Description</div>
              <div>Scheduled Value</div>
              <div>Change Orders</div>
              <div>Total Contract</div>
              <div>Previous Applications</div>
              <div>This Period</div>
              <div>Total Completed</div>
              <div>% Complete</div>
              <div>Balance to Finish</div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {sovItems.map((item) => {
                const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
                const balanceToFinish = totalContract - (item.totalCompletedAndStored || 0);
                
                return (
                  <div key={item.id} className="grid grid-cols-9 gap-2 items-center text-sm border-b pb-2">
                    <div className="font-medium">
                      <div>{item.itemNumber}</div>
                      <div className="text-xs text-gray-600 truncate">{item.description}</div>
                    </div>
                    <div>${(item.scheduledValue || 0).toLocaleString()}</div>
                    <div>${(item.changeOrders || 0).toLocaleString()}</div>
                    <div className="font-medium">${totalContract.toLocaleString()}</div>
                    <div>${previousPayments.toLocaleString()}</div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.thisPeriod || 0}
                        onChange={(e) => updateSOVItemThisPeriod(item.id, Number(e.target.value) || 0)}
                        className="w-full"
                        disabled={loading}
                      />
                    </div>
                    <div>${(item.totalCompletedAndStored || 0).toLocaleString()}</div>
                    <div>{(item.percentComplete || 0).toFixed(1)}%</div>
                    <div>${balanceToFinish.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-9 gap-2 items-center text-sm font-bold border-t pt-2 bg-gray-50">
              <div>TOTALS</div>
              <div>${totals.totalScheduledValue.toLocaleString()}</div>
              <div>${totals.totalChangeOrders.toLocaleString()}</div>
              <div>${totals.totalContract.toLocaleString()}</div>
              <div>${previousPayments.toLocaleString()}</div>
              <div>${totals.totalThisPeriod.toLocaleString()}</div>
              <div>${totals.totalCompleted.toLocaleString()}</div>
              <div>{totals.totalContract > 0 ? ((totals.totalCompleted / totals.totalContract) * 100).toFixed(1) : 0}%</div>
              <div>${totals.balanceToFinish.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contractorName">Contractor Name</Label>
              <Input
                id="contractorName"
                value={formData.contractorName}
                onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                placeholder="Enter contractor name"
              />
            </div>
            <div>
              <Label htmlFor="contractorAddress">Contractor Address</Label>
              <Input
                id="contractorAddress"
                value={formData.contractorAddress}
                onChange={(e) => setFormData({ ...formData, contractorAddress: e.target.value })}
                placeholder="Enter contractor address"
              />
            </div>
            <div>
              <Label htmlFor="retainagePercentage">Retainage Percentage</Label>
              <Input
                id="retainagePercentage"
                type="number"
                step="0.1"
                value={formData.retainagePercentage}
                onChange={(e) => setFormData({ ...formData, retainagePercentage: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="periodFrom">Period From</Label>
              <Input
                id="periodFrom"
                type="date"
                value={formData.periodFrom}
                onChange={(e) => setFormData({ ...formData, periodFrom: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
