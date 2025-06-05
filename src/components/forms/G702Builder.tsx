
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<string>('current');

  useEffect(() => {
    fetchPreviousPayments();
    fetchApplications();
  }, [projectId]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', projectId)
        .order('application_number', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

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

  const updateSOVItemThisPeriod = useCallback(async (id: string, value: number) => {
    // Update local state immediately for better UX
    setSovItems(prevItems => 
      prevItems.map(item => 
        item.id === id 
          ? { ...item, thisPeriod: value }
          : item
      )
    );

    // Debounced database update
    try {
      const { error } = await supabase
        .from('sov_items')
        .update({
          this_period: value
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating SOV item:', error);
        // Revert local state on error
        setSovItems(prevItems => 
          prevItems.map(item => 
            item.id === id 
              ? { ...item, thisPeriod: item.thisPeriod }
              : item
          )
        );
        toast.error('Failed to update item');
      }
    } catch (error) {
      console.error('Error updating SOV item:', error);
      toast.error('Failed to update item');
    }
  }, [setSovItems]);

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
          <div className="flex justify-between items-center">
            <CardTitle>G703 Continuation Sheet Builder</CardTitle>
            <div className="flex items-center gap-4">
              <Label htmlFor="applicationSelect">Application:</Label>
              <Select value={selectedApplication} onValueChange={setSelectedApplication}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Application #{formData.applicationNumber}</SelectItem>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      Application #{app.application_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-8 gap-4 text-sm font-medium border-b pb-2">
              <div>Item & Description</div>
              <div>Scheduled Value</div>
              <div>Change Orders</div>
              <div>Total Contract</div>
              <div>Work Completed This Period</div>
              <div>Total Completed</div>
              <div>% Complete</div>
              <div>Balance to Finish</div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {sovItems.map((item) => {
                const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
                const totalCompleted = (item.previousApplications || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
                const percentComplete = totalContract > 0 ? (totalCompleted / totalContract) * 100 : 0;
                const balanceToFinish = totalContract - totalCompleted;
                
                return (
                  <div key={item.id} className="grid grid-cols-8 gap-2 items-center text-sm border-b pb-2">
                    <div className="font-medium">
                      <div>{item.itemNumber}</div>
                      <div className="text-xs text-gray-600 truncate">{item.description}</div>
                    </div>
                    <div>${(item.scheduledValue || 0).toLocaleString()}</div>
                    <div>${(item.changeOrders || 0).toLocaleString()}</div>
                    <div className="font-medium">${totalContract.toLocaleString()}</div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.thisPeriod || 0}
                        onChange={(e) => updateSOVItemThisPeriod(item.id, Number(e.target.value) || 0)}
                        className="w-full"
                        disabled={selectedApplication !== 'current'}
                      />
                    </div>
                    <div>${totalCompleted.toLocaleString()}</div>
                    <div>{percentComplete.toFixed(1)}%</div>
                    <div>${balanceToFinish.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-8 gap-2 items-center text-sm font-bold border-t pt-2 bg-gray-50">
              <div>TOTALS</div>
              <div>${totals.totalScheduledValue.toLocaleString()}</div>
              <div>${totals.totalChangeOrders.toLocaleString()}</div>
              <div>${totals.totalContract.toLocaleString()}</div>
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
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
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

          <div className="mt-4">
            <Label>Distribution To</Label>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="owner"
                  checked={formData.distributionTo?.owner || false}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      distributionTo: { ...formData.distributionTo, owner: checked }
                    })
                  }
                />
                <Label htmlFor="owner">Owner</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="architect"
                  checked={formData.distributionTo?.architect || false}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      distributionTo: { ...formData.distributionTo, architect: checked }
                    })
                  }
                />
                <Label htmlFor="architect">Architect</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contractor"
                  checked={formData.distributionTo?.contractor || false}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      distributionTo: { ...formData.distributionTo, contractor: checked }
                    })
                  }
                />
                <Label htmlFor="contractor">Contractor</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
