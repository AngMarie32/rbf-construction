
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

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
  retainageHeld?: number;
  balanceToFinish?: number;
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
  const [activeDocument, setActiveDocument] = useState<'g702' | 'g703'>('g702');
  const [notes, setNotes] = useState('');
  const [supportingDocs, setSupportingDocs] = useState('');
  
  const [formData, setFormData] = useState({
    applicationNumber: 1,
    periodTo: new Date().toISOString().split('T')[0],
    periodFrom: new Date().toISOString().split('T')[0],
    contractDate: '',
    architectProjectNo: '',
    contractorName: '',
    contractorAddress: '',
    contractorTitle: '',
    originalContractSum: 0,
    netChangeOrders: 0,
    retainagePercentage: 5,
    previousCertificates: 0,
    distributionTo: {
      owner: true,
      architect: false,
      contractor: false
    },
    certification: false
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
    const originalContractSum = formData.originalContractSum || project?.originalContractSum || 0;
    const netChangeOrders = formData.netChangeOrders || project?.netChangeOrders || 0;
    const contractSumToDate = originalContractSum + netChangeOrders;
    
    const totalCompletedAndStored = sovItems.reduce((sum, item) => sum + item.totalCompletedAndStored, 0);
    const retainageRate = formData.retainagePercentage / 100;
    const totalRetainage = totalCompletedAndStored * retainageRate;
    const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;
    const lessPreviousPayments = formData.previousCertificates;
    const currentPaymentDue = Math.max(totalEarnedLessRetainage - lessPreviousPayments, 0);
    const balanceToFinish = contractSumToDate - totalCompletedAndStored;

    return {
      originalContractSum,
      netChangeOrders,
      contractSumToDate,
      totalCompletedAndStored,
      totalRetainage,
      totalEarnedLessRetainage,
      lessPreviousPayments,
      currentPaymentDue,
      balanceToFinish
    };
  };

  const saveG702Application = async () => {
    if (!project) return;

    try {
      setLoading(true);
      const totals = calculateTotals();

      // Update SOV items with this period amounts
      for (const item of sovItems) {
        if (item.thisPeriod > 0 || item.materialsStored > 0) {
          const newTotalCompleted = item.previousApplications + item.thisPeriod + item.materialsStored;
          const newPercentComplete = item.scheduledValue > 0 ? (newTotalCompleted / item.scheduledValue) * 100 : 0;
          
          await supabase
            .from('sov_items')
            .update({
              previous_applications: item.previousApplications + item.thisPeriod,
              this_period: 0,
              total_completed_and_stored: newTotalCompleted,
              percent_complete: Math.min(newPercentComplete, 100)
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

      toast.success('Payment Application saved successfully');
      onSave?.();
    } catch (error) {
      console.error('Error saving payment application:', error);
      toast.error('Failed to save payment application');
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
      {/* Document Toggle */}
      <div className="flex gap-2 print:hidden">
        <Button 
          variant={activeDocument === 'g702' ? 'default' : 'outline'}
          onClick={() => setActiveDocument('g702')}
        >
          G702 - Application for Payment
        </Button>
        <Button 
          variant={activeDocument === 'g703' ? 'default' : 'outline'}
          onClick={() => setActiveDocument('g703')}
        >
          G703 - Continuation Sheet
        </Button>
      </div>

      {/* G702 Document */}
      <div 
        id="g702-document"
        className={`${activeDocument === 'g702' ? 'block' : 'hidden print:block'} print:page-break-after`}
        style={{ printColorAdjust: 'exact' }}
      >
        <div className="bg-white p-6 print:p-4 print:text-xs print:landscape" style={{ minHeight: '11in', width: '100%' }}>
          <div className="border-2 border-black min-h-full">
            {/* Header */}
            <div className="border-b-2 border-black p-3 bg-white">
              <h1 className="text-lg font-bold text-center">APPLICATION AND CERTIFICATION FOR PAYMENT</h1>
            </div>

            {/* Top Information Row */}
            <div className="grid grid-cols-12 border-b border-black text-xs">
              <div className="col-span-4 border-r border-black p-2">
                <div className="font-semibold mb-1">TO:</div>
                <div className="min-h-16 p-1">
                  <div>{project.client}</div>
                  <div className="text-xs text-gray-600">{project.address}</div>
                </div>
              </div>
              <div className="col-span-4 border-r border-black p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="font-semibold">APPLICATION NO:</div>
                    <input 
                      type="number"
                      value={formData.applicationNumber}
                      onChange={(e) => setFormData({...formData, applicationNumber: parseInt(e.target.value) || 1})}
                      className="w-full border border-gray-400 p-1 print:border-0 text-center font-bold"
                    />
                  </div>
                  <div>
                    <div className="font-semibold">PERIOD TO:</div>
                    <input 
                      type="date"
                      value={formData.periodTo}
                      onChange={(e) => setFormData({...formData, periodTo: e.target.value})}
                      className="w-full border border-gray-400 p-1 print:border-0"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="font-semibold">PROJECT NAME:</div>
                  <div className="p-1">{project.name}</div>
                </div>
                <div className="mt-2">
                  <div className="font-semibold">SACHSE PROJ NO:</div>
                  <input 
                    value={formData.architectProjectNo}
                    onChange={(e) => setFormData({...formData, architectProjectNo: e.target.value})}
                    className="w-full border border-gray-400 p-1 print:border-0"
                  />
                </div>
              </div>
              <div className="col-span-4 p-2">
                <div className="font-semibold mb-2">Distribution to:</div>
                <div className="space-y-1">
                  <label className="flex items-center text-xs">
                    <input 
                      type="checkbox" 
                      checked={formData.distributionTo.owner}
                      onChange={(e) => setFormData({...formData, distributionTo: {...formData.distributionTo, owner: e.target.checked}})}
                      className="mr-2" 
                    />
                    <span className="border border-black px-1">{formData.distributionTo.owner ? 'X' : ' '}</span>
                    <span className="ml-2">OWNER</span>
                  </label>
                  <label className="flex items-center text-xs">
                    <input 
                      type="checkbox" 
                      checked={formData.distributionTo.architect}
                      onChange={(e) => setFormData({...formData, distributionTo: {...formData.distributionTo, architect: e.target.checked}})}
                      className="mr-2" 
                    />
                    <span className="border border-black px-1">{formData.distributionTo.architect ? 'X' : ' '}</span>
                    <span className="ml-2">ARCHITECT</span>
                  </label>
                  <label className="flex items-center text-xs">
                    <input 
                      type="checkbox" 
                      checked={formData.distributionTo.contractor}
                      onChange={(e) => setFormData({...formData, distributionTo: {...formData.distributionTo, contractor: e.target.checked}})}
                      className="mr-2" 
                    />
                    <span className="border border-black px-1">{formData.distributionTo.contractor ? 'X' : ' '}</span>
                    <span className="ml-2">CONTRACTOR</span>
                  </label>
                </div>
              </div>
            </div>

            {/* From Section */}
            <div className="border-b border-black p-2 text-xs">
              <div className="font-semibold mb-1">FROM:</div>
              <input 
                value={formData.contractorName}
                onChange={(e) => setFormData({...formData, contractorName: e.target.value})}
                placeholder="Contractor Name"
                className="w-full border border-gray-400 p-1 print:border-0 mb-1"
              />
              <textarea 
                value={formData.contractorAddress}
                onChange={(e) => setFormData({...formData, contractorAddress: e.target.value})}
                placeholder="Contractor Address"
                className="w-full border border-gray-400 p-1 print:border-0 resize-none h-12 text-xs"
              />
            </div>

            {/* Contractor's Application Section */}
            <div className="p-3 border-b border-black">
              <h2 className="font-bold text-sm mb-3">CONTRACTOR'S APPLICATION FOR PAYMENT</h2>
              <div className="text-xs">Application is made for payment, as shown below, in connection with the Contract. Continuation Sheet is enclosed.</div>
              
              <div className="grid grid-cols-2 gap-6 mt-4">
                <div className="space-y-1">
                  <div className="flex justify-between border-b py-1">
                    <span>1. ORIGINAL CONTRACT SUM</span>
                    <span className="font-mono">$ {totals.originalContractSum.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span>2. NET CHANGE BY CHANGE ORDERS</span>
                    <span className="font-mono">$ {totals.netChangeOrders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-black py-1 font-semibold">
                    <span>3. CONTRACT SUM TO DATE</span>
                    <span className="font-mono">$ {totals.contractSumToDate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span>4. TOTAL COMPLETED & STORED TO DATE</span>
                    <span className="font-mono">$ {totals.totalCompletedAndStored.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span>a. Completed Work</span>
                      <span className="font-mono">$ {(totals.totalCompletedAndStored * 0.9).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>b. Stored Material</span>
                      <span className="font-mono">$ {(totals.totalCompletedAndStored * 0.1).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between border-b py-1 font-semibold">
                    <span>TOTAL RETAINED</span>
                    <span className="font-mono">$ {totals.totalRetainage.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between border-b py-1">
                    <span>6. TOTAL EARNED LESS RETAINAGE</span>
                    <span className="font-mono">$ {totals.totalEarnedLessRetainage.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span>7. LESS PREVIOUS CERTIFICATES FOR PAYMENT</span>
                    <span className="font-mono">$ {totals.lessPreviousPayments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-black py-1 font-semibold">
                    <span>8. CURRENT PAYMENT DUE</span>
                    <span className="font-mono">$ {totals.currentPaymentDue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span>9. BALANCE TO FINISH, INCLUDING RETAINAGE</span>
                    <span className="font-mono">$ {totals.balanceToFinish.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Change Order Summary */}
              <div className="mt-4">
                <h3 className="font-semibold text-xs mb-2">CHANGE ORDER SUMMARY</h3>
                <table className="w-full border border-black text-xs">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="border-r border-black p-1 text-left"></th>
                      <th className="border-r border-black p-1">ADDITIONS</th>
                      <th className="p-1">DEDUCTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-1">Total changes approved in previous months by Owner</td>
                      <td className="border-r border-black p-1 text-right">$0.00</td>
                      <td className="p-1 text-right">$0.00</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-1">Total approved this Month</td>
                      <td className="border-r border-black p-1 text-right">${totals.netChangeOrders.toLocaleString()}</td>
                      <td className="p-1 text-right">$0.00</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-1">TOTALS</td>
                      <td className="border-r border-black p-1 text-right">${totals.netChangeOrders.toLocaleString()}</td>
                      <td className="p-1 text-right">$0.00</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-1">NET CHANGES by Change Order</td>
                      <td className="p-1 text-right" colSpan={2}>${totals.netChangeOrders.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Certification and Signature Section */}
            <div className="p-3">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs mb-4">
                    The undersigned Contractor certifies that to the best of the Contractor's knowledge, 
                    information and belief the Work covered by this Application for Payment has been 
                    completed in accordance with the Contract Documents.
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold">CONTRACTOR:</div>
                      <div className="border-b border-black h-6 mt-1"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs">By:</div>
                        <div className="border-b border-black h-6 mt-8"></div>
                      </div>
                      <div>
                        <div className="text-xs">Date:</div>
                        <div className="border-b border-black h-6 mt-8"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-xs mb-2">ARCHITECT'S CERTIFICATE FOR PAYMENT</h3>
                  <div className="text-xs mb-4">
                    In accordance with the Contract Documents, based on on-site observations and the data 
                    comprising the application, the Architect certifies to the Owner that to the best of the 
                    Architect's knowledge, information and belief the Work has progressed as indicated, 
                    the quality of the Work is in accordance with the Contract Documents, and the Contractor 
                    is entitled to payment of the AMOUNT CERTIFIED.
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs">AMOUNT CERTIFIED</span>
                      <span className="font-mono">$ {totals.currentPaymentDue.toLocaleString()}</span>
                    </div>
                    <div className="text-xs">
                      (Attach explanation if amount certified differs from the amount applied. Initial all figures on this 
                      Application and on the Continuation Sheet that are changed to conform with the amount certified.)
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs">ARCHITECT:</div>
                        <div className="border-b border-black h-6 mt-8"></div>
                        <div className="text-xs mt-2">By:</div>
                        <div className="border-b border-black h-6 mt-4"></div>
                      </div>
                      <div>
                        <div className="text-xs">Date:</div>
                        <div className="border-b border-black h-6 mt-8"></div>
                      </div>
                    </div>
                    <div className="text-xs mt-4">
                      This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the 
                      Contractor named herein. Issuance, payment and acceptance of payment are without 
                      prejudice to any rights of the Owner or Contractor under this Contract.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* G703 Document */}
      <div 
        id="g703-document"
        className={`${activeDocument === 'g703' ? 'block' : 'hidden print:block'}`}
        style={{ printColorAdjust: 'exact' }}
      >
        <div className="bg-white p-6 print:p-4 print:text-xs print:landscape" style={{ minHeight: '11in', width: '100%' }}>
          <div className="border-2 border-black min-h-full">
            {/* Header */}
            <div className="border-b border-black p-2">
              <div className="flex justify-between items-start">
                <h1 className="font-bold text-sm">Continuation Sheet G703</h1>
                <div className="text-right text-xs">
                  <div>APPLICATION NO: {formData.applicationNumber}</div>
                  <div>PERIOD TO: {formData.periodTo}</div>
                </div>
              </div>
            </div>

            {/* SOV Table */}
            <div className="overflow-hidden">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-black bg-gray-50">
                    <th className="border-r border-black p-1 w-12">A<br/>ITEM<br/>NO.</th>
                    <th className="border-r border-black p-1 w-48">B<br/>DESCRIPTION OF WORK</th>
                    <th className="border-r border-black p-1 w-20">C<br/>SCHEDULED<br/>VALUE</th>
                    <th className="border-r border-black p-1 w-16">D<br/>CHANGE<br/>ORDERS</th>
                    <th className="border-r border-black p-1 w-20">E<br/>TOTAL<br/>CONTRACT</th>
                    <th className="border-r border-black p-1 w-20">F<br/>FROM<br/>PREVIOUS<br/>APPLICATION</th>
                    <th className="border-r border-black p-1 w-20">G<br/>WORK COMPLETED<br/>THIS PERIOD</th>
                    <th className="border-r border-black p-1 w-20">H<br/>MATERIALS<br/>PRESENTLY<br/>STORED</th>
                    <th className="border-r border-black p-1 w-20">I<br/>TOTAL<br/>COMPLETED<br/>AND STORED TO<br/>DATE</th>
                    <th className="border-r border-black p-1 w-16">J<br/>%<br/>COMPLETE</th>
                    <th className="border-r border-black p-1 w-20">K<br/>BALANCE TO<br/>FINISH</th>
                    <th className="p-1 w-20">RETAINAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {sovItems.map((item, index) => {
                    const retainage = item.totalCompletedAndStored * (formData.retainagePercentage / 100);
                    const balanceToFinish = item.scheduledValue - item.totalCompletedAndStored;
                    
                    return (
                      <tr key={item.id} className="border-b border-gray-300">
                        <td className="border-r border-black p-1 text-center">{index + 1}</td>
                        <td className="border-r border-black p-1">{item.description}</td>
                        <td className="border-r border-black p-1 text-right">${item.scheduledValue.toLocaleString()}</td>
                        <td className="border-r border-black p-1 text-right">$0.00</td>
                        <td className="border-r border-black p-1 text-right">${item.scheduledValue.toLocaleString()}</td>
                        <td className="border-r border-black p-1 text-right">${item.previousApplications.toLocaleString()}</td>
                        <td className="border-r border-black p-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.thisPeriod}
                            onChange={(e) => updateSOVItem(item.id, 'this_period', parseFloat(e.target.value) || 0)}
                            className="w-full text-right print:border-0 print:bg-transparent text-xs"
                          />
                        </td>
                        <td className="border-r border-black p-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.materialsStored}
                            onChange={(e) => updateSOVItem(item.id, 'materials_stored', parseFloat(e.target.value) || 0)}
                            className="w-full text-right print:border-0 print:bg-transparent text-xs"
                          />
                        </td>
                        <td className="border-r border-black p-1 text-right">${item.totalCompletedAndStored.toLocaleString()}</td>
                        <td className="border-r border-black p-1 text-center">{item.percentComplete.toFixed(2)}%</td>
                        <td className="border-r border-black p-1 text-right">${balanceToFinish.toLocaleString()}</td>
                        <td className="p-1 text-right">${retainage.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  
                  {/* Add empty rows to fill the page */}
                  {Array.from({ length: Math.max(0, 25 - sovItems.length) }).map((_, index) => (
                    <tr key={`empty-${index}`} className="border-b border-gray-300">
                      <td className="border-r border-black p-1 text-center">{sovItems.length + index + 1}</td>
                      <td className="border-r border-black p-1"></td>
                      <td className="border-r border-black p-1 text-right">$0.00</td>
                      <td className="border-r border-black p-1 text-right">$0.00</td>
                      <td className="border-r border-black p-1 text-right">$0.00</td>
                      <td className="border-r border-black p-1 text-right">$0.00</td>
                      <td className="border-r border-black p-1 text-right">$0.00</td>
                      <td className="border-r border-black p-1 text-right">$0.00</td>
                      <td className="border-r border-black p-1 text-right">$0.00</td>
                      <td className="border-r border-black p-1 text-center">0.00%</td>
                      <td className="border-r border-black p-1 text-right">$0.00</td>
                      <td className="p-1 text-right">$0.00</td>
                    </tr>
                  ))}
                  
                  {/* Grand Totals Row */}
                  <tr className="border-t-2 border-black font-semibold bg-gray-100">
                    <td className="border-r border-black p-1 text-center"></td>
                    <td className="border-r border-black p-1 font-bold">GRAND TOTALS</td>
                    <td className="border-r border-black p-1 text-right">${sovItems.reduce((sum, item) => sum + item.scheduledValue, 0).toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${totals.netChangeOrders.toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${totals.contractSumToDate.toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${sovItems.reduce((sum, item) => sum + item.previousApplications, 0).toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${sovItems.reduce((sum, item) => sum + item.thisPeriod, 0).toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${sovItems.reduce((sum, item) => sum + item.materialsStored, 0).toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${totals.totalCompletedAndStored.toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-center">{((totals.totalCompletedAndStored / totals.contractSumToDate) * 100).toFixed(2)}%</td>
                    <td className="border-r border-black p-1 text-right">${totals.balanceToFinish.toLocaleString()}</td>
                    <td className="p-1 text-right">${totals.totalRetainage.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Panel - Only show when not printing */}
      <div className="print:hidden">
        <Card>
          <CardHeader>
            <CardTitle>Application Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                <Label>Contract Date</Label>
                <Input
                  type="date"
                  value={formData.contractDate}
                  onChange={(e) => setFormData({...formData, contractDate: e.target.value})}
                />
              </div>
            </div>

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

            <div>
              <Label>Supporting Documents</Label>
              <Textarea
                value={supportingDocs}
                onChange={(e) => setSupportingDocs(e.target.value)}
                placeholder="Drag and drop files here, or click to browse"
                className="min-h-20"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or comments..."
                className="min-h-20"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="certification"
                checked={formData.certification}
                onCheckedChange={(checked) => setFormData({...formData, certification: checked as boolean})}
              />
              <Label htmlFor="certification" className="text-sm">
                I certify that to the best of my knowledge and belief, the work covered by this Application for Payment has been completed in accordance with the Contract Documents.
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons - Hidden when printing */}
      <div className="flex gap-4 justify-end print:hidden">
        <Button onClick={saveG702Application} disabled={loading}>
          {loading ? 'Saving...' : 'Save Application'}
        </Button>
      </div>

      <style jsx>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.5in;
          }
          
          .print\\:landscape {
            width: 11in;
            height: 8.5in;
          }
          
          .print\\:page-break-after {
            page-break-after: always;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:text-xs {
            font-size: 10px !important;
            line-height: 1.2 !important;
          }
          
          .print\\:p-4 {
            padding: 16px !important;
          }
          
          .print\\:border-0 {
            border: none !important;
          }
          
          .print\\:bg-transparent {
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
