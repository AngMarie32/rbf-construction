import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Settings } from 'lucide-react';
import { G702Builder } from './G702Builder';

interface G702FormProps {
  projectId: string;
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
  const [activeDocument, setActiveDocument] = useState<'g702' | 'g703' | 'builder'>('builder');
  const [notes, setNotes] = useState('');
  const [supportingDocs, setSupportingDocs] = useState('');
  
  const [formData, setFormData] = useState({
    applicationNumber: 1,
    periodTo: new Date().toISOString().split('T')[0],
    periodFrom: new Date().toISOString().split('T')[0],
    contractDate: '',
    architectProjectNo: '',
    projectNumber: '',
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
        changeOrders: item.change_orders || 0,
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
    const netChangeOrders = sovItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0);
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
          const totalContract = item.scheduledValue + item.changeOrders;
          const newPercentComplete = totalContract > 0 ? (newTotalCompleted / totalContract) * 100 : 0;
          
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
          variant={activeDocument === 'builder' ? 'default' : 'outline'}
          onClick={() => setActiveDocument('builder')}
        >
          <Settings className="w-4 h-4 mr-2" />
          Builder
        </Button>
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

      {/* Builder View */}
      {activeDocument === 'builder' && (
        <div className="print:hidden">
          <G702Builder
            projectId={projectId}
            formData={formData}
            setFormData={setFormData}
            sovItems={sovItems}
            setSovItems={setSovItems}
          />
        </div>
      )}

      {/* G702 Document */}
      <div 
        id="g702-document"
        className={`${activeDocument === 'g702' ? 'block' : 'hidden print:block'} print:page-break-after`}
        style={{ printColorAdjust: 'exact' }}
      >
        <div className="bg-white p-6 print:p-4 print:text-xs print:landscape mx-auto" style={{ minHeight: '11in', width: '100%', maxWidth: '11in' }}>
          <div className="border-2 border-black min-h-full">
            {/* Header */}
            <div className="border-b-2 border-black p-3 bg-white text-center">
              <h1 className="text-lg font-bold">APPLICATION AND CERTIFICATION FOR PAYMENT</h1>
            </div>

            {/* Top Information Row */}
            <div className="grid grid-cols-12 border-b border-black text-xs">
              <div className="col-span-4 border-r border-black p-2">
                <div className="font-semibold mb-1">TO:</div>
                <div className="min-h-16 p-1">
                  <div>{project?.client || ''}</div>
                  <div className="text-xs text-gray-600">{project?.address || ''}</div>
                </div>
              </div>
              <div className="col-span-4 border-r border-black p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="font-semibold">APPLICATION NO:</div>
                    <div className="w-full border-b border-gray-400 p-1 text-center font-bold bg-transparent">
                      {formData.applicationNumber}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold">PERIOD TO:</div>
                    <div className="w-full border-b border-gray-400 p-1 bg-transparent">
                      {formData.periodTo}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="font-semibold">PROJECT NAME:</div>
                  <div className="p-1">{project?.name || ''}</div>
                </div>
                <div className="mt-2">
                  <div className="font-semibold">PROJECT #:</div>
                  <div className="w-full border-b border-gray-400 p-1 bg-transparent">
                    {formData.projectNumber || project?.projectCode || ''}
                  </div>
                </div>
              </div>
              <div className="col-span-4 p-2">
                <div className="font-semibold mb-2">Distribution to:</div>
                <div className="space-y-1">
                  <div className="flex items-center text-xs">
                    <span className="border border-black w-4 h-4 mr-2 text-center text-xs">
                      {formData.distributionTo.owner ? 'X' : ''}
                    </span>
                    <span>OWNER</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <span className="border border-black w-4 h-4 mr-2 text-center text-xs">
                      {formData.distributionTo.architect ? 'X' : ''}
                    </span>
                    <span>ARCHITECT</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <span className="border border-black w-4 h-4 mr-2 text-center text-xs">
                      {formData.distributionTo.contractor ? 'X' : ''}
                    </span>
                    <span>CONTRACTOR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* From Section */}
            <div className="border-b border-black p-2 text-xs">
              <div className="font-semibold mb-1">FROM:</div>
              <div className="p-1 font-medium">{formData.contractorName || ''}</div>
              <div className="p-1 text-xs whitespace-pre-line">{formData.contractorAddress || ''}</div>
            </div>

