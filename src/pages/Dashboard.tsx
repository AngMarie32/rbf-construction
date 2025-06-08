
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { NewProposalDialog } from '@/components/proposals/NewProposalDialog';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';
import { FinancialDateFilter } from '@/components/dashboard/FinancialDateFilter';
import { DollarSign, Calendar, FileText, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Project } from '@/types';
import { useNavigate } from 'react-router-dom';
import { isWithinInterval, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';

interface DatabaseProject {
  id: string;
  name: string;
  type: string;
  contract_value: number;
  status: string;
  due_date: string | null;
  start_date: string | null;
  completion_percentage: number | null;
  address: string | null;
  project_code: string | null;
  client: string | null;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<any>(null);
  const [financialFilter, setFinancialFilter] = useState<{ type: 'year' | 'month' | 'custom'; value?: string }>({
    type: 'custom'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
    fetchBillingData();
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [financialFilter]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedProjects: Project[] = (data || []).map((dbProject: DatabaseProject) => ({
        id: dbProject.id,
        name: dbProject.name,
        type: dbProject.type,
        contractValue: dbProject.contract_value,
        status: dbProject.status as Project['status'],
        startDate: dbProject.start_date ? new Date(dbProject.start_date) : new Date(),
        dueDate: dbProject.due_date ? new Date(dbProject.due_date) : new Date(),
        completionPercentage: dbProject.completion_percentage || 0,
        address: dbProject.address || '',
        projectCode: dbProject.project_code || '',
        client: dbProject.client || '',
        createdAt: new Date(dbProject.created_at),
        updatedAt: new Date(dbProject.updated_at)
      }));
      
      setProjects(mappedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingData = async () => {
    try {
      let query = supabase
        .from('project_billing')
        .select('billed_amount, paid_amount, remaining_amount, created_at');

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Apply financial filter
      if (financialFilter.type !== 'custom') {
        filteredData = data?.filter(billing => {
          const billingDate = parseISO(billing.created_at);
          
          if (financialFilter.type === 'year') {
            const year = parseInt(financialFilter.value || '');
            const yearStart = startOfYear(new Date(year, 0, 1));
            const yearEnd = endOfYear(new Date(year, 0, 1));
            return isWithinInterval(billingDate, { start: yearStart, end: yearEnd });
          } else if (financialFilter.type === 'month') {
            const [year, month] = (financialFilter.value || '').split('-');
            const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
            const monthEnd = endOfMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
            return isWithinInterval(billingDate, { start: monthStart, end: monthEnd });
          }
          return true;
        }) || [];
      }

      const totals = filteredData.reduce((acc, billing) => ({
        totalBilled: acc.totalBilled + (billing.billed_amount || 0),
        totalReceived: acc.totalReceived + (billing.paid_amount || 0),
        totalOutstanding: acc.totalOutstanding + (billing.remaining_amount || 0)
      }), { totalBilled: 0, totalReceived: 0, totalOutstanding: 0 });

      setBillingData(totals);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      setBillingData({ totalBilled: 0, totalReceived: 0, totalOutstanding: 0 });
    }
  };

  const totalContractValue = projects.reduce((sum, p) => sum + p.contractValue, 0);
  const openProjects = projects.filter(p => p.status !== 'Closed');
  const remainingContractBalance = openProjects.reduce((sum, p) => sum + p.contractValue, 0);

  if (loading) {
    return (
      <Layout title="Company Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Company Dashboard">
      <div className="space-y-6">
        {/* Weather Widget */}
        <div className="grid grid-cols-1 gap-6">
          <WeatherWidget />
        </div>

        {/* Financial Overview with Date Filter */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Financial Overview</CardTitle>
            <FinancialDateFilter 
              currentFilter={financialFilter}
              onFilterChange={setFinancialFilter}
            />
          </CardHeader>
          <CardContent>
            {billingData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Contract Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      ${totalContractValue.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All projects combined
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Remaining Contract Balance</CardTitle>
                    <DollarSign className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      ${remainingContractBalance.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Open projects only
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      ${billingData.totalBilled.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financialFilter.type === 'custom' ? 'Total invoiced amount' : 'Filtered period'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ${billingData.totalReceived.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financialFilter.type === 'custom' ? 'Payments received' : 'Filtered period'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                    <DollarSign className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      ${billingData.totalOutstanding.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financialFilter.type === 'custom' ? 'Amount pending payment' : 'Filtered period'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Open Projects</CardTitle>
            <NewProjectDialog onProjectCreated={fetchProjects} />
          </CardHeader>
          <CardContent>
            {openProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {openProjects.slice(0, 6).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">No open projects found. Create your first project to get started!</p>
                <div className="mt-4">
                  <NewProjectDialog onProjectCreated={fetchProjects} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <NewProposalDialog onProposalCreated={() => {}} 
                trigger={
                  <Button variant="outline" className="h-20 flex flex-col space-y-2">
                    <FileText className="w-6 h-6" />
                    <span className="text-sm">New Proposal</span>
                  </Button>
                }
              />
              <Button 
                variant="outline" 
                className="h-20 flex flex-col space-y-2"
                onClick={() => navigate('/bid-planner')}
              >
                <Calculator className="w-6 h-6" />
                <span className="text-sm">Bid Planner</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col space-y-2"
                onClick={() => navigate('/payment-apps')}
              >
                <DollarSign className="w-6 h-6" />
                <span className="text-sm">Payment App</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col space-y-2"
                onClick={() => navigate('/sov')}
              >
                <Calendar className="w-6 h-6" />
                <span className="text-sm">Schedule</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
