
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Download, Delete, FileText, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { G702Dialog } from '@/components/forms/G702Dialog';

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
  const [applications, setApplications] = useState<PaymentApplication[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<PaymentApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load payment applications');
    } finally {
      setLoading(false);
    }
  };

  const handleNewApplication = () => {
    setSelectedApplication(null);
    setDialogOpen(true);
  };

  const handleEditApplication = (application: PaymentApplication) => {
    setSelectedApplication(application);
    setDialogOpen(true);
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment application?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_applications_g702')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Payment application deleted successfully');
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
        <Card className="border-2 border-dashed border-green-200 bg-green-50">
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
              <Card className="bg-blue-50 border-blue-200">
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

              <Card className="bg-green-50 border-green-200">
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

              <Card className="bg-orange-50 border-orange-200">
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
            <Card>
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
                      <Card key={app.id} className="border-l-4 border-l-blue-500">
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteApplication(app.id)}
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
    </Layout>
  );
}
