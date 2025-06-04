
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
    <div className="space-y-6 print:space-y-4">
      {/* G702 Header */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="print:pb-2">
          <CardTitle className="print:text-lg">G702 - Application and Certificate for Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 print:space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
            <div>
              <Label htmlFor="applicationNumber" className="print:text-sm">Application Number</Label>
              <Input
                id="applicationNumber"
                type="number"
                value={formData.applicationNumber}
                onChange={(e) => setFormData({ ...formData, applicationNumber: parseInt(e.target.value) || 1 })}
                className="print:text-sm print:border print:border-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="periodTo" className="print:text-sm">Period To</Label>
              <Input
                id="periodTo"
                type="date"
                value={formData.periodTo}
                onChange={(e) => setFormData({ ...formData, periodTo: e.target.value })}
                className="print:text-sm print:border print:border-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="contractorName" className="print:text-sm">Contractor</Label>
              <Input
                id="contractorName"
                value={formData.contractorName}
                onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                placeholder="Enter contractor name"
                className="print:text-sm print:border print:border-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="contractorAddress" className="print:text-sm">Contractor Address</Label>
              <Input
                id="contractorAddress"
                value={formData.contractorAddress}
                onChange={(e) => setFormData({ ...formData, contractorAddress: e.target.value })}
                placeholder="Enter contractor address"
                className="print:text-sm print:border print:border-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="projectName" className="print:text-sm">Project</Label>
              <Input
                id="projectName"
                value={`${project.name} - ${project.client}`}
                readOnly
                className="bg-gray-100 print:text-sm print:border print:border-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="projectNumber" className="print:text-sm">Project Number</Label>
              <Input
                id="projectNumber"
                value={formData.projectNumber}
                onChange={(e) => setFormData({ ...formData, projectNumber: e.target.value })}
                placeholder={project.projectCode || "Enter project number"}
                className="print:text-sm print:border print:border-gray-400"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Summary */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="print:pb-2">
          <CardTitle className="print:text-lg">Contract Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
            <div className="space-y-3 print:space-y-2">
              <div className="flex justify-between print:text-sm">
                <span>1. Original Contract Sum:</span>
                <span className="font-medium">${totals.originalContractSum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between print:text-sm">
                <span>2. Net Change by Change Orders:</span>
                <span className="font-medium">${totals.netChangeOrders.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2 print:text-sm print:border-black">
                <span className="font-semibold">3. Contract Sum to Date:</span>
                <span className="font-semibold">${totals.contractSumToDate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between print:text-sm">
                <span>4. Total Completed and Stored to Date:</span>
                <span className="font-medium">${totals.totalCompletedAndStored.toLocaleString()}</span>
              </div>
              <div className="flex justify-between print:text-sm">
                <span>5. Retainage ({formData.retainagePercentage}%):</span>
                <span className="font-medium">${totals.totalRetainage.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-3 print:space-y-2">
              <div className="flex justify-between print:text-sm">
                <span>6. Total Earned Less Retainage:</span>
                <span className="font-medium">${totals.totalEarnedLessRetainage.toLocaleString()}</span>
              </div>
              <div className="flex justify-between print:text-sm">
                <span>7. Less Previous Certificates:</span>
                <span className="font-medium">${totals.lessPreviousPayments.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2 print:text-sm print:border-black">
                <span className="font-semibold">8. Current Payment Due:</span>
                <span className="font-semibold text-green-600 print:text-black">${totals.currentPaymentDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between print:text-sm">
                <span>9. Balance to Finish:</span>
                <span className="font-medium">${totals.balanceToFinish.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* G703 - Schedule of Values */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="print:pb-2">
          <CardTitle className="print:text-lg">G703 - Continuation Sheet (Schedule of Values)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto print:overflow-visible">
            <Table className="print:border print:border-black">
              <TableHeader>
                <TableRow className="print:border-b print:border-black">
                  <TableHead className="print:border print:border-black print:text-xs print:font-bold print:text-black">Item No.</TableHead>
                  <TableHead className="print:border print:border-black print:text-xs print:font-bold print:text-black">Description of Work</TableHead>
                  <TableHead className="print:border print:border-black print:text-xs print:font-bold print:text-black">Scheduled Value</TableHead>
                  <TableHead className="print:border print:border-black print:text-xs print:font-bold print:text-black">Work Completed From Previous Application</TableHead>
                  <TableHead className="print:border print:border-black print:text-xs print:font-bold print:text-black">Work Completed This Period</TableHead>
                  <TableHead className="print:border print:border-black print:text-xs print:font-bold print:text-black">Materials Presently Stored</TableHead>
                  <TableHead className="print:border print:border-black print:text-xs print:font-bold print:text-black">Total Completed and Stored to Date</TableHead>
                  <TableHead className="print:border print:border-black print:text-xs print:font-bold print:text-black">% Complete</TableHead>
                  <TableHead className="print:border print:border-black print:text-xs print:font-bold print:text-black">Balance to Finish</TableHead>
                  <TableHead className="print:border print:border-black print:text-xs print:font-bold print:text-black">Retainage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sovItems.map((item) => {
                  const retainage = item.totalCompletedAndStored * (formData.retainagePercentage / 100);
                  const balanceToFinish = item.scheduledValue - item.totalCompletedAndStored;
                  
                  return (
                    <TableRow key={item.id} className="print:border-b print:border-black">
                      <TableCell className="font-medium print:border print:border-black print:text-xs">{item.itemNumber}</TableCell>
                      <TableCell className="print:border print:border-black print:text-xs">
                        <div>
                          <div className="font-medium">{item.description}</div>
                          <div className="text-sm text-gray-500 print:text-black">{item.category}</div>
                        </div>
                      </TableCell>
                      <TableCell className="print:border print:border-black print:text-xs">${item.scheduledValue.toLocaleString()}</TableCell>
                      <TableCell className="print:border print:border-black print:text-xs">${item.previousApplications.toLocaleString()}</TableCell>
                      <TableCell className="print:border print:border-black print:text-xs">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.thisPeriod}
                          onChange={(e) => updateSOVItem(item.id, 'this_period', parseFloat(e.target.value) || 0)}
                          className="w-24 print:hidden"
                        />
                        <span className="hidden print:inline">${item.thisPeriod.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="print:border print:border-black print:text-xs">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.materialsStored}
                          onChange={(e) => updateSOVItem(item.id, 'materials_stored', parseFloat(e.target.value) || 0)}
                          className="w-24 print:hidden"
                        />
                        <span className="hidden print:inline">${item.materialsStored.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="font-medium print:border print:border-black print:text-xs">${item.totalCompletedAndStored.toLocaleString()}</TableCell>
                      <TableCell className="print:border print:border-black print:text-xs">{item.percentComplete.toFixed(1)}%</TableCell>
                      <TableCell className="print:border print:border-black print:text-xs">${balanceToFinish.toLocaleString()}</TableCell>
                      <TableCell className="print:border print:border-black print:text-xs">${retainage.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold bg-gray-50 print:bg-white print:border-b print:border-black">
                  <TableCell colSpan={2} className="print:border print:border-black print:text-xs print:font-bold">TOTALS</TableCell>
                  <TableCell className="print:border print:border-black print:text-xs print:font-bold">${sovItems.reduce((sum, item) => sum + item.scheduledValue, 0).toLocaleString()}</TableCell>
                  <TableCell className="print:border print:border-black print:text-xs print:font-bold">${sovItems.reduce((sum, item) => sum + item.previousApplications, 0).toLocaleString()}</TableCell>
                  <TableCell className="print:border print:border-black print:text-xs print:font-bold">${sovItems.reduce((sum, item) => sum + item.thisPeriod, 0).toLocaleString()}</TableCell>
                  <TableCell className="print:border print:border-black print:text-xs print:font-bold">${sovItems.reduce((sum, item) => sum + item.materialsStored, 0).toLocaleString()}</TableCell>
                  <TableCell className="print:border print:border-black print:text-xs print:font-bold">${totals.totalCompletedAndStored.toLocaleString()}</TableCell>
                  <TableCell className="print:border print:border-black print:text-xs print:font-bold">-</TableCell>
                  <TableCell className="print:border print:border-black print:text-xs print:font-bold">${totals.balanceToFinish.toLocaleString()}</TableCell>
                  <TableCell className="print:border print:border-black print:text-xs print:font-bold">${totals.totalRetainage.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Hidden when printing */}
      <div className="flex gap-4 justify-end print:hidden">
        <Button onClick={saveG702Application} disabled={loading}>
          {loading ? 'Saving...' : 'Save Application'}
        </Button>
      </div>
    </div>
  );
}
