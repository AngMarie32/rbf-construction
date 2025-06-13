
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Download, DollarSign, Trash2, Building2, CreditCard, Calendar, CheckCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { G702Dialog } from '@/components/forms/G702Dialog';
import { exportToPDF } from '@/utils/pdfExport';

export default function PaymentApplications() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [paymentApps, setPaymentApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [g702DialogOpen, setG702DialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchPaymentApplications();
    } else {
      setPaymentApps([]);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentApplications = async () => {
    try {
      // Fetch from the G702 specific table
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', selectedProject)
        .order('application_number', { ascending: false });

      if (error) throw error;
      setPaymentApps(data || []);
    } catch (error) {
      console.error('Error fetching payment applications:', error);
      toast.error('Failed to load payment applications');
    }
  };

  const handleDeleteApplication = async (appId: string, applicationNumber: number) => {
    try {
      const { error } = await supabase
        .from('payment_applications_g702')
        .delete()
        .eq('id', appId);

      if (error) throw error;

      toast.success(`Application #${applicationNumber} deleted successfully`);
      fetchPaymentApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Failed to delete application');
    }
  };

  const handleNewApplication = () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    setG702DialogOpen(true);
  };

  const handleCreateFirstApplication = () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    setG702DialogOpen(true);
  };

  const handleExportG702G703 = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    
    if (paymentApps.length === 0) {
      toast.error('No payment applications found to export');
      return;
    }
    
    setG702DialogOpen(true);
  };

  const handleViewApplication = (appId: string) => {
    // For now, we'll open the G702 dialog in view mode
    setG702DialogOpen(true);
  };

  const handleExportApplication = async (app: any) => {
    try {
      // Create a temporary element with the application data for export
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-export';
      tempDiv.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h1>Payment Application #${app.application_number}</h1>
          <p><strong>Period Ending:</strong> ${format(new Date(app.period_to), 'MMM dd, yyyy')}</p>
          <p><strong>Contract Sum:</strong> $${(app.contract_sum_to_date || 0).toLocaleString()}</p>
          <p><strong>Work Completed:</strong> $${(app.total_completed_and_stored || 0).toLocaleString()}</p>
          <p><strong>Less Retainage:</strong> $${(app.total_retainage || 0).toLocaleString()}</p>
          <p><strong>Payment Due:</strong> $${(app.current_payment_due || 0).toLocaleString()}</p>
        </div>
      `;
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);
      
      await exportToPDF('temp-export', `payment-application-${app.application_number}.pdf`);
      document.body.removeChild(tempDiv);
      
      toast.success('Payment application exported successfully');
    } catch (error) {
      console.error('Error exporting application:', error);
      toast.error('Failed to export payment application');
    }
  };

  const handleApplicationSaved = () => {
    fetchPaymentApplications();
    toast.success('Payment application saved successfully');
  };

  if (loading) {
    return (
      <Layout title="Payment Applications" subtitle="Manage G702/G703 payment applications">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const totalApplicationValue = paymentApps.reduce((sum, app) => sum + (app.current_payment_due || 0), 0);
  const latestApplication = paymentApps[0];

  return (
    <Layout title="Payment Applications" subtitle="Streamline billing with G702/G703 forms">
      <div className="space-y-8">
        {/* Project Selection */}
        <Card className="border-2 border-dashed border-success/20 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-success" />
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full max-w-md bg-background">
                <SelectValue placeholder="Choose a project to view payment applications" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{project.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {project.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProject && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Total Applications</CardTitle>
                  <FileText className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800">{paymentApps.length}</div>
                  <p className="text-xs text-blue-600 mt-1">Payment applications submitted</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Total Requested</CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-800">${totalApplicationValue.toLocaleString()}</div>
                  <p className="text-xs text-green-600 mt-1">Cumulative payment requests</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">Latest Application</CardTitle>
                  <Calendar className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-800">
                    #{latestApplication?.application_number || 'N/A'}
                  </div>
                  <p className="text-xs text-orange-600 mt-1">
                    {latestApplication ? format(new Date(latestApplication.period_to), 'MMM dd, yyyy') : 'No applications'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Applications
              </h3>
              <div className="flex gap-3">
                <Button onClick={handleNewApplication} className="bg-success hover:bg-success/90">
                  <Plus className="w-4 h-4 mr-2" />
                  New Application
                </Button>
                <Button variant="outline" onClick={handleExportG702G703}>
                  <Download className="w-4 h-4 mr-2" />
                  Export G702/G703
                </Button>
              </div>
            </div>

            {/* Payment Applications List */}
            <Card>
              <CardContent>
                {paymentApps.length > 0 ? (
                  <div className="space-y-4">
                    {paymentApps.map((app) => (
                      <div key={app.id} className="flex justify-between items-center p-6 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge variant="outline" className="font-mono text-base px-3 py-1">
                              Application #{app.application_number}
                            </Badge>
                            <Badge className="bg-success text-white flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Period Ending: {format(new Date(app.period_to), 'MMM dd, yyyy')}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-3 text-sm">
                            <div className="space-y-1">
                              <span className="text-muted-foreground text-xs uppercase tracking-wide">Contract Sum</span>
                              <div className="font-semibold text-base">${(app.contract_sum_to_date || 0).toLocaleString()}</div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-muted-foreground text-xs uppercase tracking-wide">Work Completed</span>
                              <div className="font-semibold text-base text-green-600">${(app.total_completed_and_stored || 0).toLocaleString()}</div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-muted-foreground text-xs uppercase tracking-wide">Less Retainage</span>
                              <div className="font-semibold text-base text-orange-600">${(app.total_retainage || 0).toLocaleString()}</div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-muted-foreground text-xs uppercase tracking-wide">Payment Due</span>
                              <div className="font-semibold text-lg text-primary">${(app.current_payment_due || 0).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-6">
                          <Button variant="outline" size="sm" onClick={() => handleViewApplication(app.id)}>
                            <FileText className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleExportApplication(app)}>
                            <Download className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Payment Application</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete Application #{app.application_number}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteApplication(app.id, app.application_number)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <CreditCard className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">No Payment Applications Found</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      Create your first payment application to start billing for completed work and maintain professional payment records.
                    </p>
                    <Button onClick={handleCreateFirstApplication} className="bg-success hover:bg-success/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Application
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedProject && (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-16">
              <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Payment Applications (G702/G703)</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Select a project above to create and manage payment applications using industry-standard G702/G703 forms.
              </p>
              {projects.length === 0 && (
                <div className="mt-6">
                  <p className="text-gray-400 mb-4">No projects found. Create a project first to get started.</p>
                  <Button onClick={() => navigate('/projects')} variant="outline">
                    Go to Projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* G702/G703 Form Dialog */}
        <G702Dialog
          open={g702DialogOpen}
          onOpenChange={setG702DialogOpen}
          projectId={selectedProject}
          onSave={handleApplicationSaved}
        />
      </div>
    </Layout>
  );
}