            {/* Contractor's Application Section */}
            <div className="p-3 border-b border-black">
              <h2 className="font-bold text-sm mb-3">CONTRACTOR'S APPLICATION FOR PAYMENT</h2>
              <div className="text-xs mb-4">
                Application is made for payment, as shown below, in connection with the Contract. 
                Continuation Sheet, AIA Document G703, is attached.
              </div>
              
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
                  <div className="flex justify-between border-b py-1">
                    <span>5. RETAINAGE:</span>
                    <span></span>
                  </div>
                  <div className="space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span>a. {formData.retainagePercentage}% of Completed Work ($)</span>
                      <span className="font-mono">$ {(totals.totalRetainage * 0.9).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>b. {formData.retainagePercentage}% of Stored Material ($)</span>
                      <span className="font-mono">$ {(totals.totalRetainage * 0.1).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b py-1 font-semibold">
                      <span>TOTAL RETAINAGE (Line 5a + 5b)</span>
                      <span className="font-mono">$ {totals.totalRetainage.toLocaleString()}</span>
                    </div>
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
              <div className="mt-6">
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
                      <td className="border-r border-black p-1 text-right">${Math.max(totals.netChangeOrders, 0).toLocaleString()}</td>
                      <td className="p-1 text-right">${Math.abs(Math.min(totals.netChangeOrders, 0)).toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-1">TOTALS</td>
                      <td className="border-r border-black p-1 text-right">${Math.max(totals.netChangeOrders, 0).toLocaleString()}</td>
                      <td className="p-1 text-right">${Math.abs(Math.min(totals.netChangeOrders, 0)).toLocaleString()}</td>
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
                    completed in accordance with the Contract Documents, that all amounts have been 
                    paid by the Contractor for Work for which previous Certificates for Payment were 
                    issued and payments received from the Owner, and that current payment shown herein 
                    is now due.
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold">CONTRACTOR:</div>
                      <div className="border-b border-black h-6 mt-4"></div>
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
                    <div className="flex justify-between border-b-2 border-black py-1">
                      <span className="text-xs font-semibold">AMOUNT CERTIFIED</span>
                      <span className="font-mono font-bold">$ {totals.currentPaymentDue.toLocaleString()}</span>
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

      {/* Enhanced G703 Document */}
      <div 
        id="g703-document"
        className={`${activeDocument === 'g703' ? 'block' : 'hidden print:block'}`}
        style={{ printColorAdjust: 'exact' }}
      >
        <div className="bg-white p-6 print:p-4 print:text-xs print:landscape mx-auto" style={{ minHeight: '11in', width: '100%', maxWidth: '11in' }}>
          <div className="border-2 border-black min-h-full">
            {/* Header */}
            <div className="border-b border-black p-2">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="font-bold text-sm">AIA Document G703™ - 1992</h1>
                  <h2 className="font-bold text-sm mt-1">CONTINUATION SHEET</h2>
                  <div className="text-xs mt-2">
                    APPLICATION AND CERTIFICATE FOR PAYMENT<br/>
                    Containing Contractor's signed certification that to the best of the Contractor's knowledge, information and belief the Work covered by this Application for Payment has been completed in accordance with the Contract Documents, that all amounts have been paid by the Contractor for Work for which previous Certificates for Payment were issued and payments received from the Owner, and that current payment shown herein is now due.
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div><strong>APPLICATION NO:</strong> {formData.applicationNumber}</div>
                  <div><strong>PERIOD TO:</strong> {formData.periodTo}</div>
                  <div className="mt-2">
                    <div><strong>PROJECT:</strong> {project?.name || ''}</div>
                    <div><strong>FROM CONTRACTOR:</strong> {formData.contractorName || ''}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced SOV Table */}
            <div className="overflow-hidden">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-black bg-gray-50">
                    <th className="border-r border-black p-1 w-8">A<br/>ITEM<br/>NO.</th>
                    <th className="border-r border-black p-1 w-40">B<br/>DESCRIPTION OF WORK</th>
                    <th className="border-r border-black p-1 w-16">C<br/>SCHEDULED<br/>VALUE</th>
                    <th className="border-r border-black p-1 w-16">D<br/>CHANGE<br/>ORDERS</th>
                    <th className="border-r border-black p-1 w-16">E<br/>TOTAL<br/>CONTRACT</th>
                    <th className="border-r border-black p-1 w-16">F<br/>WORK COMPLETED<br/>FROM PREVIOUS<br/>APPLICATION</th>
                    <th className="border-r border-black p-1 w-16">G<br/>WORK COMPLETED<br/>THIS PERIOD</th>
                    <th className="border-r border-black p-1 w-16">H<br/>MATERIALS<br/>PRESENTLY<br/>STORED</th>
                    <th className="border-r border-black p-1 w-16">I<br/>TOTAL<br/>COMPLETED<br/>AND STORED TO<br/>DATE</th>
                    <th className="border-r border-black p-1 w-12">J<br/>%<br/>(<br/>I÷E<br/>)</th>
                    <th className="border-r border-black p-1 w-16">K<br/>BALANCE TO<br/>FINISH<br/>(<br/>E-I<br/>)</th>
                    <th className="p-1 w-16">L<br/>RETAINAGE<br/>(<br/>%<br/>of I<br/>)</th>
                  </tr>
                </thead>
                <tbody>
                  {sovItems.map((item, index) => {
                    const totalContract = item.scheduledValue + (item.changeOrders || 0);
                    const retainage = item.totalCompletedAndStored * (formData.retainagePercentage / 100);
                    const balanceToFinish = totalContract - item.totalCompletedAndStored;
                    const percentComplete = totalContract > 0 ? (item.totalCompletedAndStored / totalContract) * 100 : 0;
                    
                    return (
                      <tr key={item.id} className="border-b border-gray-300">
                        <td className="border-r border-black p-1 text-center">{index + 1}</td>
                        <td className="border-r border-black p-1">{item.description}</td>
                        <td className="border-r border-black p-1 text-right">${item.scheduledValue.toLocaleString()}</td>
                        <td className="border-r border-black p-1 text-right">${(item.changeOrders || 0).toLocaleString()}</td>
                        <td className="border-r border-black p-1 text-right font-medium">${totalContract.toLocaleString()}</td>
                        <td className="border-r border-black p-1 text-right">${item.previousApplications.toLocaleString()}</td>
                        <td className="border-r border-black p-1 text-right">${item.thisPeriod.toLocaleString()}</td>
                        <td className="border-r border-black p-1 text-right">${item.materialsStored.toLocaleString()}</td>
                        <td className="border-r border-black p-1 text-right">${item.totalCompletedAndStored.toLocaleString()}</td>
                        <td className="border-r border-black p-1 text-center">{percentComplete.toFixed(1)}%</td>
                        <td className="border-r border-black p-1 text-right">${balanceToFinish.toLocaleString()}</td>
                        <td className="p-1 text-right">${retainage.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  
                  {/* Add empty rows to fill the page */}
                  {Array.from({ length: Math.max(0, 15 - sovItems.length) }).map((_, index) => (
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
                      <td className="border-r border-black p-1 text-center">0.0%</td>
                      <td className="border-r border-black p-1 text-right">$0.00</td>
                      <td className="p-1 text-right">$0.00</td>
                    </tr>
                  ))}
                  
                  {/* Totals Row */}
                  <tr className="border-t-2 border-black font-semibold bg-gray-100">
                    <td className="border-r border-black p-1 text-center"></td>
                    <td className="border-r border-black p-1 font-bold">TOTALS</td>
                    <td className="border-r border-black p-1 text-right">${sovItems.reduce((sum, item) => sum + item.scheduledValue, 0).toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${sovItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0).toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${totals.contractSumToDate.toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${sovItems.reduce((sum, item) => sum + item.previousApplications, 0).toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${sovItems.reduce((sum, item) => sum + item.thisPeriod, 0).toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${sovItems.reduce((sum, item) => sum + item.materialsStored, 0).toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-right">${totals.totalCompletedAndStored.toLocaleString()}</td>
                    <td className="border-r border-black p-1 text-center">{((totals.totalCompletedAndStored / totals.contractSumToDate) * 100).toFixed(1)}%</td>
                    <td className="border-r border-black p-1 text-right">${totals.balanceToFinish.toLocaleString()}</td>
                    <td className="p-1 text-right">${totals.totalRetainage.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-2 text-xs border-t border-black">
              <div className="mb-2">
                <strong>Important Information:</strong> The G703 Continuation Sheet itemizes the portions of work and the values claimed in the current payment application. Each line item should correspond to your approved Schedule of Values.
              </div>
              <div className="text-xs text-gray-600">
                Pursuant to Federal Law this document was prepared by an architect or engineer.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Hidden when printing */}
      <div className="flex gap-4 justify-end print:hidden">
        <Button onClick={saveG702Application} disabled={loading}>
          {loading ? 'Saving...' : 'Save Application'}
        </Button>
      </div>

      <style>{`
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
          
          input, textarea {
            border: none !important;
            background: transparent !important;
            outline: none !important;
          }
        }
      `}</style>
    </div>
  );
}
