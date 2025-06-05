
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
  const [activeDocument, setActiveDocument] = useState<'g702' | 'g703'>('g702');
  
  const [formData, setFormData] = useState({
    applicationNumber: 1,
    applicationDate: new Date().toISOString().split('T')[0],
    periodTo: new Date().toISOString().split('T')[0],
    contractorName: '',
    contractorAddress: '',
    projectNumber: '',
    contractDate: '',
    architect: '',
    retainagePercentage: 10,
    distributionTo: {
      owner: false,
      constructionMgr: false,
      architect: false,
      contractor: false,
      other: false
    }
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
        <div className="bg-white p-8 print:p-6 print:text-sm">
          <div className="border-2 border-black">
            {/* Header */}
            <div className="border-b-2 border-black p-4">
              <h1 className="text-xl font-bold text-center">G702 APPLICATION and CERTIFICATE for PAYMENT</h1>
            </div>

            {/* Form Header Grid */}
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-3 border-r border-black p-2">
                <div className="text-xs font-semibold">To:</div>
                <div className="h-16 border border-gray-400 mt-1 p-1">
                  {project.client}
                </div>
              </div>
              <div className="col-span-3 border-r border-black p-2">
                <div className="text-xs font-semibold">Project:</div>
                <div className="h-16 border border-gray-400 mt-1 p-1">
                  {project.name}
                </div>
              </div>
              <div className="col-span-3 border-r border-black p-2">
                <div className="text-xs font-semibold">Application #:</div>
                <input 
                  type="number"
                  value={formData.applicationNumber}
                  onChange={(e) => setFormData({...formData, applicationNumber: parseInt(e.target.value) || 1})}
                  className="w-full h-8 border border-gray-400 mt-1 p-1 print:border-0"
                />
                <div className="text-xs font-semibold mt-2">Application Date:</div>
                <input 
                  type="date"
                  value={formData.applicationDate}
                  onChange={(e) => setFormData({...formData, applicationDate: e.target.value})}
                  className="w-full h-8 border border-gray-400 mt-1 p-1 print:border-0"
                />
                <div className="text-xs font-semibold mt-2">Period To:</div>
                <input 
                  type="date"
                  value={formData.periodTo}
                  onChange={(e) => setFormData({...formData, periodTo: e.target.value})}
                  className="w-full h-8 border border-gray-400 mt-1 p-1 print:border-0"
                />
                <div className="text-xs font-semibold mt-2">Project #:</div>
                <input 
                  value={formData.projectNumber || project.projectCode}
                  onChange={(e) => setFormData({...formData, projectNumber: e.target.value})}
                  className="w-full h-8 border border-gray-400 mt-1 p-1 print:border-0"
                />
              </div>
              <div className="col-span-3 p-2">
                <div className="text-xs font-semibold">Distribution To:</div>
                <div className="space-y-1 text-xs mt-1">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" /> OWNER
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" /> CONSTRUCTION MGR.
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" /> ARCHITECT
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" /> CONTRACTOR
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" /> OTHER
                  </label>
                </div>
              </div>
            </div>

            {/* From Section */}
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-3 border-r border-black p-2">
                <div className="text-xs font-semibold">From:</div>
                <input 
                  value={formData.contractorName}
                  onChange={(e) => setFormData({...formData, contractorName: e.target.value})}
                  placeholder="Contractor Name"
                  className="w-full h-8 border border-gray-400 mt-1 p-1 print:border-0"
                />
                <textarea 
                  value={formData.contractorAddress}
                  onChange={(e) => setFormData({...formData, contractorAddress: e.target.value})}
                  placeholder="Contractor Address"
                  className="w-full h-16 border border-gray-400 mt-1 p-1 print:border-0 resize-none text-xs"
                />
              </div>
              <div className="col-span-3 border-r border-black p-2">
                <div className="text-xs font-semibold">Architect:</div>
                <input 
                  value={formData.architect}
                  onChange={(e) => setFormData({...formData, architect: e.target.value})}
                  placeholder="Architect Name"
                  className="w-full h-8 border border-gray-400 mt-1 p-1 print:border-0"
                />
              </div>
              <div className="col-span-3 border-r border-black p-2">
                <div className="text-xs font-semibold">Contract Date:</div>
                <input 
                  type="date"
                  value={formData.contractDate}
                  onChange={(e) => setFormData({...formData, contractDate: e.target.value})}
                  className="w-full h-8 border border-gray-400 mt-1 p-1 print:border-0"
                />
              </div>
              <div className="col-span-3 p-2">
                <div className="text-xs font-semibold">Contract For:</div>
                <div className="h-16 border border-gray-400 mt-1 p-1 text-xs">
                  {project.name}
                </div>
              </div>
            </div>

            {/* Contractor's Application Section */}
            <div className="p-4 border-b border-black">
              <h2 className="font-bold text-sm mb-4">CONTRACTOR'S APPLICATION FOR PAYMENT</h2>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="flex justify-between border-b py-1">
                    <span className="text-xs">1. ORIGINAL CONTRACT SUM</span>
                    <span className="font-mono">$ {totals.originalContractSum.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span className="text-xs">2. Net Change By Change Orders</span>
                    <span className="font-mono">$ {totals.netChangeOrders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-black py-1 font-semibold">
                    <span className="text-xs">3. CONTRACT SUM TO DATE</span>
                    <span className="font-mono">$ {totals.contractSumToDate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span className="text-xs">4. TOTAL COMPLETED AND STORED TO DATE</span>
                    <span className="font-mono">$ {totals.totalCompletedAndStored.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span className="text-xs">5. RETAINAGE for This Application for Payment</span>
                    <span className="font-mono">$ {totals.totalRetainage.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between border-b py-1">
                    <span className="text-xs">6. TOTAL EARNED LESS RETAINAGE</span>
                    <span className="font-mono">$ {totals.totalEarnedLessRetainage.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span className="text-xs">7. LESS PREVIOUS CERTIFICATES FOR PAYMENT</span>
                    <span className="font-mono">$ {totals.lessPreviousPayments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-black py-1 font-semibold">
                    <span className="text-xs">8. CURRENT PAYMENT DUE</span>
                    <span className="font-mono">$ {totals.currentPaymentDue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b py-1">
                    <span className="text-xs">9. BALANCE TO FINISH, INCLUDING RETAINAGE</span>
                    <span className="font-mono">$ {totals.balanceToFinish.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-xs font-semibold mb-2">CONTRACTOR:</div>
                  <div className="border-b border-black mb-2 h-8"></div>
                  <div className="text-xs">Sign:</div>
                  <div className="border-b border-black mb-2 h-8 mt-4"></div>
                  <div className="text-xs">By:</div>
                  <div className="text-xs">Date:</div>
                </div>
                <div>
                  <div className="text-xs">State of:</div>
                  <div className="text-xs">County of:</div>
                  <div className="text-xs mt-4">Subscribed and sworn before me this _____ day of</div>
                  <div className="border-b border-black mt-8 h-8"></div>
                  <div className="text-xs">Notary Public:</div>
                  <div className="text-xs">My Commission Expires:</div>
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
        <div className="bg-white p-8 print:p-6 print:text-xs">
          <div className="border-2 border-black">
            {/* Header */}
            <div className="border-b border-black p-2">
              <div className="flex justify-between items-center">
                <h1 className="font-bold">Continuation Sheet G703</h1>
                <div className="text-right">
                  <div>PROJECT: {project.name}</div>
                  <div>Application #: {formData.applicationNumber}</div>
                  <div>Application Date: {formData.applicationDate}</div>
                  <div>Period To: {formData.periodTo}</div>
                </div>
              </div>
              <div className="text-xs mt-1">
                Document G702, APPLICATION AND CERTIFICATE FOR PAYMENT, containing<br/>
                Contractor's Application for Payment, is attached.
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-black">
                  <th className="border-r border-black p-1 text-xs font-semibold text-left w-8">Item #</th>
                  <th className="border-r border-black p-1 text-xs font-semibold text-left">Description of Work</th>
                  <th className="border-r border-black p-1 text-xs font-semibold text-center w-20">Scheduled Value</th>
                  <th className="border-r border-black p-1 text-xs font-semibold text-center w-20">Work Completed From Previous Applications</th>
                  <th className="border-r border-black p-1 text-xs font-semibold text-center w-20">Work Completed This Period</th>
                  <th className="border-r border-black p-1 text-xs font-semibold text-center w-20">Materials Stored & Used for Current</th>
                  <th className="border-r border-black p-1 text-xs font-semibold text-center w-20">Total Completed and Stored to Date</th>
                  <th className="border-r border-black p-1 text-xs font-semibold text-center w-16">% Complete</th>
                  <th className="border-r border-black p-1 text-xs font-semibold text-center w-20">Balance to Finish</th>
                  <th className="p-1 text-xs font-semibold text-center w-20">Retainage</th>
                </tr>
              </thead>
              <tbody>
                {sovItems.map((item, index) => {
                  const retainage = item.totalCompletedAndStored * (formData.retainagePercentage / 100);
                  const balanceToFinish = item.scheduledValue - item.totalCompletedAndStored;
                  
                  return (
                    <tr key={item.id} className="border-b border-gray-300">
                      <td className="border-r border-black p-1 text-xs text-center">{index + 1}</td>
                      <td className="border-r border-black p-1 text-xs">{item.description}</td>
                      <td className="border-r border-black p-1 text-xs text-right">$ {item.scheduledValue.toLocaleString()}</td>
                      <td className="border-r border-black p-1 text-xs text-right">$ {item.previousApplications.toLocaleString()}</td>
                      <td className="border-r border-black p-1 text-xs">
                        <input
                          type="number"
                          step="0.01"
                          value={item.thisPeriod}
                          onChange={(e) => updateSOVItem(item.id, 'this_period', parseFloat(e.target.value) || 0)}
                          className="w-full text-right print:border-0 print:bg-transparent"
                        />
                      </td>
                      <td className="border-r border-black p-1 text-xs">
                        <input
                          type="number"
                          step="0.01"
                          value={item.materialsStored}
                          onChange={(e) => updateSOVItem(item.id, 'materials_stored', parseFloat(e.target.value) || 0)}
                          className="w-full text-right print:border-0 print:bg-transparent"
                        />
                      </td>
                      <td className="border-r border-black p-1 text-xs text-right">$ {item.totalCompletedAndStored.toLocaleString()}</td>
                      <td className="border-r border-black p-1 text-xs text-center">{item.percentComplete.toFixed(0)}%</td>
                      <td className="border-r border-black p-1 text-xs text-right">$ {balanceToFinish.toLocaleString()}</td>
                      <td className="p-1 text-xs text-right">$ {retainage.toLocaleString()}</td>
                    </tr>
                  );
                })}
                
                {/* Totals Row */}
                <tr className="border-t-2 border-black font-semibold">
                  <td className="border-r border-black p-1 text-xs text-center">Grand Total</td>
                  <td className="border-r border-black p-1 text-xs"></td>
                  <td className="border-r border-black p-1 text-xs text-right">$ {sovItems.reduce((sum, item) => sum + item.scheduledValue, 0).toLocaleString()}</td>
                  <td className="border-r border-black p-1 text-xs text-right">$ {sovItems.reduce((sum, item) => sum + item.previousApplications, 0).toLocaleString()}</td>
                  <td className="border-r border-black p-1 text-xs text-right">$ {sovItems.reduce((sum, item) => sum + item.thisPeriod, 0).toLocaleString()}</td>
                  <td className="border-r border-black p-1 text-xs text-right">$ {sovItems.reduce((sum, item) => sum + item.materialsStored, 0).toLocaleString()}</td>
                  <td className="border-r border-black p-1 text-xs text-right">$ {totals.totalCompletedAndStored.toLocaleString()}</td>
                  <td className="border-r border-black p-1 text-xs text-center">-</td>
                  <td className="border-r border-black p-1 text-xs text-right">$ {totals.balanceToFinish.toLocaleString()}</td>
                  <td className="p-1 text-xs text-right">$ {totals.totalRetainage.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons - Hidden when printing */}
      <div className="flex gap-4 justify-end print:hidden">
        <Button onClick={saveG702Application} disabled={loading}>
          {loading ? 'Saving...' : 'Save Application'}
        </Button>
      </div>
    </div>
  );
}
