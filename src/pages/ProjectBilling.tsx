
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  DollarSign, 
  Calendar, 
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Bell
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NewBillingDialog } from '@/components/billing/NewBillingDialog';
import { EditBillingDialog } from '@/components/billing/EditBillingDialog';
import { PaymentReminderSettings } from '@/components/billing/PaymentReminderSettings';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
}

interface BillingRecord {
  id: string;
  project_id: string;
  billing_period_start: string;
  billing_period_end: string;
  billed_amount: number;
  paid_amount: number;
  status: string;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
}

interface PaymentApplication {
  id: string;
  project_id: string;
  application_number: number;
  period_end_date: string;
  original_contract_sum: number;
  net_changes: number;
  contract_sum_to_date: number;
  total_completed_and_stored: number;
  retainage: number;
  total_earned_less_retainage: number;
  less_previous_payments: number;
  current_payment_due: number;
  balance_to_finish: number;
  created_at: string;
}

export default function ProjectBilling() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [paymentApplications, setPaymentApplications] = useState<PaymentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [editingBillingId, setEditingBillingId] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchBillingRecords();
      fetchPaymentApplications();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
    }
  };

  const fetchBillingRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_billing')
        .select('*')
        .eq('project_id', projectId)
        .order('billing_period_end', { ascending: false });

      if (error) throw error;
      setBillingRecords(data || []);
    } catch (error) {
      console.error('Error fetching billing records:', error);
      toast.error('Failed to load billing records');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications')
        .select('*')
        .eq('project_id', projectId)
        .order('period_end_date', { ascending: false });

      if (error) throw error;
      setPaymentApplications(data || []);
    } catch (error) {
      console.error('Error fetching payment applications:', error);
      toast.error('Failed to load payment applications');
    }
  };

  const handleBillingCreated = () => {
    fetchBillingRecords();
    setBillingDialogOpen(false);
    toast.success('Billing record created successfully');
  };

  const handleBillingUpdated = () => {
    fetchBillingRecords();
    setEditingBillingId(null);
    toast.success('Billing record updated successfully');
  };

  const handleDeleteBilling = async (id: string) => {
    if (!confirm('Are you sure you want to delete this billing record?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('project_billing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Billing record deleted successfully');
      fetchBillingRecords();
    } catch (error) {
      console.error('Error deleting billing record:', error);
      toast.error('Failed to delete billing record');
    }
  };

  const totalBilled = billingRecords.reduce((sum, record) => sum + record.billed_amount, 0);
  const totalPaid = billingRecords.reduce((sum, record) => sum + record.paid_amount, 0);
  const overdueBalance = billingRecords.filter(record => record.status === 'Overdue').reduce((sum, record) => sum + record.billed_amount, 0);

  return (
    <Layout title="Project Billing" subtitle={`Manage billing for ${project?.name || 'Project'}`}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalBilled.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">All billing records</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">${totalPaid.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Received payments</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Balance</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">${overdueBalance.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Unpaid invoices</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="billing" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="billing">Billing Records</TabsTrigger>
            <TabsTrigger value="payment-apps">Payment Applications</TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="billing" className="space-y-4">
            <div className="flex justify-between items-center">
              <CardTitle>Billing Records</CardTitle>
              <Button onClick={() => setBillingDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Billing Record
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              </div>
            ) : billingRecords.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No billing records yet</h3>
                  <p className="text-gray-600 mb-4">Add your first billing record to get started</p>
                  <Button onClick={() => setBillingDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Billing Record
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Billed Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {format(new Date(record.billing_period_start), 'MMM dd')} - {format(new Date(record.billing_period_end), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ${record.billed_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ${record.paid_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            className={
                              record.status === 'Paid'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : record.status === 'Overdue'
                                ? 'bg-red-100 text-red-800 border-red-200'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }
                          >
                            {record.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingBillingId(record.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 ml-2"
                            onClick={() => handleDeleteBilling(record.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payment-apps" className="space-y-4">
            <div className="flex justify-between items-center">
              <CardTitle>Payment Applications</CardTitle>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Application
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              </div>
            ) : paymentApplications.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment applications yet</h3>
                  <p className="text-gray-600 mb-4">Create your first payment application to get started</p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Payment Application
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Application #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period End
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contract Sum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Payment Due
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentApplications.map((app) => (
                      <tr key={app.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          #{app.application_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {format(new Date(app.period_end_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ${app.contract_sum_to_date?.toLocaleString() || app.original_contract_sum.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ${app.current_payment_due?.toLocaleString() || '0'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            {project && (
              <PaymentReminderSettings 
                projectId={project.id} 
                projectName={project.name}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <NewBillingDialog
          open={billingDialogOpen}
          onOpenChange={setBillingDialogOpen}
          onBillingCreated={handleBillingCreated}
        />

        {editingBillingId && (
          <EditBillingDialog
            billing={billingRecords.find(b => b.id === editingBillingId) || null}
            open={!!editingBillingId}
            onOpenChange={(open) => !open && setEditingBillingId(null)}
            onBillingUpdated={handleBillingUpdated}
          />
        )}
      </div>
    </Layout>
  );
}
