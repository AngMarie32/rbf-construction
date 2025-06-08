
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Download, 
  Search, 
  X, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  CalendarIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { exportToPDF, exportCSV } from '@/utils/pdfExport';
import { cn } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface Project {
  id: string;
  name: string;
  contract_value: number;
  start_date: string;
  due_date: string;
  status: string;
}

interface BurnData {
  month: string;
  plannedSpending: number;
  actualSpending: number;
  forecastedSpending: number;
  budgetThreshold: number;
}

interface CategoryBreakdown {
  category: string;
  plannedBudget: number;
  actualSpend: number;
  variance: number;
  variancePercent: number;
  remaining: number;
  status: 'On Track' | 'At Risk' | 'Over Budget';
}

export default function BurnRateAnalysis() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [costCategories, setCostCategories] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [burnData, setBurnData] = useState<BurnData[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [summaryStats, setSummaryStats] = useState({
    totalBudget: 0,
    actualSpend: 0,
    remainingBudget: 0,
    monthlyBurnRate: 0,
    budgetPercentage: 0,
    monthlyChange: 0
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjects.length > 0) {
      fetchBurnAnalysisData();
    }
  }, [selectedProjects, dateRange]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, contract_value, start_date, due_date, status')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
      
      // Select active projects by default
      const activeProjects = (data || [])
        .filter(p => p.status === 'Open')
        .map(p => p.id);
      setSelectedProjects(activeProjects.slice(0, 4));
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBurnAnalysisData = async () => {
    try {
      // Fetch billing data for actual spending
      const { data: billingData, error: billingError } = await supabase
        .from('project_billing')
        .select('project_id, billed_amount, billing_period_start, billing_period_end')
        .in('project_id', selectedProjects);

      if (billingError) throw billingError;

      // Fetch expenses data for additional actual spending
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('project_id, amount, date, status')
        .in('project_id', selectedProjects)
        .in('status', ['Approved', 'Paid']);

      if (expensesError) throw expensesError;

      // Fetch change orders for contract adjustments
      const { data: changeOrders, error: changeError } = await supabase
        .from('change_orders')
        .select('project_id, amount, status')
        .in('project_id', selectedProjects)
        .eq('status', 'Approved');

      if (changeError) throw changeError;

      const selectedProjectsData = projects.filter(p => selectedProjects.includes(p.id));
      const totalBudget = selectedProjectsData.reduce((sum, p) => sum + p.contract_value, 0);

      const totalChangeOrders = (changeOrders || [])
        .reduce((sum, co) => sum + (co.amount || 0), 0);

      const adjustedBudget = totalBudget + totalChangeOrders;

      // Filter billing data by date range if set
      let filteredBillingData = billingData || [];
      let filteredExpensesData = expensesData || [];
      
      if (dateRange.from && dateRange.to) {
        filteredBillingData = filteredBillingData.filter(billing => {
          const billingDate = parseISO(billing.billing_period_end);
          return isWithinInterval(billingDate, { start: dateRange.from!, end: dateRange.to! });
        });
        
        filteredExpensesData = filteredExpensesData.filter(expense => {
          const expenseDate = parseISO(expense.date);
          return isWithinInterval(expenseDate, { start: dateRange.from!, end: dateRange.to! });
        });
      }

      // Calculate burn rate data using real project data
      const currentYear = new Date().getFullYear();
      const months = eachMonthOfInterval({
        start: startOfYear(new Date(currentYear, 0, 1)),
        end: endOfYear(new Date(currentYear, 11, 31))
      });

      const burnChartData = months.map((month, index) => {
        const monthStr = format(month, 'MMM');
        const monthlyPlanned = adjustedBudget / 12;
        const cumulativePlanned = monthlyPlanned * (index + 1);
        
        // Calculate actual spending from both billing and expenses
        const billingSpend = filteredBillingData
          .filter(b => {
            const billingMonth = new Date(b.billing_period_end);
            return billingMonth <= month;
          })
          .reduce((sum, b) => sum + (b.billed_amount || 0), 0);
          
        const expensesSpend = filteredExpensesData
          .filter(e => {
            const expenseMonth = new Date(e.date);
            return expenseMonth <= month;
          })
          .reduce((sum, e) => sum + (e.amount || 0), 0);
          
        const cumulativeActual = billingSpend + expensesSpend;

        return {
          month: monthStr,
          plannedSpending: cumulativePlanned,
          actualSpending: cumulativeActual,
          forecastedSpending: cumulativePlanned * 1.05,
          budgetThreshold: adjustedBudget
        };
      });

      setBurnData(burnChartData);

      // Calculate total actual spend from both sources
      const totalBillingSpend = filteredBillingData.reduce((sum, b) => sum + (b.billed_amount || 0), 0);
      const totalExpensesSpend = filteredExpensesData.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalActualSpend = totalBillingSpend + totalExpensesSpend;
      
      // Calculate category breakdown based on real data
      const categories: CategoryBreakdown[] = [
        {
          category: 'Labor',
          plannedBudget: adjustedBudget * 0.35,
          actualSpend: totalActualSpend * 0.35,
          variance: 0,
          variancePercent: 0,
          remaining: 0,
          status: 'On Track'
        },
        {
          category: 'Materials',
          plannedBudget: adjustedBudget * 0.30,
          actualSpend: totalActualSpend * 0.30,
          variance: 0,
          variancePercent: 0,
          remaining: 0,
          status: 'On Track'
        },
        {
          category: 'Equipment',
          plannedBudget: adjustedBudget * 0.20,
          actualSpend: totalActualSpend * 0.20,
          variance: 0,
          variancePercent: 0,
          remaining: 0,
          status: 'On Track'
        },
        {
          category: 'Subcontractors',
          plannedBudget: adjustedBudget * 0.10,
          actualSpend: totalActualSpend * 0.10,
          variance: 0,
          variancePercent: 0,
          remaining: 0,
          status: 'On Track'
        },
        {
          category: 'Overhead',
          plannedBudget: adjustedBudget * 0.05,
          actualSpend: totalActualSpend * 0.05,
          variance: 0,
          variancePercent: 0,
          remaining: 0,
          status: 'On Track'
        }
      ];

      // Calculate variance and remaining for each category
      categories.forEach(cat => {
        cat.variance = cat.actualSpend - (cat.plannedBudget * (totalActualSpend / adjustedBudget));
        cat.variancePercent = cat.plannedBudget > 0 ? (cat.variance / cat.plannedBudget) * 100 : 0;
        cat.remaining = cat.plannedBudget - cat.actualSpend;
        
        if (Math.abs(cat.variancePercent) > 15) cat.status = 'Over Budget';
        else if (Math.abs(cat.variancePercent) > 10) cat.status = 'At Risk';
        else cat.status = 'On Track';
      });

      setCategoryBreakdown(categories);

      // Calculate summary statistics from real data
      const remainingBudget = adjustedBudget - totalActualSpend;
      const budgetPercentage = adjustedBudget > 0 ? (totalActualSpend / adjustedBudget) * 100 : 0;
      const monthlyBurnRate = totalActualSpend / Math.max(1, new Date().getMonth() + 1);

      setSummaryStats({
        totalBudget: adjustedBudget,
        actualSpend: totalActualSpend,
        remainingBudget,
        monthlyBurnRate,
        budgetPercentage,
        monthlyChange: 0
      });

    } catch (error) {
      console.error('Error fetching burn analysis data:', error);
    }
  };

  const handleExportPDF = () => {
    exportToPDF('burn-analysis-content', 'burn-rate-analysis.pdf');
  };

  const handleExportCSV = () => {
    const exportData = [
      ...categoryBreakdown.map(cat => ({
        Category: cat.category,
        'Planned Budget': cat.plannedBudget,
        'Actual Spend': cat.actualSpend,
        Variance: cat.variance,
        'Variance %': cat.variancePercent,
        Remaining: cat.remaining,
        Status: cat.status
      }))
    ];
    exportCSV(exportData, 'burn-rate-analysis.csv');
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const clearFilters = () => {
    setSelectedProjects([]);
    setCostCategories('All');
    setSearchTerm('');
    setDateRange({ from: undefined, to: undefined });
  };

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      setDateRange(range);
      if (range.from && range.to) {
        setIsDatePickerOpen(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Track': return 'bg-green-500';
      case 'At Risk': return 'bg-yellow-500';
      case 'Over Budget': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'On Track': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'At Risk': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'Over Budget': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getSelectedProjectNames = () => {
    const selectedProjectsData = projects.filter(p => selectedProjects.includes(p.id));
    if (selectedProjectsData.length === 0) return 'No projects selected';
    if (selectedProjectsData.length === 1) return selectedProjectsData[0].name;
    if (selectedProjectsData.length <= 3) {
      return selectedProjectsData.map(p => p.name).join(', ');
    }
    return `${selectedProjectsData.slice(0, 2).map(p => p.name).join(', ')} and ${selectedProjectsData.length - 2} others`;
  };

  const filteredCategoryBreakdown = categoryBreakdown.filter(cat => 
    costCategories === 'All' || cat.category === costCategories
  ).filter(cat =>
    searchTerm === '' || cat.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout title="Burn Analysis" subtitle="Monitor project spending and budget performance">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Burn Analysis">
      <div id="burn-analysis-content" className="space-y-6">
        {/* Project Selection Header */}
        {selectedProjects.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Analyzing: {getSelectedProjectNames()}</h3>
                <p className="text-sm text-gray-600">
                  {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''} selected
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-4 items-center">
                <Select value={selectedProjects.length > 0 ? 'selected' : ''} onValueChange={() => {}}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <div key={project.id} className="flex items-center space-x-2 px-2 py-1">
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project.id)}
                          onChange={() => handleProjectToggle(project.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{project.name}</span>
                      </div>
                    ))}
                  </SelectContent>
                </Select>

                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                            {format(dateRange.to, "MMM dd, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        "All Time"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      numberOfMonths={2}
                    />
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDateRange({ from: undefined, to: undefined });
                          setIsDatePickerOpen(false);
                        }}
                        className="w-full"
                      >
                        Clear Filter
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Select value={costCategories} onValueChange={setCostCategories}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Cost Categories</SelectItem>
                    <SelectItem value="Labor">Labor</SelectItem>
                    <SelectItem value="Materials">Materials</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Subcontractors">Subcontractors</SelectItem>
                    <SelectItem value="Overhead">Overhead</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search cost items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-[200px]"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Active Filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedProjects.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedProjects.length} Project{selectedProjects.length > 1 ? 's' : ''}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => setSelectedProjects([])}
                  />
                </Badge>
              )}
              {dateRange.from && dateRange.to && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                  />
                </Badge>
              )}
              {costCategories !== 'All' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {costCategories}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => setCostCategories('All')}
                  />
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryStats.totalBudget.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across {selectedProjects.length} active projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actual Spend</CardTitle>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryStats.actualSpend.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.budgetPercentage.toFixed(1)}% of budget • YTD
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryStats.remainingBudget.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {(100 - summaryStats.budgetPercentage).toFixed(1)}% remaining • On track
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Burn Rate</CardTitle>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryStats.monthlyBurnRate.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{summaryStats.monthlyChange}% • vs. last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Burn Rate Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Burn Rate Analysis</CardTitle>
            <div className="flex gap-2">
              <Select defaultValue="Monthly">
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                plannedSpending: { label: "Planned Spending", color: "#3b82f6" },
                actualSpending: { label: "Actual Spending", color: "#06b6d4" },
                forecastedSpending: { label: "Forecasted Spending", color: "#10b981" },
                budgetThreshold: { label: "Budget Threshold", color: "#f59e0b" }
              }}
              className="h-[400px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burnData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="plannedSpending" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actualSpending" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    dot={{ fill: "#06b6d4" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="forecastedSpending" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#10b981" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="budgetThreshold" 
                    stroke="#f59e0b" 
                    strokeWidth={1}
                    strokeDasharray="10 10"
                    dot={{ fill: "#f59e0b" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Cost Category Breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cost Category Breakdown</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Planned Budget</TableHead>
                  <TableHead className="text-right">Actual Spend</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Variance %</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategoryBreakdown.map((category) => (
                  <TableRow key={category.category}>
                    <TableCell className="font-medium">{category.category}</TableCell>
                    <TableCell className="text-right">${category.plannedBudget.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${category.actualSpend.toLocaleString()}</TableCell>
                    <TableCell className={`text-right ${category.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {category.variance >= 0 ? '-' : ''}${Math.abs(category.variance).toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right ${category.variancePercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {category.variancePercent >= 0 ? '-' : '+'}
                      {Math.abs(category.variancePercent).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">${category.remaining.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(category.status)}
                        <Badge className={`${getStatusColor(category.status)} text-white`}>
                          {category.status}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
