
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, FileText, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PaymentApplication {
  id: string;
  project_id: string;
  application_number: number;
  period_end_date: string;
  original_contract_sum: number;
  net_changes: number | null;
  contract_sum_to_date: number | null;
  total_completed_and_stored: number | null;
  retainage: number | null;
  total_earned_less_retainage: number | null;
  less_previous_payments: number | null;
  current_payment_due: number | null;
  balance_to_finish: number | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function PaymentApplications() {
  const [applications, setApplications] = useState<PaymentApplication[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
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
        .from('payment_applications')
        .select('*')
        .eq('project_id', selectedProject)
        .order('application_number', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching payment applications:', error);
      toast.error('Failed to load payment applications');
    } finally {
      setLoading(false);
    }
  };

  const getLatestApplication = () => {
    if (applications.length === 0) return null;
    return applications[0];
  };

  const latestApp = getLatestApplication();

  return (
    <Layout 
      title="Payment Applications" 
      subtitle="Create and manage payment applications for your projects"
    >
      <div className="space-y-6">
        {/* Project Selection and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Application
            </Button>
          </div>
        </div>

        {/* Current Application Summary */}
        {latestApp && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Application #{latestApp.application_number} Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Period End Date</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(latestApp.period_end_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contract Sum to Date</p>
                  <p className="text-lg font-semibold">
                    ${(latestApp.contract_sum_to_date || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Completed & Stored</p>
                  <p className="text-lg font-semibold">
                    ${(latestApp.total_completed_and_stored || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Payment Due</p>
                  <p className="text-lg font-semibold text-green-600">
                    ${(latestApp.current_payment_due || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Applications History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Payment Applications History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>App #</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead className="text-right">Original Contract</TableHead>
                      <TableHead className="text-right">Net Changes</TableHead>
                      <TableHead className="text-right">Contract Sum</TableHead>
                      <TableHead className="text-right">Total Complete</TableHead>
                      <TableHead className="text-right">Retainage</TableHead>
                      <TableHead className="text-right">Payment Due</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">#{app.application_number}</TableCell>
                        <TableCell>{format(new Date(app.period_end_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="text-right">${app.original_contract_sum.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(app.net_changes || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(app.contract_sum_to_date || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(app.total_completed_and_stored || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(app.retainage || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          ${(app.current_payment_due || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">${(app.balance_to_finish || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {applications.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No payment applications found for this project.</p>
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Application
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
