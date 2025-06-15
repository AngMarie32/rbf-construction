
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import { SOVTable } from './sov/SOVTable';

interface G702FormProps {
  projectId: string;
  applicationId?: string;
  onSave?: () => void;
}

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
}

export function G702Form({ projectId, applicationId, onSave }: G702FormProps) {
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState<any>(null);
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<string>('current');
  const [formData, setFormData] = useState({
    application_number: 1,
    period_to: new Date().toISOString().split('T')[0],
    contractor_name: '',
    contractor_address: '',
    project_name: '',
    project_number: '',
    original_contract_sum: 0,
    net_change_by_change_orders: 0,
    contract_sum_to_date: 0,
    total_completed_and_stored: 0,
    retainage_completed_work: 0,
    retainage_stored_materials: 0,
    total_retainage: 0,
    total_earned_less_retainage: 0,
    less_previous_certificates: 0,
    current_payment_due: 0,
    balance_to_finish: 0,
    contractor_signature: '',
    contractor_date: null,
    architect_signature: '',
    architect_date: null
  });

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchSOVItems();
      if (applicationId) {
        fetchApplicationData();
      } else {
        fetchNextApplicationNumber();
      }
    }
  }, [projectId, applicationId]);

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProjectData(data);
      
      setFormData(prev => ({
        ...prev,
        project_name: data.name || '',
        project_number: data.project_code || '',
        original_contract_sum: data.original_contract_sum || data.contract_value || 0,
        net_change_by_change_orders: data.net_change_orders || 0
      }));
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project data');
    }
  };

  const fetchSOVItems = async () => {
    try {
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', projectId)
        .order('item_number');

      if (error) throw error;
      
      const mappedItems = (data || []).map(item => ({
        id: item.id,
        itemNumber: item.item_number,
        description: item.description,
        scheduledValue: item.scheduled_value || 0,
        changeOrders: item.change_orders || 0,
        previousApplications: item.previous_applications || 0,
        thisPeriod: item.this_period || 0,
        materialsStored: item.materials_stored || 0,
        totalCompletedAndStored: (item.previous_applications || 0) + (item.this_period || 0) + (item.materials_stored || 0),
        percentComplete: item.percent_complete || 0,
        category: item.category || 'General'
      }));
      
      setSovItems(mappedItems);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load SOV items');
    }
  };

  const fetchApplicationData = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (error) throw error;
      
      setFormData({
        application_number: data.application_number,
        period_to: data.period_to,
        contractor_name: data.contractor_name || '',
        contractor_address: data.contractor_address || '',
        project_name: data.project_name || '',
        project_number: data.project_number || '',
        original_contract_sum: data.original_contract_sum || 0,
        net_change_by_change_orders: data.net_change_by_change_orders || 0,
        contract_sum_to_date: data.contract_sum_to_date || 0,
        total_completed_and_stored: data.total_completed_and_stored || 0,
        retainage_completed_work: data.retainage_completed_work || 0,
        retainage_stored_materials: data.retainage_stored_materials || 0,
        total_retainage: data.total_retainage || 0,
        total_earned_less_retainage: data.total_earned_less_retainage || 0,
        less_previous_certificates: data.less_previous_certificates || 0,
        current_payment_due: data.current_payment_due || 0,
        balance_to_finish: data.balance_to_finish || 0,
        contractor_signature: data.contractor_signature || '',
        contractor_date: data.contractor_date,
        architect_signature: data.architect_signature || '',
        architect_date: data.architect_date
      });
    } catch (error) {
      console.error('Error fetching application data:', error);
      toast.error('Failed to load application data');
    }
  };

  const fetchNextApplicationNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('application_number')
        .eq('project_id', projectId)
        .order('application_number', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      const nextNumber = data && data.length > 0 ? data[0].application_number + 1 : 1;
      setFormData(prev => ({ ...prev, application_number: nextNumber }));
    } catch (error) {
      console.error('Error fetching next application number:', error);
    }
  };

  const updateSOVItem = async (itemId: string, thisPeriodValue: number) => {
    const updatedItems = sovItems.map(item => {
      if (item.id === itemId) {
        const totalContract = item.scheduledValue + item.changeOrders;
        const newTotalCompleted = item.previousApplications + thisPeriodValue + item.materialsStored;
        const newPercentComplete = totalContract > 0 ? (newTotalCompleted / totalContract) * 100 : 0;
        
        return {
          ...item,
          thisPeriod: thisPeriodValue,
          totalCompletedAndStored: newTotalCompleted,
          percentComplete: Math.min(newPercentComplete, 100)
        };
      }
      return item;
    });
    
    setSovItems(updatedItems);
    calculateTotals(updatedItems);
  };

  const calculateTotals = (items: SOVItem[]) => {
    const totalScheduledValue = items.reduce((sum, item) => sum + item.scheduledValue, 0);
    const totalChangeOrders = items.reduce((sum, item) => sum + item.changeOrders, 0);
    const contractSumToDate = totalScheduledValue + totalChangeOrders;
    const totalCompletedAndStored = items.reduce((sum, item) => sum + item.totalCompletedAndStored, 0);
    const retainageRate = 0.10; // 10% retainage
    const retainageCompleted = totalCompletedAndStored * retainageRate;
    const totalRetainage = retainageCompleted;
    const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;
    const balanceToFinish = contractSumToDate - totalCompletedAndStored;

    setFormData(prev => ({
      ...prev,
      original_contract_sum: totalScheduledValue,
      net_change_by_change_orders: totalChangeOrders,
      contract_sum_to_date: contractSumToDate,
      total_completed_and_stored: totalCompletedAndStored,
      retainage_completed_work: retainageCompleted,
      total_retainage: totalRetainage,
      total_earned_less_retainage: totalEarnedLessRetainage,
      balance_to_finish: balanceToFinish
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Calculate current payment due
      const currentPaymentDue = formData.total_earned_less_retainage - formData.less_previous_certificates;
      
      const applicationData = {
        ...formData,
        project_id: projectId,
        current_payment_due: currentPaymentDue,
        contractor_date: formData.contractor_date || null,
        architect_date: formData.architect_date || null
      };

      let savedApplication;
      
      if (applicationId) {
        // Update existing application
        const { data, error } = await supabase
          .from('payment_applications_g702')
          .update(applicationData)
          .eq('id', applicationId)
          .select()
          .single();

        if (error) throw error;
        savedApplication = data;
      } else {
        // Create new application
        const { data, error } = await supabase
          .from('payment_applications_g702')
          .insert(applicationData)
          .select()
          .single();

        if (error) throw error;
        savedApplication = data;
      }

      // Update SOV items in database with current values
      for (const item of sovItems) {
        await supabase
          .from('sov_items')
          .update({
            this_period: item.thisPeriod,
            previous_applications: item.previousApplications + (applicationId ? 0 : item.thisPeriod), // Add this period to previous if new app
            percent_complete: item.percentComplete / 100,
            materials_stored: item.materialsStored
          })
          .eq('id', item.id);
      }

      // If this is a new application, we need to update previous_applications for next time
      if (!applicationId) {
        for (const item of sovItems) {
          if (item.thisPeriod > 0) {
            await supabase
              .from('sov_items')
              .update({
                previous_applications: item.previousApplications + item.thisPeriod,
                this_period: 0 // Reset for next application
              })
              .eq('id', item.id);
          }
        }
      }

      toast.success(applicationId ? 'Payment application updated successfully' : 'Payment application created successfully');
      onSave?.();
    } catch (error) {
      console.error('Error saving payment application:', error);
      toast.error('Failed to save payment application');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals whenever SOV items change
  useEffect(() => {
    if (sovItems.length > 0) {
      calculateTotals(sovItems);
    }
  }, [sovItems]);

  return (
    <div className="space-y-6">
      {/* Project Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project_name">Project Name</Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => setFormData({...formData, project_name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="project_number">Project Number</Label>
              <Input
                id="project_number"
                value={formData.project_number}
                onChange={(e) => setFormData({...formData, project_number: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="contractor_name">Contractor Name</Label>
              <Input
                id="contractor_name"
                value={formData.contractor_name}
                onChange={(e) => setFormData({...formData, contractor_name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="application_number">Application Number</Label>
              <Input
                id="application_number"
                type="number"
                value={formData.application_number}
                onChange={(e) => setFormData({...formData, application_number: parseInt(e.target.value) || 1})}
              />
            </div>
            <div>
              <Label htmlFor="period_to">Period Ending</Label>
              <Input
                id="period_to"
                type="date"
                value={formData.period_to}
                onChange={(e) => setFormData({...formData, period_to: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SOV Table */}
      <SOVTable
        sovItems={sovItems}
        setSovItems={setSovItems}
        projectId={projectId}
        selectedApplication={selectedApplication}
        onUpdateItem={updateSOVItem}
      />

      {/* Contract Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Original Contract Sum</Label>
              <Input
                type="number"
                value={formData.original_contract_sum}
                onChange={(e) => setFormData({...formData, original_contract_sum: parseFloat(e.target.value) || 0})}
                step="0.01"
              />
            </div>
            <div>
              <Label>Net Change Orders</Label>
              <Input
                type="number"
                value={formData.net_change_by_change_orders}
                onChange={(e) => setFormData({...formData, net_change_by_change_orders: parseFloat(e.target.value) || 0})}
                step="0.01"
              />
            </div>
            <div>
              <Label>Contract Sum to Date</Label>
              <Input
                type="number"
                value={formData.contract_sum_to_date}
                disabled
                step="0.01"
              />
            </div>
            <div>
              <Label>Total Completed and Stored</Label>
              <Input
                type="number"
                value={formData.total_completed_and_stored}
                disabled
                step="0.01"
              />
            </div>
            <div>
              <Label>Total Retainage</Label>
              <Input
                type="number"
                value={formData.total_retainage}
                disabled
                step="0.01"
              />
            </div>
            <div>
              <Label>Total Earned Less Retainage</Label>
              <Input
                type="number"
                value={formData.total_earned_less_retainage}
                disabled
                step="0.01"
              />
            </div>
            <div>
              <Label>Less Previous Certificates</Label>
              <Input
                type="number"
                value={formData.less_previous_certificates}
                onChange={(e) => setFormData({...formData, less_previous_certificates: parseFloat(e.target.value) || 0})}
                step="0.01"
              />
            </div>
            <div>
              <Label>Current Payment Due</Label>
              <Input
                type="number"
                value={formData.total_earned_less_retainage - formData.less_previous_certificates}
                disabled
                step="0.01"
              />
            </div>
            <div>
              <Label>Balance to Finish</Label>
              <Input
                type="number"
                value={formData.balance_to_finish}
                disabled
                step="0.01"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end space-x-2">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : (applicationId ? 'Update Application' : 'Save Application')}
        </Button>
      </div>
    </div>
  );
}
