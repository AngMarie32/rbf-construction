
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Eye, Edit, Download, Search } from 'lucide-react';
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
  architect_date?: string;
  architect_signature?: string;
  balance_to_finish?: number;
  contractor_address?: string;
  contractor_date?: string;
  projects?: {
    name: string;
    client: string;
  };
}

export default function PaymentApplications() {
  const [applications, setApplications] = useState<PaymentApplication[]>([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<PaymentApplication | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchProjects();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select(`
          *,
          projects (
            name,
            client
          )
        `)
        .order('application_number', { ascending: false });

      if (error) throw error;
      
      // Ensure all applications have required fields with defaults
      const processedData = (data || []).map(app => ({
        ...app,
        total_completed_and_stored: app.total_completed_and_stored || 0,
        total_retainage: app.total_retainage || 0
      }));
      
      setApplications(processedData);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load payment applications');
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleViewApplication = (application: PaymentApplication) => {
    setSelectedApplication(application);
    setEditDialogOpen(true);
  };

  const handleApplicationUpdated = () => {
    fetchApplications();
    setEditDialogOpen(false);
    setCreateDialogOpen(false);
    setSelectedApplication(null);
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.projects?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.application_number.toString().includes(searchTerm);
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
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

  return (
    <Layout title="Payment Applications" subtitle="Manage G702/G703 payment applications">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Payment Applications
              </CardTitle>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Application
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Applications</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by project name or application number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App #</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Period To</TableHead>
                  <TableHead>Payment Due</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">#{app.application_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{app.projects?.name}</div>
                        <div className="text-sm text-gray-500">{app.projects?.client}</div>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(app.period_to), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-medium">
                      ${app.current_payment_due?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell>{format(new Date(app.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewApplication(app)}
                        >
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

            {filteredApplications.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No payment applications found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Application Dialog */}
      <G702Dialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId=""
        onSave={handleApplicationUpdated}
      />

      {/* Edit Application Dialog */}
      {selectedApplication && (
        <G702Dialog 
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          projectId={selectedApplication.project_id}
          onSave={handleApplicationUpdated}
        />
      )}
    </Layout>
  );
}
