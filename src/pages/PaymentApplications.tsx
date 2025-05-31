
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PaymentApplication {
  id: string;
  applicationNumber: number;
  periodEndDate: Date;
  originalContractSum: number;
  netChanges: number;
  contractSumToDate: number;
  totalCompletedAndStored: number;
  retainage: number;
  totalEarnedLessRetainage: number;
  lessPreviousPayments: number;
  currentPaymentDue: number;
  balanceToFinish: number;
  createdAt: Date;
}

interface Project {
  id: string;
  name: string;
  contractValue: number;
}

export default function PaymentApplications() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [applications, setApplications] = useState<PaymentApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newApplication, setNewApplication] = useState({
    periodEndDate: '',
    totalCompletedAndStored: '',
    retainagePercent: '10'
  });

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
        .select('id, name, contract_value')
        .order('name');

      if (error) throw error;
      setProjects((data || []).map(p => ({
        id: p.id,
        name: p.name,
        contractValue: p.contract_value
      })));
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_applications')
        .select('*')
        .eq('project_id', selectedProject)
        .order('application_number', { ascending: false });

      if (error) throw error;

      const mappedApplications = (data || []).map(app => ({
        id: app.id,
        applicationNumber: app.application_number,
        periodEndDate: new Date(app.period_end_date),
        originalContractSum: app.original_contract_sum,
        netChanges: app.net_changes || 0,
        contractSumToDate: app.contract_sum_to_date || 0,
        totalCompletedAndStored: app.total_completed_and_stored || 0,
        retainage: app.retainage || 0,
        totalEarnedLessRetainage: app.total_earned_less_retainage || 0,
        lessPreviousPayments: app.less_previous_payments || 0,
        currentPaymentDue: app.current_payment_due || 0,
        balanceToFinish: app.balance_to_finish || 0,
        createdAt: new Date(app.created_at)
      }));

      setApplications(mappedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load payment applications');
    } finally {
      setLoading(false);
    }
  };

  const createApplication = async () => {
    if (!selectedProject || !newApplication.periodEndDate || !newApplication.totalCompletedAndStored) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const project = projects.find(p => p.id === selectedProject);
      if (!project) return;

      const totalCompletedAndStored = parseFloat(newApplication.totalCompletedAndStored);
      const retainagePercent = parseFloat(newApplication.retainagePercent) / 100;
      const retainage = totalCompletedAndStored * retainagePercent;
      const totalEarnedLessRetainage = totalCompletedAndStored - retainage;
      
      // Calculate previous payments (sum of all previous applications)
      const lessPreviousPayments = applications.reduce((sum, app) => sum + app.currentPaymentDue, 0);
      const currentPaymentDue = Math.max(0, totalEarnedLessRetainage - lessPreviousPayments);
      const balanceToFinish = project.contractValue - totalCompletedAndStored;
      
      const nextAppNumber = Math.max(0, ...applications.map(a => a.applicationNumber)) + 1;

      const { error } = await supabase
        .from('payment_applications')
        .insert({
          project_id: selectedProject,
          application_number: nextAppNumber,
          period_end_date: newApplication.periodEndDate,
          original_contract_sum: project.contractValue,
          net_changes: 0,
          contract_sum_to_date: project.contractValue,
          total_completed_and_stored: totalCompletedAndStored,
          retainage: retainage,
          total_earned_less_retainage: totalEarnedLessRetainage,
          less_previous_payments: lessPreviousPayments,
          current_payment_due: currentPaymentDue,
          balance_to_finish: balanceToFinish
        });

      if (error) throw error;

      toast.success('Payment application created successfully');
      setShowNewForm(false);
      setNewApplication({ periodEndDate: '', totalCompletedAndStored: '', retainagePercent: '10' });
      fetchApplications();
    } catch (error) {
      console.error('Error creating application:', error);
      toast.error('Failed to create payment application');
    }
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const totalApplicationsValue = applications.reduce((sum, app) => sum + app.currentPaymentDue, 0);

  return (
    <Layout title="Payment Applications" subtitle="Manage project payment applications and billing">
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
                    {project.name} - ${project.contractValue.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProject && (
          <>
            {/* Project Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Contract Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ${selectedProjectData?.contractValue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Billed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${totalApplicationsValue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{applications.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${((selectedProjectData?.contractValue || 0) - totalApplicationsValue).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* New Application Form */}
            {showNewForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Payment Application</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="periodEndDate">Period End Date</Label>
                      <Input
                        id="periodEndDate"
                        type="date"
                        value={newApplication.periodEndDate}
                        onChange={(e) => setNewApplication({ ...newApplication, periodEndDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="totalCompleted">Total Work Completed ($)</Label>
                      <Input
                        id="totalCompleted"
                        type="number"
                        step="0.01"
                        value={newApplication.totalCompletedAndStored}
                        onChange={(e) => setNewApplication({ ...newApplication, totalCompletedAndStored: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="retainage">Retainage (%)</Label>
                      <Input
                        id="retainage"
                        type="number"
                        step="0.1"
                        value={newApplication.retainagePercent}
                        onChange={(e) => setNewApplication({ ...newApplication, retainagePercent: e.target.value })}
                        placeholder="10"
                      />
                    </div>
                    <div className="flex items-end space-x-2">
                      <Button onClick={createApplication} className="flex-1">
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Applications Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Payment Applications</CardTitle>
                <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Application
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading applications...</div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No payment applications found. Create your first application above.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>App #</TableHead>
                          <TableHead>Period End</TableHead>
                          <TableHead>Work Completed</TableHead>
                          <TableHead>Retainage</TableHead>
                          <TableHead>Less Previous</TableHead>
                          <TableHead>Current Due</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">
                              <Badge variant="outline">#{app.applicationNumber}</Badge>
                            </TableCell>
                            <TableCell>{format(app.periodEndDate, 'MMM dd, yyyy')}</TableCell>
                            <TableCell>${app.totalCompletedAndStored.toLocaleString()}</TableCell>
                            <TableCell className="text-red-600">
                              -${app.retainage.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-red-600">
                              -${app.lessPreviousPayments.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-bold text-green-600">
                              ${app.currentPaymentDue.toLocaleString()}
                            </TableCell>
                            <TableCell>{format(app.createdAt, 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <FileText className="w-4 h-4 mr-2" />
                                View
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
          </>
        )}
      </div>
    </Layout>
  );
}
