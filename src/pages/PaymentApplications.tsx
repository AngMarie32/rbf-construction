
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Plus, ArrowLeft, FileText } from 'lucide-react';
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
  const [view, setView] = useState<'overview' | 'project'>('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [paymentApps, setPaymentApps] = useState<PaymentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject && view === 'project') {
      fetchPaymentApplications();
    }
  }, [selectedProject, view]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
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

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setView('project');
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Planning': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout title="Payment Applications" subtitle="Manage project payment applications">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (view === 'project' && selectedProject) {
    const totalApplications = paymentApps.length;
    const totalPaymentsDue = paymentApps.reduce((sum, app) => sum + (app.current_payment_due || 0), 0);
    const totalCompleted = paymentApps.reduce((sum, app) => sum + (app.total_completed_and_stored || 0), 0);
    const latestApplication = paymentApps[0];

    return (
      <Layout title={`Payment Applications - ${selectedProject.name}`} subtitle={`Client: ${selectedProject.client}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setView('overview')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
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
              {paymentApps.length === 0 ? (
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

  // Company Overview
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'Active').length;
  const totalContractValue = projects.reduce((sum, p) => sum + p.contract_value, 0);
  const avgCompletion = projects.length > 0 
    ? projects.reduce((sum, p) => sum + p.completion_percentage, 0) / projects.length 
    : 0;

  return (
    <Layout title="Payment Applications" subtitle="Company overview and project management">
      <div className="space-y-6">
        {/* Company Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-sm text-gray-600">Total Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{activeProjects}</div>
              <p className="text-sm text-gray-600">Active Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">${totalContractValue.toLocaleString()}</div>
              <p className="text-sm text-gray-600">Total Contract Value</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{avgCompletion.toFixed(1)}%</div>
              <p className="text-sm text-gray-600">Average Completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>Projects with Payment Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contract Value</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.client}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${project.contract_value.toLocaleString()}</TableCell>
                      <TableCell>{project.completion_percentage}%</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleProjectSelect(project)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
