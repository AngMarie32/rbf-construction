
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { G702Document } from '@/components/forms/G702Document';
import { G703Document } from '@/components/forms/G703Document';
import { SOVTable } from '@/components/forms/sov/SOVTable';
import { exportG702G703ToPDF, exportToPDF } from '@/utils/pdfExport';

export default function PaymentApplicationForm() {
  const { projectId, applicationId } = useParams();
  const navigate = useNavigate();
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
    originalContractSum: 1529940,
    netChangeByChangeOrders: 0,
    contractSumToDate: 1529940,
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
    if (projectId) {
      fetchProjectData();
      fetchSOVItems();
      fetchCompanyInfo();
      if (applicationId) {
        fetchApplicationData();
      } else {
        generateNextApplicationNumber();
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
      setProject(data);
      
      setFormData(prev => ({
        ...prev,
        originalContractSum: 1529940,
        netChangeByChangeOrders: data.net_change_orders || 0,
        contractSumToDate: 1529940 + (data.net_change_orders || 0)
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
    setCompanyInfo({
      name: 'RBF Construction, Inc.',
      address: '1411 W. Hill Rd, Flint, MI 48507',
      phone: '810-938-8498',
      email: ''
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
          architectName: '',
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
    const baseContractSum = 1529940;
    const totalCompleted = sovItems.reduce((sum, item) => sum + (item.thisPeriod || 0) + (item.previousApplications || 0), 0);
    const totalRetainage = totalCompleted * (formData.retainagePercentage / 100);
    const totalEarnedLessRetainage = totalCompleted - totalRetainage;
    const currentPaymentDue = totalEarnedLessRetainage - formData.lessPreviousCertificates;
    const contractSumToDate = baseContractSum + (formData.netChangeByChangeOrders || 0);
    const balanceToFinish = contractSumToDate - totalCompleted;

    return {
      originalContractSum: baseContractSum,
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
        project_name: project?.name || '',
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
      navigate('/payment-apps');
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
      console.log('Starting PDF export from page...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const activeTab = document.querySelector('[data-state="active"][role="tabpanel"]');
      const tabValue = activeTab?.getAttribute('data-value') || 'form';
      
      console.log('Active tab:', tabValue);
      
      if (tabValue === 'sov') {
        const sovElement = document.querySelector('.space-y-4');
        if (!sovElement) {
          throw new Error('Schedule of Values table not found. Please ensure you are on the SOV tab.');
        }
        
        const wrapper = document.createElement('div');
        wrapper.id = 'sov-export-wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.left = '-9999px';
        wrapper.style.background = 'white';
        wrapper.style.padding = '20px';
        wrapper.style.width = '1200px';
        wrapper.innerHTML = `
          <h1 style="text-align: center; margin-bottom: 20px; font-size: 24px; font-weight: bold;">
            Schedule of Values - Application #${formData.applicationNumber}
          </h1>
          <div style="margin-bottom: 20px;">
            <p><strong>Project:</strong> ${project?.name || 'N/A'}</p>
            <p><strong>Period To:</strong> ${new Date(formData.periodTo).toLocaleDateString()}</p>
          </div>
          ${sovElement.outerHTML}
        `;
        
        document.body.appendChild(wrapper);
        
        try {
          await exportToPDF('sov-export-wrapper', `SOV-App-${formData.applicationNumber}.pdf`);
        } finally {
          document.body.removeChild(wrapper);
        }
        
      } else if (tabValue === 'g702') {
        const g702Element = document.getElementById('g702-document');
        if (!g702Element) {
          throw new Error('G702 document not found. Please ensure you are on the G702 tab.');
        }
        await exportToPDF('g702-document', `G702-App-${formData.applicationNumber}.pdf`);
        
      } else if (tabValue === 'g703') {
        const g703Element = document.getElementById('g703-document');
        if (!g703Element) {
          throw new Error('G703 document not found. Please ensure you are on the G703 tab.');
        }
        await exportToPDF('g703-document', `G703-App-${formData.applicationNumber}.pdf`);
        
      } else {
        const g702Element = document.getElementById('g702-document');
        const g703Element = document.getElementById('g703-document');
        
        if (!g702Element || !g703Element) {
          throw new Error('G702/G703 documents not found. Please navigate to the preview tabs first.');
        }
        
        await exportG702G703ToPDF(`G702-G703-App-${formData.applicationNumber}.pdf`);
      }
      
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
    <Layout 
      title={`Payment Application #${formData.applicationNumber}`}
      subtitle={`${applicationId ? 'Edit' : 'Create'} application for ${project?.name || 'Project'}`}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate('/payment-apps')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Applications
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportPDF}
              disabled={exportLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              {exportLoading ? 'Exporting...' : 'Export PDF'}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Application'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="form">Application Form</TabsTrigger>
            <TabsTrigger value="sov">Schedule of Values</TabsTrigger>
            <TabsTrigger value="g702">G702 Preview</TabsTrigger>
            <TabsTrigger value="g703">G703 Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-4" data-value="form">
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

          <TabsContent value="sov" data-value="sov">
            <SOVTable
              sovItems={sovItems}
              setSovItems={setSovItems}
              projectId={projectId!}
              selectedApplication="current"
              onUpdateItem={handleUpdateSOVItem}
            />
          </TabsContent>

          <TabsContent value="g702" data-value="g702">
            <div id="g702-document">
              <G702Document
                project={project}
                formData={{ ...formData, ...totals }}
                companyInfo={companyInfo}
              />
            </div>
          </TabsContent>

          <TabsContent value="g703" data-value="g703">
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
      </div>
    </Layout>
  );
}
