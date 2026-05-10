
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { FinancialDateFilter } from '@/components/dashboard/FinancialDateFilter';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalRevenue: number;
  totalExpenses: number;
  totalEquipment: number;
  availableEquipment: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  contract_value: number;
  completion_percentage: number;
  due_date: string;
  client: string;
  address: string;
  totalBilled: number;
  totalReceived: number;
  expensesPaid: number;
  pendingExpenses: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    totalEquipment: 0,
    availableEquipment: 0
  });
  const [openProjects, setOpenProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ 
    from: undefined, 
    to: undefined 
  });
  const [financialFilter, setFinancialFilter] = useState<{ 
    type: 'year' | 'month' | 'custom' | 'range'; 
    value?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ type: 'year', value: new Date().getFullYear().toString() });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, financialFilter]);

  const fetchDashboardData = async () => {
    try {
      // Fetch projects stats
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, status, contract_value, name, completion_percentage, due_date, client, address');

      if (projectsError) throw projectsError;

      // Fetch equipment stats
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('id, status');

      if (equipmentError) throw equipmentError;

      // Calculate stats
      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter(p => p.status === 'Active').length || 0;
      const totalRevenue = projects?.reduce((sum, p) => sum + (p.contract_value || 0), 0) || 0;
      
      const totalEquipment = equipment?.length || 0;
      const availableEquipment = equipment?.filter(e => e.status === 'Available').length || 0;

      setStats({
        totalProjects,
        activeProjects,
        totalRevenue,
        totalExpenses: 0,
        totalEquipment,
        availableEquipment
      });

      // Get open projects - all projects except Completed and Closed
      const openProjectsData = projects?.filter(p => 
        p.status !== 'Completed' && p.status !== 'Closed'
      ) || [];

      // Fetch financial data for each project with date filtering
      const projectsWithFinancials = await Promise.all(
        openProjectsData.map(async (project) => {
          // Build date filter based on financialFilter
          let billingQuery = supabase
            .from('project_billing')
            .select('billed_amount, paid_amount')
            .eq('project_id', project.id);

          let expenseQuery = supabase
            .from('expenses')
            .select('amount, status, date')
            .eq('project_id', project.id);

          // Apply date filtering if applicable
          if (financialFilter.type === 'year' && financialFilter.value) {
            const year = financialFilter.value;
            billingQuery = billingQuery.gte('billing_period_start', `${year}-01-01`).lte('billing_period_end', `${year}-12-31`);
            expenseQuery = expenseQuery.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
          } else if (financialFilter.type === 'month' && financialFilter.value) {
            const [year, month] = financialFilter.value.split('-');
            const startDate = `${year}-${month}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const endDate = `${year}-${month}-${lastDay}`;
            billingQuery = billingQuery.gte('billing_period_start', startDate).lte('billing_period_end', endDate);
            expenseQuery = expenseQuery.gte('date', startDate).lte('date', endDate);
          } else if (financialFilter.type === 'range' && financialFilter.startDate && financialFilter.endDate) {
            const startDate = financialFilter.startDate.toISOString().split('T')[0];
            const endDate = financialFilter.endDate.toISOString().split('T')[0];
            billingQuery = billingQuery.gte('billing_period_start', startDate).lte('billing_period_end', endDate);
            expenseQuery = expenseQuery.gte('date', startDate).lte('date', endDate);
          }

          const { data: billing } = await billingQuery;
          const { data: expenses } = await expenseQuery;

          const totalBilled = billing?.reduce((sum, bill) => sum + bill.billed_amount, 0) || 0;
          const totalReceived = billing?.reduce((sum, bill) => sum + bill.paid_amount, 0) || 0;
          
          const expensesPaid = expenses
            ?.filter(exp => exp.status === 'Approved' || exp.status === 'Paid')
            .reduce((sum, exp) => sum + exp.amount, 0) || 0;
          
          const pendingExpenses = expenses
            ?.filter(exp => exp.status === 'Pending Field Approval' || exp.status === 'Pending Office Approval')
            .reduce((sum, exp) => sum + exp.amount, 0) || 0;

          return {
            ...project,
            totalBilled,
            totalReceived,
            expensesPaid,
            pendingExpenses
          };
        })
      );

      setOpenProjects(projectsWithFinancials);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
  };

  const handleFinancialFilterChange = (filter: { 
    type: 'year' | 'month' | 'custom' | 'range'; 
    value?: string;
    startDate?: Date;
    endDate?: Date;
  }) => {
    setFinancialFilter(filter);
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-600';
      case 'Planning': return 'text-blue-600';
      case 'On Hold': return 'text-yellow-600';
      case 'Completed': return 'text-purple-600';
      case 'Closed': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const totalBilled = openProjects.reduce((sum, p) => sum + p.totalBilled, 0);
  const totalReceived = openProjects.reduce((sum, p) => sum + p.totalReceived, 0);
  const totalExpensesPaid = openProjects.reduce((sum, p) => sum + p.expensesPaid, 0);
  const remainingContract = stats.totalRevenue - totalBilled;
  const outstandingAmount = totalBilled - totalReceived;

  return (
    <Layout title="Company Dashboard">
      <div className="space-y-6">
        {/* Date Filters */}
        <div className="flex flex-wrap gap-4">
          <DateFilter 
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange} 
          />
          <FinancialDateFilter 
            currentFilter={financialFilter}
            onFilterChange={handleFinancialFilterChange} 
          />
        </div>

        {/* Open Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Open Projects</CardTitle>
              <Button onClick={() => navigate('/projects')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading projects...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openProjects.map((project) => (
                  <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/projects/${project.id}`)}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{project.name}</h3>
                          <span className={`text-sm font-medium ${getStatusTextColor(project.status)}`}>
                            {project.status}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {project.client && (
                            <div className="text-sm text-muted-foreground">{project.client}</div>
                          )}

                          {project.address && (
                            <div className="text-sm text-muted-foreground truncate">{project.address}</div>
                          )}

                          <div className="text-sm text-muted-foreground">
                            Due: {format(new Date(project.due_date), 'MMM dd, yyyy')}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-muted-foreground">{project.completion_percentage}%</span>
                          </div>
                          <Progress value={project.completion_percentage} className="h-2" />
                        </div>

                        {/* Financial Snapshot */}
                        <div className="bg-muted/50 dark:bg-secondary/50 rounded-lg p-3 space-y-2 border border-border/50">
                          <h4 className="text-sm font-semibold text-muted-foreground">Financial Snapshot</h4>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="text-center">
                              <div className="text-primary font-medium">Contract</div>
                              <div className="font-bold">${project.contract_value.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-success font-medium">Remaining</div>
                              <div className="font-bold">${(project.contract_value - project.totalBilled).toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-primary font-medium">Billed</div>
                              <div className="font-bold">${project.totalBilled.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-success font-medium">Received</div>
                              <div className="font-bold">${project.totalReceived.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-destructive font-medium">Expenses Paid</div>
                              <div className="font-bold">${project.expensesPaid.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-accent font-medium">Pending</div>
                              <div className="font-bold">${project.pendingExpenses.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
