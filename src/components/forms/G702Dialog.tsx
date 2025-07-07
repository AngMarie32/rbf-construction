import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { G702Document } from './G702Document';
import { G703Document } from './G703Document';
import { SOVTable } from './sov/SOVTable';
import { exportG702G703ToPDF } from '@/utils/pdfExport';

interface G702DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  applicationId?: string;
  onSave: () => void;
}

export function G702Dialog({ open, onOpenChange, projectId, applicationId, onSave }: G702DialogProps) {
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [sovItems, setSovItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  const [formData, setFormData] = useState({
    applicationNumber: 1,
    periodTo: new Date().toISOString().split('T')[0],
    architectName: '',
    contractorName: '',
    contractorAddress: '',
    originalContractSum: 0,
    netChangeByChangeOrders: 0,
    contractSumToDate: 0,
    totalCompletedAndStored: 0,
    retainagePercentage: 10,
    totalRetainage: 0,
    totalEarnedLessRetainage: 0,
    lessPreviousCertificates: 0,
    currentPaymentDue: 0,
    balanceToFinish: 0,
    contractorDate: new Date().toISOString().split('T')[0],
    architectDate: '',
    contractorSignature: '',
    architectSignature: ''
  });

  useEffect(() => {
    if (open && projectId) {
      fetchProjectData();
      fetchSOVItems();
      fetchCompanyInfo();
      if (applicationId) {
        fetchApplicationData();
      } else {
        generateNextApplicationNumber();
      }
    }
  }, [open, projectId, applicationId]);

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
      
      setFormData(prev => ({
        ...prev,
        originalContractSum: data.contract_value || 0,
        netChangeByChangeOrders: data.net_change_orders || 0,
        contractSumToDate: (data.contract_value || 0) + (data.net_change_orders || 0)
      }));
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
        category: item.category,
        subcategory: item.subcategory,
        description: item.description,
        scheduledValue: item.scheduled_value,
        changeOrders: item.change_orders || 0,
        previousApplications: item.previous_applications || 0,
        thisPeriod: item.this_period || 0,
        materialsStored: item.materials_stored || 0,
        totalCompletedAndStored: item.total_completed_and_stored || 0,
        percentComplete: item.percent_complete || 0
      }));
      
      setSovItems(mappedItems);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load SOV items');
    }
  };

  const fetchCompanyInfo = async () => {
    // Updated RBF Construction info with correct phone number
    setCompanyInfo({
      name: 'RBF Construction, Inc.',
      address: '1411 W. Hill Rd, Flint, MI 48507',
      phone: '810-938-8498',
      email: '' // Remove email as requested
    });
  };

  const fetchApplicationData = async () => {
    if (!applicationId) return;
    
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (error) throw error;
      
      if (data) {
        setFormData({
          applicationNumber: data.application_number,
          periodTo: data.period_to,
          architectName: '', // This field doesn't exist in the database, so we'll leave it empty
          contractorName: data.contractor_name,
          contractorAddress: data.contractor_address || '',
          originalContractSum: data.original_contract_sum,
          netChangeByChangeOrders: data.net_change_by_change_orders || 0,
          contractSumToDate: data.contract_sum_to_date || 0,
          totalCompletedAndStored: data.total_completed_and_stored || 0,
          retainagePercentage: 10,
          totalRetainage: data.total_retainage || 0,
          totalEarnedLessRetainage: data.total_earned_less_retainage || 0,
          lessPreviousCertificates: data.less_previous_certificates || 0,
          currentPaymentDue: data.current_payment_due || 0,
          balanceToFinish: data.balance_to_finish || 0,
          contractorDate: data.contractor_date || new Date().toISOString().split('T')[0],
          architectDate: data.architect_date || '',
          contractorSignature: data.contractor_signature || '',
          architectSignature: data.architect_signature || ''
        });
      }
    } catch (error) {
      console.error('Error fetching application:', error);
      toast.error('Failed to load application data');
    }
  };

  const generateNextApplicationNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('application_number')
        .eq('project_id', projectId)
        .order('application_number', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      const nextNumber = data && data.length > 0 ? data[0].application_number + 1 : 1;
      setFormData(prev => ({ ...prev, applicationNumber: nextNumber }));
    } catch (error) {
      console.error('Error generating application number:', error);
    }
  };

  const calculateTotals = () => {
    // Include contingency in contract calculations - FIX: Use addition instead of multiplication
    const originalContractSum = formData.originalContractSum || 0;
    const contingencyAmount = project?.contingency_type === 'percentage' 
      ? (originalContractSum * (project?.contingency_value || 0)) / 100
      : (project?.contingency_value || 0);
    const contractSumWithContingency = originalContractSum + contingencyAmount;
    
    const totalCompleted = sovItems.reduce((sum, item) => sum + (item.thisPeriod || 0) + (item.previousApplications || 0), 0);
    const totalRetainage = totalCompleted * (formData.retainagePercentage / 100);
    const totalEarnedLessRetainage = totalCompleted - totalRetainage;
    const currentPaymentDue = totalEarnedLessRetainage - formData.lessPreviousCertificates;
    const contractSumToDate = contractSumWithContingency + (formData.netChangeByChangeOrders || 0);
    const balanceToFinish = contractSumToDate - totalCompleted;

    return {
      originalContractSum: contractSumWithContingency,
      totalCompleted,
      totalRetainage,
      totalEarnedLessRetainage,
      currentPaymentDue,
      balanceToFinish,
      contractSumToDate
    };
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const totals = calculateTotals();
      
      const applicationData = {
        project_id: projectId,
        application_number: formData.applicationNumber,
        period_to: formData.periodTo,
        project_name: project?.name || '', // Add the missing project_name field
        contractor_name: formData.contractorName,
        contractor_address: formData.contractorAddress,
        original_contract_sum: formData.originalContractSum,
        net_change_by_change_orders: formData.netChangeByChangeOrders,
        contract_sum_to_date: formData.contractSumToDate,
        total_completed_and_stored: totals.totalCompleted,
        total_retainage: totals.totalRetainage,
        total_earned_less_retainage: totals.totalEarnedLessRetainage,
        less_previous_certificates: formData.lessPreviousCertificates,
        current_payment_due: totals.currentPaymentDue,
        balance_to_finish: totals.balanceToFinish,
        contractor_date: formData.contractorDate,
        architect_date: formData.architectDate || null,
        contractor_signature: formData.contractorSignature,
        architect_signature: formData.architectSignature
      };

      let result;
      if (applicationId) {
        result = await supabase
          .from('payment_applications_g702')
          .update(applicationData)
          .eq('id', applicationId);
      } else {
        result = await supabase
          .from('payment_applications_g702')
          .insert(applicationData);
      }

      if (result.error) throw result.error;
      
      toast.success('Payment application saved successfully');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving application:', error);
      toast.error('Failed to save payment application');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSOVItem = (itemId: string, value: number) => {
    setSovItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, thisPeriod: value } : item
    ));
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      console.log('Starting PDF export from dialog...');
      
      // Give a moment for any state updates to render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await exportG702G703ToPDF(`G702-G703-App-${formData.applicationNumber}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Please try again'}`);
    } finally {
      setExportLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {applicationId ? 'Edit' : 'Create'} Payment Application #{formData.applicationNumber}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="form">Application Form</TabsTrigger>
            <TabsTrigger value="sov">Schedule of Values</TabsTrigger>
            <TabsTrigger value="g702">G702 Preview</TabsTrigger>
            <TabsTrigger value="g703">G703 Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="applicationNumber">Application Number</Label>
                    <Input
                      id="applicationNumber"
                      type="number"
                      value={formData.applicationNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, applicationNumber: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="periodTo">Period To</Label>
                    <Input
                      id="periodTo"
                      type="date"
                      value={formData.periodTo}
                      onChange={(e) => setFormData(prev => ({ ...prev, periodTo: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Total Completed: ${totals.totalCompleted.toLocaleString()}</div>
                  <div>Total Retainage: ${totals.totalRetainage.toLocaleString()}</div>
                  <div>Total Earned Less Retainage: ${totals.totalEarnedLessRetainage.toLocaleString()}</div>
                  <div className="font-bold">Current Payment Due: ${totals.currentPaymentDue.toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sov">
            <SOVTable
              sovItems={sovItems}
              setSovItems={setSovItems}
              projectId={projectId}
              selectedApplication="current"
              onUpdateItem={handleUpdateSOVItem}
            />
          </TabsContent>

          <TabsContent value="g702">
            <div id="g702-document">
              <G702Document
                project={project}
                formData={{ ...formData, ...totals }}
                companyInfo={companyInfo}
              />
            </div>
          </TabsContent>

          <TabsContent value="g703">
            <div id="g703-document">
              <G703Document
                project={project}
                formData={{ ...formData, ...totals }}
                sovItems={sovItems}
                companyInfo={companyInfo}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={exportLoading}
          >
            {exportLoading ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Application'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
