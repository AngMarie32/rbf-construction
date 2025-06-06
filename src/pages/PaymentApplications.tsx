
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProjectSelector } from '@/components/layout/ProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Eye, Plus, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  contract_value: number;
  completion_percentage: number;
}

interface PaymentApplication {
  id: string;
  application_number: number;
  period_end_date: string;
  original_contract_sum: number;
  total_completed_and_stored: number;
  current_payment_due: number;
  created_at: string;
}

export default function PaymentApplications() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [paymentApps, setPaymentApps] = useState<PaymentApplication[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      fetchPaymentApplications();
    }
  }, [selectedProject]);

  const fetchPaymentApplications = async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_applications')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('application_number', { ascending: false });

      if (error) throw error;
      setPaymentApps(data || []);
    } catch (error) {
      console.error('Error fetching payment applications:', error);
      toast.error('Failed to load payment applications');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId && projectId !== 'all-projects') {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) throw error;
        setSelectedProject(data);
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error('Failed to load project details');
      }
    } else {
      setSelectedProject(null);
    }
  };

  if (selectedProject) {
    const totalApplications = paymentApps.length;
    const totalPaymentsDue = paymentApps.reduce((sum, app) => sum + (app.current_payment_due || 0), 0);
    const latestApplication = paymentApps[0];

    return (
      <Layout title={`Payment Applications - ${selectedProject.name}`} subtitle={`Client: ${selectedProject.client}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setSelectedProject(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Project Selection
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Payment Application
            </Button>
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{totalApplications}</div>
                <p className="text-sm text-gray-600">Total Applications</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">${totalPaymentsDue.toLocaleString()}</div>
                <p className="text-sm text-gray-600">Total Payments Due</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">${selectedProject.contract_value.toLocaleString()}</div>
                <p className="text-sm text-gray-600">Contract Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {latestApplication ? `#${latestApplication.application_number}` : 'N/A'}
                </div>
                <p className="text-sm text-gray-600">Latest Application</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : paymentApps.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-4">No payment applications found for this project.</p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Payment Application
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application #</TableHead>
                        <TableHead>Period End Date</TableHead>
                        <TableHead>Contract Sum</TableHead>
                        <TableHead>Work Completed</TableHead>
                        <TableHead>Payment Due</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentApps.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">#{app.application_number}</TableCell>
                          <TableCell>{new Date(app.period_end_date).toLocaleDateString()}</TableCell>
                          <TableCell>${app.original_contract_sum.toLocaleString()}</TableCell>
                          <TableCell>${(app.total_completed_and_stored || 0).toLocaleString()}</TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${(app.current_payment_due || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Payment Applications" subtitle="Select a project to view its payment applications">
      <div className="space-y-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Payment Applications</CardTitle>
            <p className="text-gray-600">Select a project to manage its payment applications</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              placeholder="Choose a project to continue..."
              className="w-full"
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
