import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Download, Delete, FileText, DollarSign, Calendar, HelpCircle, CheckSquare, Upload, FileSignature } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { G702Dialog } from '@/components/forms/G702Dialog';
import { SendForSignatureButton } from '@/components/esign/SendForSignatureButton';
import { LienWaiverDialog } from '@/components/payment-applications/LienWaiverDialog';
import { LienWaiverTracker } from '@/components/payment-applications/LienWaiverTracker';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

interface PaymentApplication {
  id: string;
  project_id: string;
  application_number: number;
  period_to: string;
  original_contract_sum: number;
  net_change_by_change_orders: number;
  contract_sum_to_date: number;
  total_completed_and_stored?: number;
  total_retainage?: number;
  current_payment_due: number;
  created_at: string;
  payment_status?: string;
  paid_at?: string | null;
  projects?: {
    name: string;
    client: string;
  };
}

interface Project {
  id: string;
  name: string;
  status: string;
}

export default function PaymentApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<PaymentApplication[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<PaymentApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [waiverApp, setWaiverApp] = useState<PaymentApplication | null>(null);
  const [trackerApp, setTrackerApp] = useState<PaymentApplication | null>(null);
  const [waiverSummaries, setWaiverSummaries] = useState<Record<string, { received: number; total: number; allCleared: boolean }>>({});

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchApplications();
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
      
      // Select first project by default
      if (data && data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchApplications = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select(`
          *,
          projects (
            name,
            client
          )
        `)
        .eq('project_id', selectedProject)
        .order('application_number', { ascending: false });

      if (error) throw error;
      
      setApplications(data || []);
      // Fetch waiver summary for all apps in one query
      const ids = (data || []).map((a: any) => a.id);
      if (ids.length) {
        const { data: wRows } = await supabase
          .from('payment_app_lien_waivers')
          .select('payment_app_id, status')
          .in('payment_app_id', ids);
        const summary: Record<string, { received: number; total: number; allCleared: boolean }> = {};
        ids.forEach(id => { summary[id] = { received: 0, total: 0, allCleared: false }; });
        ((wRows as any[]) || []).forEach(r => {
          const s = summary[r.payment_app_id];
          s.total += 1;
          if (r.status === 'received' || r.status === 'waived') s.received += 1;
        });
        Object.values(summary).forEach(s => { s.allCleared = s.total > 0 && s.received === s.total; });
        setWaiverSummaries(summary);
      } else {
        setWaiverSummaries({});
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load payment applications');
    } finally {
      setLoading(false);
    }
  };

  const handleNewApplication = () => {
    if (selectedProject) {
      navigate(`/payment-applications/create/${selectedProject}`);
    }
  };

  const handleEditApplication = (application: PaymentApplication) => {
    navigate(`/payment-applications/edit/${selectedProject}/${application.id}`);
  };

  const handleDeleteApplication = async (id: string, applicationNumber: number) => {
    if (!confirm('Are you sure you want to delete this payment application? This will also reset SOV progress for this application.')) {
      return;
    }

    try {
      // Get the application to delete
      const { data: appToDelete, error: fetchError } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Get all applications for this project with higher application numbers
      const { data: laterApps, error: laterAppsError } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', selectedProject)
        .gt('application_number', applicationNumber);

      if (laterAppsError) throw laterAppsError;

      if (laterApps && laterApps.length > 0) {
        toast.error('Cannot delete this application. Please delete applications in reverse order (delete newer applications first).');
        return;
      }

      // Get SOV items for this project
      const { data: sovItems, error: sovError } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', selectedProject);

      if (sovError) throw sovError;

      // Get previous applications to recalculate SOV item state
      const { data: previousApps, error: prevError } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', selectedProject)
        .lt('application_number', applicationNumber)
        .order('application_number', { ascending: true });

      if (prevError) throw prevError;

      console.log('Recalculating SOV items for applications:', previousApps?.map(app => app.application_number));

      // For each SOV item, recalculate its state based on remaining applications
      for (const item of sovItems || []) {
        let cumulativePreviousApplications = 0;
        
        // Sum up all the "this_period" amounts from remaining applications
        // Note: We don't have historical "this_period" data, so we need to reconstruct it
        // For now, we'll reset to the state before this application
        
        // If this is application #1 being deleted, reset everything to 0
        if (applicationNumber === 1) {
          await supabase
            .from('sov_items')
            .update({
              previous_applications: 0,
              this_period: 0,
              percent_complete: 0,
              // Preserve change_orders and other fields
              change_orders: item.change_orders
            })
            .eq('id', item.id);
        } else {
          // For applications > 1, we need to recalculate based on remaining applications
          // This is complex without historical data, so for now we'll approximate
          // by reducing the previous_applications by the amount that was likely added in this application
          
          const estimatedThisPeriodAmount = Math.max(0, 
            (item.previous_applications || 0) - (previousApps?.length > 0 ? item.previous_applications / previousApps.length : 0)
          );
          
          const newPreviousApplications = Math.max(0, (item.previous_applications || 0) - estimatedThisPeriodAmount);
          const totalContract = (item.scheduled_value || 0) + (item.change_orders || 0);
          const newPercentComplete = totalContract > 0 ? (newPreviousApplications / totalContract) * 100 : 0;
          
          await supabase
            .from('sov_items')
            .update({
              previous_applications: newPreviousApplications,
              this_period: 0,
              percent_complete: Math.min(newPercentComplete, 100),
              // Preserve change_orders and other fields
              change_orders: item.change_orders
            })
            .eq('id', item.id);
        }
      }

      // Delete the application
      const { error: deleteError } = await supabase
        .from('payment_applications_g702')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      toast.success('Payment application deleted and SOV progress reset successfully');
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Failed to delete payment application');
    }
  };

  const handleApplicationSaved = () => {
    fetchApplications();
    setDialogOpen(false);
    setSelectedApplication(null);
  };

  const handleMarkPaid = async (app: PaymentApplication) => {
    const summary = waiverSummaries[app.id];
    if (!summary || !summary.allCleared) {
      toast.error('Cannot mark paid: all lien waivers must be received first.');
      return;
    }
    const { error } = await supabase
      .from('payment_applications_g702')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', app.id);
    if (error) return toast.error(error.message);
    toast.success(`Application #${app.application_number} marked as paid`);
    fetchApplications();
  };

  const handleMarkUnpaid = async (app: PaymentApplication) => {
    const { error } = await supabase
      .from('payment_applications_g702')
      .update({ payment_status: 'unpaid', paid_at: null })
      .eq('id', app.id);
    if (error) return toast.error(error.message);
    fetchApplications();
  };

  // Calculate stats
  const totalApplications = applications.length;
  const totalRequested = applications.reduce((sum, app) => sum + (app.current_payment_due || 0), 0);
  const latestApplication = applications[0];

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  if (loading && !selectedProject) {
    return (
      <Layout title="Payment Applications" subtitle="Streamline billing with G702/G703 forms">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Payment Applications" subtitle="Streamline billing with G702/G703 forms">
      <div className="space-y-6">
        {/* Project Selection */}
        <Card className="bg-white border border-green-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <FileText className="w-5 h-5" />
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <span>{project.name}</span>
                      <Badge variant="outline" className="text-xs">
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
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border border-blue-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Applications</p>
                      <p className="text-2xl font-bold text-blue-900">{totalApplications}</p>
                      <p className="text-xs text-blue-500">Payment applications submitted</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-green-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Total Requested</p>
                      <p className="text-2xl font-bold text-green-900">${totalRequested.toLocaleString()}</p>
                      <p className="text-xs text-green-500">Cumulative payment requests</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-orange-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Latest Application</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {latestApplication ? `#${latestApplication.application_number}` : 'None'}
                      </p>
                      <p className="text-xs text-orange-500">
                        {latestApplication ? format(new Date(latestApplication.period_to), 'MMM dd, yyyy') : 'No applications'}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Applications */}
            <Card className="bg-white">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Payment Applications
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={handleNewApplication} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      New Application
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export G702/G703
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {applications.length > 0 ? (
                  <div className="space-y-4 p-6">
                    {applications.map((app) => (
                      <Card key={app.id} className="bg-white border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <h3 className="font-semibold text-lg">Application #{app.application_number}</h3>
                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                  Period Ending: {format(new Date(app.period_to), 'MMM dd, yyyy')}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">CONTRACT SUM</p>
                                  <p className="font-semibold text-lg">${app.original_contract_sum.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">WORK COMPLETED</p>
                                  <p className="font-semibold text-lg text-green-600">${(app.total_completed_and_stored || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">LESS RETAINAGE</p>
                                  <p className="font-semibold text-lg text-red-600">${(app.total_retainage || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">PAYMENT DUE</p>
                                  <p className="font-semibold text-lg text-blue-600">${app.current_payment_due.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditApplication(app)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Export
                              </Button>
                              <SendForSignatureButton
                                source="invoice"
                                sourceId={app.id}
                                projectId={app.project_id}
                                title={`Payment Application #${app.application_number} – ${app.projects?.name || ''}`.trim()}
                                company={app.projects?.client}
                                paymentAppNumber={app.application_number}
                                documentType="Payment Application"
                                variant="outline"
                                size="sm"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setWaiverApp(app)}
                                title="Generate lien waiver"
                              >
                                <FileSignature className="w-4 h-4 mr-1" />
                                Lien Waiver
                              </Button>
                              {(() => {
                                const s = waiverSummaries[app.id] || { received: 0, total: 0, allCleared: false };
                                return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTrackerApp(app)}
                                    title="Track lien waivers"
                                  >
                                    <ShieldAlert className={`w-4 h-4 mr-1 ${s.total === 0 ? 'text-muted-foreground' : s.allCleared ? 'text-emerald-600' : 'text-yellow-600'}`} />
                                    Waivers {s.total > 0 ? `(${s.received}/${s.total})` : ''}
                                  </Button>
                                );
                              })()}
                              {app.payment_status === 'paid' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkUnpaid(app)}
                                  className="text-emerald-700 border-emerald-300"
                                  title={app.paid_at ? `Paid on ${format(new Date(app.paid_at), 'MMM d, yyyy')}` : 'Paid'}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> Paid
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkPaid(app)}
                                  disabled={!(waiverSummaries[app.id]?.allCleared)}
                                  title={(waiverSummaries[app.id]?.allCleared)
                                    ? 'Mark this application as paid'
                                    : 'All lien waivers must be received before marking paid'}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Paid
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteApplication(app.id, app.application_number)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Delete className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No payment applications found for this project.</p>
                    <Button onClick={handleNewApplication} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Application
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Start Guide */}
            <Card className="bg-white border border-green-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <HelpCircle className="w-5 h-5" />
                  Quick Start Guide - Payment Applications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="w-4 h-4 text-green-600" />
                      <h4 className="font-semibold text-green-800">1. Set Up SOV</h4>
                    </div>
                    <p className="text-sm text-green-700">Create a Schedule of Values (SOV) for your project with line items and values.</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="w-4 h-4 text-green-600" />
                      <h4 className="font-semibold text-green-800">2. Create Application</h4>
                    </div>
                    <p className="text-sm text-green-700">Generate G702/G703 payment applications based on work completed for each period.</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="w-4 h-4 text-green-600" />
                      <h4 className="font-semibold text-green-800">3. Submit & Track</h4>
                    </div>
                    <p className="text-sm text-green-700">Export professional PDF forms and track payment status throughout the project.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* G702 Dialog */}
      <G702Dialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={selectedProject}
        applicationId={selectedApplication?.id}
        onSave={handleApplicationSaved}
      />

      {waiverApp && (
        <LienWaiverDialog
          open={!!waiverApp}
          onOpenChange={(v) => !v && setWaiverApp(null)}
          paymentApp={{
            id: waiverApp.id,
            application_number: waiverApp.application_number,
            project_id: waiverApp.project_id,
            period_to: waiverApp.period_to,
            current_payment_due: waiverApp.current_payment_due,
            project_name: waiverApp.projects?.name,
            client: waiverApp.projects?.client,
          }}
        />
      )}

      {trackerApp && (
        <LienWaiverTracker
          open={!!trackerApp}
          onOpenChange={(v) => !v && setTrackerApp(null)}
          paymentApp={{ id: trackerApp.id, application_number: trackerApp.application_number }}
          onChanged={fetchApplications}
        />
      )}
    </Layout>
  );
}
