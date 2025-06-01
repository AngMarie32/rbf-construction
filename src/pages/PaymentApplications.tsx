
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, Download, Eye } from 'lucide-react';
import { G702Form } from '@/components/forms/G702Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentApplication {
  id: string;
  applicationNumber: number;
  periodTo: string;
  contractorName: string;
  projectName: string;
  originalContractSum: number;
  totalCompletedAndStored: number;
  currentPaymentDue: number;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

export default function PaymentApplications() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [applications, setApplications] = useState<PaymentApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [newApplicationOpen, setNewApplicationOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
    
    // Check URL parameters for auto-generation
    const urlParams = new URLSearchParams(window.location.search);
    const projectParam = urlParams.get('project');
    const actionParam = urlParams.get('action');
    
    if (projectParam && actionParam === 'generate') {
      setSelectedProject(projectParam);
      setNewApplicationOpen(true);
    }
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
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', selectedProject)
        .order('application_number', { ascending: false });

      if (error) throw error;

      const mappedApplications = (data || []).map(app => ({
        id: app.id,
        applicationNumber: app.application_number,
        periodTo: app.period_to,
        contractorName: app.contractor_name,
        projectName: app.project_name,
        originalContractSum: app.original_contract_sum,
        totalCompletedAndStored: app.total_completed_and_stored || 0,
        currentPaymentDue: app.current_payment_due || 0,
        createdAt: app.created_at
      }));

      setApplications(mappedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load payment applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationSaved = () => {
    setNewApplicationOpen(false);
    fetchApplications();
    
    // Clear URL parameters
    window.history.replaceState({}, '', '/payment-apps');
  };

  const getStatusBadge = (amount: number) => {
    if (amount > 0) {
      return <Badge className="bg-green-100 text-green-800">Pending Payment</Badge>;
    }
    return <Badge variant="secondary">Paid</Badge>;
  };

  const totalApplicationsValue = applications.reduce((sum, app) => sum + app.currentPaymentDue, 0);
  const pendingPayments = applications.filter(app => app.currentPaymentDue > 0).length;

  return (
    <Layout title="Payment Applications" subtitle="Generate and manage G702/G703 payment applications">
      <div className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
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
                <CardHeader>
                  <CardTitle>Total Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{applications.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{pendingPayments}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Applied Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    ${totalApplicationsValue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Applications Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Payment Applications (G702/G703)</CardTitle>
                <Dialog open={newApplicationOpen} onOpenChange={setNewApplicationOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Application
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Generate G702/G703 Payment Application</DialogTitle>
                    </DialogHeader>
                    <G702Form projectId={selectedProject} onSave={handleApplicationSaved} />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading payment applications...</div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No payment applications found. Create your first G702/G703 application.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>App #</TableHead>
                          <TableHead>Period To</TableHead>
                          <TableHead>Contractor</TableHead>
                          <TableHead>Contract Sum</TableHead>
                          <TableHead>Work Completed</TableHead>
                          <TableHead>Payment Due</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">#{app.applicationNumber}</TableCell>
                            <TableCell>{new Date(app.periodTo).toLocaleDateString()}</TableCell>
                            <TableCell>{app.contractorName}</TableCell>
                            <TableCell>${app.originalContractSum.toLocaleString()}</TableCell>
                            <TableCell>${app.totalCompletedAndStored.toLocaleString()}</TableCell>
                            <TableCell className="font-medium">
                              ${app.currentPaymentDue.toLocaleString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(app.currentPaymentDue)}</TableCell>
                            <TableCell>{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
