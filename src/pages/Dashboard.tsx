
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { FinancialDateFilter } from '@/components/dashboard/FinancialDateFilter';
import { DollarSign, Calendar, Users, Building2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
        totalExpenses: 0, // Would need expenses table
        totalEquipment,
        availableEquipment
      });

      // Get open projects with financial data - include all non-completed projects
      const openProjectsData = projects?.filter(p => 
        p.status === 'Active' || p.status === 'Planning'
      ) || [];

      // Fetch financial data for each project
      const projectsWithFinancials = await Promise.all(
        openProjectsData.map(async (project) => {
          // Get billing data
          const { data: billing } = await supabase
            .from('project_billing')
            .select('billed_amount, paid_amount')
            .eq('project_id', project.id);

          // Get expenses data
          const { data: expenses } = await supabase
            .from('expenses')
            .select('amount, status')
            .eq('project_id', project.id);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Planning': return 'bg-blue-500';
      case 'On Hold': return 'bg-yellow-500';
      case 'Completed': return 'bg-purple-500';
      case 'Closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
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

        {/* Financial Overview - Full Width Row */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Financial Overview</CardTitle>
              <div className="flex gap-2 text-xs">
                <Button variant="outline" size="sm">This Year</Button>
                <Button variant="outline" size="sm">This Month</Button>
                <Button variant="outline" size="sm">Last Month</Button>
                <Button variant="outline" size="sm">Date Range</Button>
                <Button variant="default" size="sm">All Time</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center text-blue-600 mb-2">
                  <DollarSign className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Total Contract Value</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  ${stats.totalRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">All projects combined</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center text-red-600 mb-2">
                  <DollarSign className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Total Expenses</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  ${totalExpensesPaid.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Approved expenses</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center text-purple-600 mb-2">
                  <DollarSign className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Remaining Contract Balance</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  ${remainingContract.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Open projects only</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center text-blue-600 mb-2">
                  <DollarSign className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Total Billed</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  ${totalBilled.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total invoiced amount</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center text-green-600 mb-2">
                  <DollarSign className="w-5 h-5 mr-1" />
                  <span className="text-sm font-medium">Total Received</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ${totalReceived.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Payments received</div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                          <Badge className={`${getStatusColor(project.status)} text-white text-xs`}>
                            {project.status}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {project.client && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Users className="w-4 h-4 mr-2" />
                              <span>{project.client}</span>
                            </div>
                          )}

                          {project.address && (
                            <div className="text-sm text-gray-600 truncate">{project.address}</div>
                          )}

                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>Due: {format(new Date(project.due_date), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-gray-600">{project.completion_percentage}%</span>
                          </div>
                          <Progress value={project.completion_percentage} className="h-2" />
                        </div>

                        {/* Financial Snapshot */}
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <h4 className="text-sm font-semibold text-gray-700">Financial Snapshot</h4>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="text-center">
                              <div className="text-blue-600 font-medium">Contract</div>
                              <div className="font-bold">${project.contract_value.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-green-600 font-medium">Remaining</div>
                              <div className="font-bold">${(project.contract_value - project.totalBilled).toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-600 font-medium">Billed</div>
                              <div className="font-bold">${project.totalBilled.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-green-600 font-medium">Received</div>
                              <div className="font-bold">${project.totalReceived.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-red-600 font-medium">Expenses Paid</div>
                              <div className="font-bold">${project.expensesPaid.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-orange-600 font-medium">Pending</div>
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
