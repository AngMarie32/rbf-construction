
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar, 
  DollarSign,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { G702Dialog } from '@/components/forms/G702Dialog';
import { format } from 'date-fns';

interface PaymentApplication {
  id: string;
  project_id: string;
  application_number: number;
  period_to: string;
  application_date: string;
  total_completed_and_stored: number;
  status: string;
  projects: {
    name: string;
  };
}

export default function PaymentApplications() {
  const [applications, setApplications] = useState<PaymentApplication[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [selectedProject, statusFilter]);

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
      let query = supabase
        .from('g702_applications')
        .select(`
          *,
          projects (name)
        `)
        .order('created_at', { ascending: false });

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load payment applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-500';
      case 'Submitted': return 'bg-blue-500';
      case 'Under Review': return 'bg-yellow-500';
      case 'Approved': return 'bg-green-500';
      case 'Rejected': return 'bg-red-500';
      case 'Paid': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredApplications = applications.filter(app =>
    app.projects?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.application_number.toString().includes(searchTerm)
  );

  if (loading) {
    return (
      <Layout title="Payment Applications" subtitle="Manage AIA G702/G703 payment applications">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Payment Applications" subtitle="Manage AIA G702/G703 payment applications">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {applications.filter(app => app.status === 'Under Review').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {applications.filter(app => app.status === 'Approved').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${applications
                  .reduce((sum, app) => sum + app.total_completed_and_stored, 0)
                  .toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
              <div className="flex gap-4 flex-1 flex-wrap">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Application
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>APPLICATION #</TableHead>
                  <TableHead>PROJECT</TableHead>
                  <TableHead>PERIOD TO</TableHead>
                  <TableHead>APPLICATION DATE</TableHead>
                  <TableHead>AMOUNT</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      #{application.application_number}
                    </TableCell>
                    <TableCell>{application.projects?.name}</TableCell>
                    <TableCell>
                      {format(new Date(application.period_to), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(application.application_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${application.total_completed_and_stored.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(application.status)} text-white`}>
                        {application.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredApplications.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment applications found</h3>
                <p className="text-gray-500 mb-6">Create your first payment application to get started.</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Application
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Lightbulb className="w-5 h-5" />
              Payment Application Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 mb-1">Create Application</h4>
                  <p className="text-sm text-green-700">Start a new G702/G703 payment application for your project.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 mb-1">Complete Details</h4>
                  <p className="text-sm text-green-700">Fill in work completed, stored materials, and previous payments.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 mb-1">Submit & Track</h4>
                  <p className="text-sm text-green-700">Submit for approval and track payment status through completion.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Best Practices
              </h5>
              <ul className="text-sm text-green-700 space-y-1">
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  Ensure your Schedule of Values (SOV) is current before creating applications
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  Include supporting documentation for stored materials
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  Review all calculations before submitting to avoid delays
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  Submit applications on schedule to maintain project cash flow
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <G702Dialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onApplicationCreated={fetchApplications}
        />
      </div>
    </Layout>
  );
}
