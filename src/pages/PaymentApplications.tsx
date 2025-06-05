
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Download, DollarSign } from 'lucide-react';
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
    <Layout title="Payment Applications" subtitle="Manage G702/G703 payment applications">
      <div className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a project to view payment applications" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.status})
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                  <FileText className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {paymentApps.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Payment applications submitted
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${totalApplicationValue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cumulative payment requests
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Latest Application</CardTitle>
                  <FileText className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    #{latestApplication?.application_number || 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {latestApplication ? format(new Date(latestApplication.period_to), 'MMM dd, yyyy') : 'No applications'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Payment Applications</h3>
              <div className="flex gap-2">
                <Button onClick={handleNewApplication}>
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
                      <div key={app.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">Application #{app.application_number}</h4>
                            <Badge variant="outline">
                              Period Ending: {format(new Date(app.period_to), 'MMM dd, yyyy')}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                            <div>
                              <span className="text-gray-500">Contract Sum:</span>
                              <div className="font-medium">${(app.contract_sum_to_date || 0).toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Work Completed:</span>
                              <div className="font-medium">${(app.total_completed_and_stored || 0).toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Less Retainage:</span>
                              <div className="font-medium">${(app.total_retainage || 0).toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Payment Due:</span>
                              <div className="font-medium text-green-600">${(app.current_payment_due || 0).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewApplication(app.id)}>
                            <FileText className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleExportApplication(app)}>
                            <Download className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg">No payment applications found for this project.</p>
                    <p className="text-gray-400 mt-2">Create your first payment application to get started.</p>
                    <Button className="mt-4" onClick={handleCreateFirstApplication}>
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
          <Card>
            <CardContent className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Applications (G702/G703)</h3>
              <p className="text-gray-500 mb-6">
                Select a project above to view and manage payment applications.
              </p>
              {projects.length === 0 && (
                <div className="mt-4">
                  <p className="text-gray-400 mb-4">No projects found. Create a project first.</p>
                  <Button onClick={() => navigate('/projects')}>
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
