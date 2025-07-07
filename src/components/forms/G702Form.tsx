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
import { G702Builder } from './G702Builder';
import { G702Document } from './G702Document';
import { G703Document } from './G703Document';

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

interface Project {
  id: string;
  name: string;
  contractValue: number;
  originalContractSum: number;
  netChangeOrders: number;
  client: string;
  address: string;
  projectCode: string;
  contingency_type?: string;
  contingency_value?: number;
}

export function G702Form({ projectId, applicationId, onSave }: G702FormProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDocument, setActiveDocument] = useState<'g702' | 'g703' | 'builder'>('builder');
  const [calculatedTotals, setCalculatedTotals] = useState<any>(null);
  
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
    contractorSignatory: '',
    contractorSignature: null,
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
      if (applicationId) {
        fetchExistingApplication();
      } else {
        fetchLastApplicationNumber();
      }
    }
  }, [projectId, applicationId]);

  // Recalculate totals whenever SOV items or form data changes
  useEffect(() => {
    if (sovItems.length > 0) {
      calculateTotals().then(setCalculatedTotals);
    }
  }, [sovItems, formData.applicationNumber, formData.retainagePercentage]);

  const fetchExistingApplication = async () => {
    if (!applicationId) return;
    
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData(prev => ({
          ...prev,
          applicationNumber: data.application_number,
          periodTo: data.period_to,
          contractorName: data.contractor_name || '',
          contractorAddress: data.contractor_address || '',
          projectNumber: data.project_number || '',
          originalContractSum: data.original_contract_sum || 0,
          netChangeOrders: data.net_change_by_change_orders || 0,
          contractorSignature: data.contractor_signature || null
        }));

        // When viewing an existing application, we need to reconstruct the SOV state 
        // at the time of that application
        await reconstructSOVForApplication(data.application_number);
      }
    } catch (error) {
      console.error('Error fetching existing application:', error);
      toast.error('Failed to load existing application');
    }
  };

  const reconstructSOVForApplication = async (appNumber: number) => {
    try {
      // Get the SOV items as they are now
      const { data: currentSOVItems, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', projectId)
        .order('item_number');

      if (error) throw error;

      // Get all applications up to and including this one
      const { data: applicationsUpToThis, error: appError } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', projectId)
        .lte('application_number', appNumber)
        .order('application_number');

      if (appError) throw appError;

      console.log('Reconstructing SOV for application', appNumber);
      console.log('Applications up to this:', applicationsUpToThis?.map(app => app.application_number));

      // For each SOV item, calculate what the state should be for this application
      const reconstructedItems = (currentSOVItems || []).map(item => {
        // Calculate previous applications (all applications before this one)
        const previousApps = applicationsUpToThis?.filter(app => app.application_number < appNumber) || [];
        const currentApp = applicationsUpToThis?.find(app => app.application_number === appNumber);
        
        // For viewing existing applications, we need to show the "this period" work
        // that was done in that specific application
        let thisPeriodWork = 0;
        let previousApplicationsTotal = 0;

        if (appNumber === 1) {
          // For the first application, everything in previous_applications was actually "this period"
          thisPeriodWork = item.previous_applications || 0;
          previousApplicationsTotal = 0;
        } else {
          // For subsequent applications, we need to calculate the difference
          // This is complex without historical data, so we'll approximate
          const totalWorkDone = item.previous_applications || 0;
          const estimatedWorkPerApp = totalWorkDone / appNumber;
          thisPeriodWork = estimatedWorkPerApp;
          previousApplicationsTotal = totalWorkDone - thisPeriodWork;
        }

        return {
          id: item.id,
          itemNumber: item.item_number,
          description: item.description,
          scheduledValue: item.scheduled_value,
          changeOrders: item.change_orders || 0,
          previousApplications: previousApplicationsTotal,
          thisPeriod: thisPeriodWork,
          materialsStored: item.materials_stored || 0,
          totalCompletedAndStored: item.total_completed_and_stored || 0,
          percentComplete: item.percent_complete || 0,
          category: item.category
        };
      });

      setSovItems(reconstructedItems);
    } catch (error) {
      console.error('Error reconstructing SOV for application:', error);
    }
  };

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

      setFormData(prev => ({
        ...prev,
        originalContractSum: data.original_contract_sum || data.contract_value,
        netChangeOrders: data.net_change_orders || 0
      }));
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project data');
    }
  };

  const fetchSOVItems = async () => {
    try {
      console.log('Fetching SOV items for project:', projectId);
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', projectId)
        .order('item_number');

      if (error) {
        console.error('Error fetching SOV items:', error);
        throw error;
      }

      console.log('Raw SOV data from database:', data);

      const mappedItems = (data || []).map(item => {
        console.log(`Processing item ${item.item_number}:`, {
          scheduled_value: item.scheduled_value,
          change_orders: item.change_orders,
          previous_applications: item.previous_applications,
          this_period: item.this_period,
          materials_stored: item.materials_stored
        });
        
        return {
          id: item.id,
          itemNumber: item.item_number,
          description: item.description,
          scheduledValue: Number(item.scheduled_value || 0),
          changeOrders: Number(item.change_orders || 0),
          previousApplications: Number(item.previous_applications || 0),
          thisPeriod: Number(item.this_period || 0),
          materialsStored: Number(item.materials_stored || 0),
          totalCompletedAndStored: Number(item.total_completed_and_stored || 0),
          percentComplete: Number(item.percent_complete || 0),
          category: item.category
        };
      });

      console.log('Mapped SOV items:', mappedItems);
      setSovItems(mappedItems);
      
      // Ensure we have fresh totals after SOV items are loaded
      if (mappedItems.length > 0) {
        const freshTotals = await calculateTotals();
        setCalculatedTotals(freshTotals);
      }
      
      const totalChangeOrders = mappedItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0);
      console.log('Total change orders from SOV items:', totalChangeOrders);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load SOV items');
      setSovItems([]); // Set empty array on error
    }
  };

  const calculateTotals = async () => {
    console.log('Calculating totals for application number:', formData.applicationNumber);
    
    // Get only EXISTING previous applications for this project (excluding current if editing)
    const { data: previousApps, error: prevError } = await supabase
      .from('payment_applications_g702')
      .select('*')
      .eq('project_id', projectId)
      .lt('application_number', formData.applicationNumber);

    if (prevError) {
      console.error('Error fetching previous applications:', prevError);
    }

    console.log('Previous applications found:', previousApps?.length || 0);
    console.log('Previous applications:', previousApps);

    // Calculate from SOV items - include contingency in original contract sum - FIX: Use addition
    const originalContractSum = sovItems.reduce((sum, item) => sum + (item.scheduledValue || 0), 0);
    const contingencyAmount = project?.contingency_type === 'percentage' 
      ? (originalContractSum * (project?.contingency_value || 0)) / 100
      : (project?.contingency_value || 0);
    const contractSumWithContingency = originalContractSum + contingencyAmount;
    const netChangeOrders = sovItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0);
    
    console.log('Calculated totals from SOV:', {
      originalContractSum: contractSumWithContingency,
      contingencyAmount,
      netChangeOrders,
      sovItemsCount: sovItems.length
    });
    
    // Contract Sum to Date = Original Contract Sum (with contingency) + Net Change by Change Orders
    const contractSumToDate = contractSumWithContingency + netChangeOrders;
    
    // Total Completed & Stored to Date = Sum of all SOV item totals for THIS period
    const totalCompletedAndStored = sovItems.reduce((sum, item) => {
      const itemTotal = (item.previousApplications || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
      return sum + itemTotal;
    }, 0);
    
    console.log('Total completed and stored calculation:', totalCompletedAndStored);
    
    // Retainage calculations
    const retainageRate = formData.retainagePercentage / 100;
    const totalRetainage = totalCompletedAndStored * retainageRate;
    
    // Total Earned Less Retainage = Total Completed & Stored to Date - Total Retainage
    const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;
    
    // Less Previous Certificates for Payment = Sum ONLY from existing previous applications
    const lessPreviousPayments = (previousApps || []).reduce((sum, app) => {
      console.log(`Previous app ${app.application_number}: payment = ${app.current_payment_due}`);
      return sum + (app.current_payment_due || 0);
    }, 0);
    
    console.log('Less previous payments total:', lessPreviousPayments);
    
    // Current Payment Due = Total Earned Less Retainage - Less Previous Applications
    const currentPaymentDue = Math.max(totalEarnedLessRetainage - lessPreviousPayments, 0);
    
    // Balance to Finish = Contract Sum to Date - Total Completed & Stored to Date
    const balanceToFinish = contractSumToDate - totalCompletedAndStored;

    const totals = {
      originalContractSum: contractSumWithContingency,
      netChangeOrders,
      contractSumToDate,
      totalCompletedAndStored,
      totalRetainage,
      totalEarnedLessRetainage,
      lessPreviousPayments,
      currentPaymentDue,
      balanceToFinish
    };

    console.log('Final calculated totals:', totals);
    return totals;
  };

  const saveG702Application = async () => {
    if (!project || !calculatedTotals) return;

    try {
      setLoading(true);

      // Recalculate totals to ensure fresh data
      const freshTotals = await calculateTotals();
      console.log('Saving with fresh totals:', freshTotals);

      const applicationData = {
        project_id: projectId,
        application_number: formData.applicationNumber,
        period_to: formData.periodTo,
        contractor_name: formData.contractorName,
        contractor_address: formData.contractorAddress,
        contractor_signature: formData.contractorSignature,
        project_name: project.name,
        project_number: formData.projectNumber || project.projectCode,
        original_contract_sum: freshTotals.originalContractSum,
        net_change_by_change_orders: freshTotals.netChangeOrders,
        contract_sum_to_date: freshTotals.contractSumToDate,
        total_completed_and_stored: freshTotals.totalCompletedAndStored,
        retainage_completed_work: freshTotals.totalRetainage * 0.9,
        retainage_stored_materials: freshTotals.totalRetainage * 0.1,
        total_retainage: freshTotals.totalRetainage,
        total_earned_less_retainage: freshTotals.totalEarnedLessRetainage,
        less_previous_certificates: freshTotals.lessPreviousPayments,
        current_payment_due: freshTotals.currentPaymentDue,
        balance_to_finish: freshTotals.balanceToFinish
      };

      console.log('Application data to save:', applicationData);

      let error;
      if (applicationId) {
        // Update existing application
        const { error: updateError } = await supabase
          .from('payment_applications_g702')
          .update(applicationData)
          .eq('id', applicationId);
        error = updateError;
      } else {
        // Create new application
        const { error: insertError } = await supabase
          .from('payment_applications_g702')
          .insert(applicationData);
        error = insertError;

        // For NEW applications only, update SOV items with cumulative progress
        // This moves "this period" amounts to "previous applications" for future applications
        for (const item of sovItems) {
          if (item.thisPeriod > 0 || item.materialsStored > 0) {
            const newPreviousApplications = item.previousApplications + item.thisPeriod;
            const newTotalCompleted = newPreviousApplications + item.materialsStored;
            const totalContract = item.scheduledValue + item.changeOrders;
            const newPercentComplete = totalContract > 0 ? (newTotalCompleted / totalContract) * 100 : 0;
            
            console.log(`Updating SOV item ${item.itemNumber}:`, {
              oldPrevious: item.previousApplications,
              thisPeriod: item.thisPeriod,
              newPrevious: newPreviousApplications,
              newPercent: newPercentComplete,
              changeOrders: item.changeOrders // Make sure change_orders value is preserved
            });
            
            // CRITICAL: Always preserve change_orders value when updating SOV items
            await supabase
              .from('sov_items')
              .update({
                previous_applications: newPreviousApplications,
                this_period: 0, // Reset this period to 0 for next application
                percent_complete: Math.min(newPercentComplete, 100),
                // Explicitly preserve change_orders - this is crucial!
                change_orders: item.changeOrders
              })
              .eq('id', item.id);
          }
        }
      }

      if (error) throw error;

      toast.success(applicationId ? 'Payment Application updated successfully' : 'Payment Application saved successfully');
      onSave?.();
    } catch (error) {
      console.error('Error saving payment application:', error);
      toast.error('Failed to save payment application');
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return <div className="text-center py-8">Loading project data...</div>;
  }

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

      {/* G702 and G703 Documents: Always in DOM but hide inactive */}
      <div className="relative">
        {/* G702 Document */}
        <div
          id="g702-document"
          aria-hidden={activeDocument !== 'g702'}
          className={
            activeDocument === 'g702'
              ? ''
              : 'sr-only'
          }
          style={activeDocument === 'g702' ? {} : { position: 'absolute', left: 0, top: 0 }}
        >
          {calculatedTotals && (
            <G702Document
              project={project}
              formData={{ ...formData, ...calculatedTotals }}
              companyInfo={{
                name: 'RBF Construction, Inc.',
                address: '1411 W. Hill Rd, Flint, MI 48507',
                phone: '810-938-8498',
                email: ''
              }}
            />
          )}
        </div>
        {/* G703 Document */}
        <div
          id="g703-document"
          aria-hidden={activeDocument !== 'g703'}
          className={
            activeDocument === 'g703'
              ? ''
              : 'sr-only'
          }
          style={activeDocument === 'g703' ? {} : { position: 'absolute', left: 0, top: 0 }}
        >
          <G703Document
            project={project}
            formData={{ ...formData, ...calculatedTotals }}
            sovItems={sovItems}
            companyInfo={{
              name: 'RBF Construction, Inc.',
              address: '1411 W. Hill Rd, Flint, MI 48507',
              phone: '810-938-8498',
              email: ''
            }}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4 justify-end print:hidden">
        <Button onClick={saveG702Application} disabled={loading}>
          {loading ? 'Saving...' : 'Save Application'}
        </Button>
      </div>
    </div>
  );
}
