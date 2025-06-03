
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface G702FormProps {
  projectId: string;
  onSave?: () => void;
}

interface SOVItem {
  id: string;
  itemNumber: string;
  description: string;
  scheduledValue: number;
  previousApplications: number;
  thisPeriod: number;
  materialsStored: number;
  totalCompletedAndStored: number;
  percentComplete: number;
  category: string;
}

interface Project {
  id: string;
  name: string;
  contractValue: number;
  originalContractSum: number;
  netChangeOrders: number;
  client: string;
  address: string;
  projectCode: string;
}

export function G702Form({ projectId, onSave }: G702FormProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    applicationNumber: 1,
    periodTo: new Date().toISOString().split('T')[0],
    contractorName: '',
    contractorAddress: '',
    projectNumber: '',
    retainagePercentage: 10
  });

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchSOVItems();
      fetchLastApplicationNumber();
    }
  }, [projectId]);

  const fetchLastApplicationNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('application_number')
        .eq('project_id', projectId)
        .order('application_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      const nextNumber = data.length > 0 ? data[0].application_number + 1 : 1;
      setFormData(prev => ({ ...prev, applicationNumber: nextNumber }));
    } catch (error) {
      console.error('Error fetching last application number:', error);
    }
  };

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      setProject({
        id: data.id,
        name: data.name,
        contractValue: data.contract_value,
        originalContractSum: data.original_contract_sum || data.contract_value,
        netChangeOrders: data.net_change_orders || 0,
        client: data.client || '',
        address: data.address || '',
        projectCode: data.project_code || ''
      });
    } catch (error) {
      console.error('Error fetching project:', error);
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
        scheduledValue: item.scheduled_value,
        previousApplications: item.previous_applications || 0,
        thisPeriod: item.this_period || 0,
        materialsStored: item.materials_stored || 0,
        totalCompletedAndStored: item.total_completed_and_stored || 0,
        percentComplete: item.percent_complete || 0,
        category: item.category
      }));

      setSovItems(mappedItems);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load SOV items');
    }
  };

  const calculateTotals = () => {
    const originalContractSum = project?.originalContractSum || 0;
    const netChangeOrders = project?.netChangeOrders || 0;
    const contractSumToDate = originalContractSum + netChangeOrders;
    
    const totalCompletedAndStored = sovItems.reduce((sum, item) => sum + item.totalCompletedAndStored, 0);
    const retainageRate = formData.retainagePercentage / 100;
    const totalRetainage = totalCompletedAndStored * retainageRate;
    const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;
    const lessPreviousPayments = sovItems.reduce((sum, item) => sum + item.previousApplications, 0);
    const currentPaymentDue = totalEarnedLessRetainage - lessPreviousPayments;
    const balanceToFinish = contractSumToDate - totalCompletedAndStored;

    return {
      originalContractSum,
      netChangeOrders,
      contractSumToDate,
      totalCompletedAndStored,
      totalRetainage,
      totalEarnedLessRetainage,
      lessPreviousPayments,
      currentPaymentDue: Math.max(currentPaymentDue, 0),
      balanceToFinish
    };
  };

  const saveG702Application = async () => {
    if (!project) return;

    try {
      setLoading(true);
      const totals = calculateTotals();

      // Update previous applications for SOV items
      for (const item of sovItems) {
        if (item.thisPeriod > 0) {
          await supabase
            .from('sov_items')
            .update({
              previous_applications: item.previousApplications + item.thisPeriod,
              this_period: 0
            })
            .eq('id', item.id);
        }
      }

      const { error } = await supabase
        .from('payment_applications_g702')
        .insert({
          project_id: projectId,
          application_number: formData.applicationNumber,
          period_to: formData.periodTo,
          contractor_name: formData.contractorName,
          contractor_address: formData.contractorAddress,
          project_name: project.name,
          project_number: formData.projectNumber || project.projectCode,
          original_contract_sum: totals.originalContractSum,
          net_change_by_change_orders: totals.netChangeOrders,
          contract_sum_to_date: totals.contractSumToDate,
          total_completed_and_stored: totals.totalCompletedAndStored,
          retainage_completed_work: totals.totalRetainage * 0.9,
          retainage_stored_materials: totals.totalRetainage * 0.1,
          total_retainage: totals.totalRetainage,
          total_earned_less_retainage: totals.totalEarnedLessRetainage,
          less_previous_certificates: totals.lessPreviousPayments,
          current_payment_due: totals.currentPaymentDue,
          balance_to_finish: totals.balanceToFinish
        });

      if (error) throw error;

      toast.success('G702 Application saved successfully');
      onSave?.();
    } catch (error) {
      console.error('Error saving G702 application:', error);
      toast.error('Failed to save G702 application');
    } finally {
      setLoading(false);
    }
  };

  const updateSOVItem = async (id: string, field: string, value: number) => {
    try {
      const updateData: any = { [field]: value };
      
      if (field === 'this_period' || field === 'materials_stored') {
        const item = sovItems.find(i => i.id === id);
        if (item) {
          const thisPeriod = field === 'this_period' ? value : item.thisPeriod;
          const materialsStored = field === 'materials_stored' ? value : item.materialsStored;
          const totalCompletedAndStored = item.previousApplications + thisPeriod + materialsStored;
          const percentComplete = item.scheduledValue > 0 ? (totalCompletedAndStored / item.scheduledValue) * 100 : 0;
          
          updateData.total_completed_and_stored = totalCompletedAndStored;
          updateData.percent_complete = Math.min(percentComplete, 100);
        }
      }

      const { error } = await supabase
        .from('sov_items')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      fetchSOVItems();
    } catch (error) {
      console.error('Error updating SOV item:', error);
      toast.error('Failed to update SOV item');
    }
  };

  if (!project) {
    return <div className="text-center py-8">Loading project data...</div>;
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* G702 Header */}
      <Card>
        <CardHeader>
          <CardTitle>G702 - Application and Certificate for Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="applicationNumber">Application Number</Label>
              <Input
                id="applicationNumber"
                type="number"
                value={formData.applicationNumber}
                onChange={(e) => setFormData({ ...formData, applicationNumber: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="periodTo">Period To</Label>
              <Input
                id="periodTo"
                type="date"
                value={formData.periodTo}
                onChange={(e) => setFormData({ ...formData, periodTo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contractorName">Contractor</Label>
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
              <Label htmlFor="projectName">Project</Label>
              <Input
                id="projectName"
                value={`${project.name} - ${project.client}`}
                readOnly
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="projectNumber">Project Number</Label>
              <Input
                id="projectNumber"
                value={formData.projectNumber}
                onChange={(e) => setFormData({ ...formData, projectNumber: e.target.value })}
                placeholder={project.projectCode || "Enter project number"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>1. Original Contract Sum:</span>
                <span className="font-medium">${totals.originalContractSum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>2. Net Change by Change Orders:</span>
                <span className="font-medium">${totals.netChangeOrders.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">3. Contract Sum to Date:</span>
                <span className="font-semibold">${totals.contractSumToDate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>4. Total Completed and Stored to Date:</span>
                <span className="font-medium">${totals.totalCompletedAndStored.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>5. Retainage ({formData.retainagePercentage}%):</span>
                <span className="font-medium">${totals.totalRetainage.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>6. Total Earned Less Retainage:</span>
                <span className="font-medium">${totals.totalEarnedLessRetainage.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>7. Less Previous Certificates:</span>
                <span className="font-medium">${totals.lessPreviousPayments.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">8. Current Payment Due:</span>
                <span className="font-semibold text-green-600">${totals.currentPaymentDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>9. Balance to Finish:</span>
                <span className="font-medium">${totals.balanceToFinish.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* G703 - Schedule of Values */}
      <Card>
        <CardHeader>
          <CardTitle>G703 - Continuation Sheet (Schedule of Values)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item No.</TableHead>
                  <TableHead>Description of Work</TableHead>
                  <TableHead>Scheduled Value</TableHead>
                  <TableHead>Work Completed From Previous Application</TableHead>
                  <TableHead>Work Completed This Period</TableHead>
                  <TableHead>Materials Presently Stored</TableHead>
                  <TableHead>Total Completed and Stored to Date</TableHead>
                  <TableHead>% Complete</TableHead>
                  <TableHead>Balance to Finish</TableHead>
                  <TableHead>Retainage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sovItems.map((item) => {
                  const retainage = item.totalCompletedAndStored * (formData.retainagePercentage / 100);
                  const balanceToFinish = item.scheduledValue - item.totalCompletedAndStored;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.description}</div>
                          <div className="text-sm text-gray-500">{item.category}</div>
                        </div>
                      </TableCell>
                      <TableCell>${item.scheduledValue.toLocaleString()}</TableCell>
                      <TableCell>${item.previousApplications.toLocaleString()}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.thisPeriod}
                          onChange={(e) => updateSOVItem(item.id, 'this_period', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.materialsStored}
                          onChange={(e) => updateSOVItem(item.id, 'materials_stored', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="font-medium">${item.totalCompletedAndStored.toLocaleString()}</TableCell>
                      <TableCell>{item.percentComplete.toFixed(1)}%</TableCell>
                      <TableCell>${balanceToFinish.toLocaleString()}</TableCell>
                      <TableCell>${retainage.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold bg-gray-50">
                  <TableCell colSpan={2}>TOTALS</TableCell>
                  <TableCell>${sovItems.reduce((sum, item) => sum + item.scheduledValue, 0).toLocaleString()}</TableCell>
                  <TableCell>${sovItems.reduce((sum, item) => sum + item.previousApplications, 0).toLocaleString()}</TableCell>
                  <TableCell>${sovItems.reduce((sum, item) => sum + item.thisPeriod, 0).toLocaleString()}</TableCell>
                  <TableCell>${sovItems.reduce((sum, item) => sum + item.materialsStored, 0).toLocaleString()}</TableCell>
                  <TableCell>${totals.totalCompletedAndStored.toLocaleString()}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>${totals.balanceToFinish.toLocaleString()}</TableCell>
                  <TableCell>${totals.totalRetainage.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline">Print/Export PDF</Button>
        <Button onClick={saveG702Application} disabled={loading}>
          {loading ? 'Saving...' : 'Save Application'}
        </Button>
      </div>
    </div>
  );
}
