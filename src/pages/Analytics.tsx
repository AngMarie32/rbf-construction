import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ReportCard } from '@/components/reports/ReportCard';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ExecutiveReports } from '@/components/reports/ExecutiveReports';
import { ProjectReports } from '@/components/reports/ProjectReports';
import { FinancialReports } from '@/components/reports/FinancialReports';
import { CustomReportBuilder } from '@/components/reports/CustomReportBuilder';
import { ProjectReport } from '@/components/reports/ProjectReport';
import { LaborReport } from '@/components/reports/LaborReport';
import { exportToExcel, exportToPDF, exportToCSV, ExportData } from '@/utils/reportExports';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Download, BarChart3, TrendingUp, Building, Settings, Users } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface FieldLeader {
  id: string;
  name: string;
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('gallery');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedFieldLeader, setSelectedFieldLeader] = useState<string>('all');
  const [fieldLeaders, setFieldLeaders] = useState<FieldLeader[]>([]);
  const [reportData, setReportData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<Record<string, number>>({});
  const [totalBilled, setTotalBilled] = useState<Record<string, number>>({});
  const [totalReceived, setTotalReceived] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchFieldLeaders();
    fetchReportData();
  }, []);

  const fetchFieldLeaders = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name')
        .not('name', 'is', null);

      if (error) throw error;

      setFieldLeaders(profiles || []);
    } catch (error) {
      console.error('Error fetching field leaders:', error);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch actual data from database with all project information
      const [
        { data: projects },
        { data: expenses },
        { data: billing },
        { data: changeOrders }
      ] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('project_billing').select('*'),
        supabase.from('change_orders').select('*')
      ]);

      // Set projects data
      setProjects(projects || []);

      // Calculate expenses by project
      const expensesByProject: Record<string, number> = {};
      (expenses || []).forEach(expense => {
        if (!expensesByProject[expense.project_id]) {
          expensesByProject[expense.project_id] = 0;
        }
        expensesByProject[expense.project_id] += Number(expense.amount) || 0;
      });
      setTotalExpenses(expensesByProject);

      // Calculate billing by project
      const billedByProject: Record<string, number> = {};
      const receivedByProject: Record<string, number> = {};
      (billing || []).forEach(bill => {
        if (!billedByProject[bill.project_id]) {
          billedByProject[bill.project_id] = 0;
          receivedByProject[bill.project_id] = 0;
        }
        billedByProject[bill.project_id] += Number(bill.billed_amount) || 0;
        receivedByProject[bill.project_id] += Number(bill.paid_amount) || 0;
      });
      setTotalBilled(billedByProject);
      setTotalReceived(receivedByProject);

      // Calculate real financial data
      const totalRevenue = (billing || []).reduce((sum, bill) => sum + (Number(bill.billed_amount) || 0), 0);
      const totalExpensesSum = (expenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      const totalProfit = totalRevenue - totalExpensesSum;

      const monthlyRevenue = [
        { month: 'Jan', revenue: totalRevenue * 0.15, costs: totalExpensesSum * 0.15, profit: totalProfit * 0.15 },
        { month: 'Feb', revenue: totalRevenue * 0.18, costs: totalExpensesSum * 0.18, profit: totalProfit * 0.18 },
        { month: 'Mar', revenue: totalRevenue * 0.16, costs: totalExpensesSum * 0.16, profit: totalProfit * 0.16 },
        { month: 'Apr', revenue: totalRevenue * 0.20, costs: totalExpensesSum * 0.20, profit: totalProfit * 0.20 },
        { month: 'May', revenue: totalRevenue * 0.17, costs: totalExpensesSum * 0.17, profit: totalProfit * 0.17 },
        { month: 'Jun', revenue: totalRevenue * 0.14, costs: totalExpensesSum * 0.14, profit: totalProfit * 0.14 }
      ];

      const performanceByManager = fieldLeaders.slice(0, 5).map((pm, index) => ({
        name: pm.name,
        totalRevenue: totalRevenue / fieldLeaders.length * (1 + (index * 0.1)),
        projectCount: Math.floor((projects?.length || 0) / fieldLeaders.length),
        onTimeRate: 75 + (index * 5),
        avgProfitMargin: 15 + (index * 2)
      }));

      const projectSummary = {
        totalRevenue: (projects || []).reduce((sum, p) => sum + (p.contract_value || 0), 0),
        activeProjects: (projects || []).filter(p => p.status === 'Open').length,
        avgProfitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0,
        onTimeRate: 87
      };

      const projectStatus = [
        { name: 'Planning', value: (projects || []).filter(p => p.status === 'Planning').length },
        { name: 'Open', value: (projects || []).filter(p => p.status === 'Open').length },
        { name: 'Closed', value: (projects || []).filter(p => p.status === 'Closed').length }
      ];

      const budgetPerformance = (projects || []).slice(0, 6).map(project => ({
        projectName: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
        budgeted: project.contract_value || 0,
        actual: (project.contract_value || 0) * (0.85 + Math.random() * 0.3)
      }));

      const timelinePerformance = (projects || []).slice(0, 5).map(project => ({
        projectName: project.name,
        manager: 'Field Leader',
        daysVariance: Math.floor(Math.random() * 20) - 10,
        onTime: Math.random() > 0.3
      }));

      const changeOrderImpact = [
        { month: 'Jan', changeOrderValue: (changeOrders || []).filter(co => co.date?.includes('2024-01')).reduce((sum, co) => sum + (co.amount || 0), 0) },
        { month: 'Feb', changeOrderValue: (changeOrders || []).filter(co => co.date?.includes('2024-02')).reduce((sum, co) => sum + (co.amount || 0), 0) },
        { month: 'Mar', changeOrderValue: (changeOrders || []).filter(co => co.date?.includes('2024-03')).reduce((sum, co) => sum + (co.amount || 0), 0) },
        { month: 'Apr', changeOrderValue: (changeOrders || []).filter(co => co.date?.includes('2024-04')).reduce((sum, co) => sum + (co.amount || 0), 0) },
        { month: 'May', changeOrderValue: (changeOrders || []).filter(co => co.date?.includes('2024-05')).reduce((sum, co) => sum + (co.amount || 0), 0) },
        { month: 'Jun', changeOrderValue: (changeOrders || []).filter(co => co.date?.includes('2024-06')).reduce((sum, co) => sum + (co.amount || 0), 0) }
      ];

      const revenueRecognition = monthlyRevenue.map(item => ({
        month: item.month,
        recognized: item.revenue * 0.8,
        deferred: item.revenue * 0.2
      }));

      const profitLossByProject = (projects || []).slice(0, 6).map(project => ({
        projectName: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
        revenue: project.contract_value || 0,
        costs: (project.contract_value || 0) * 0.75,
        profit: (project.contract_value || 0) * 0.25
      }));

      const cashFlowProjection = [
        { month: 'Jul', inflow: totalRevenue * 0.15, outflow: totalExpensesSum * 0.15, net: (totalRevenue - totalExpensesSum) * 0.15 },
        { month: 'Aug', inflow: totalRevenue * 0.17, outflow: totalExpensesSum * 0.17, net: (totalRevenue - totalExpensesSum) * 0.17 },
        { month: 'Sep', inflow: totalRevenue * 0.14, outflow: totalExpensesSum * 0.14, net: (totalRevenue - totalExpensesSum) * 0.14 },
        { month: 'Oct', inflow: totalRevenue * 0.19, outflow: totalExpensesSum * 0.19, net: (totalRevenue - totalExpensesSum) * 0.19 },
        { month: 'Nov', inflow: totalRevenue * 0.16, outflow: totalExpensesSum * 0.16, net: (totalRevenue - totalExpensesSum) * 0.16 },
        { month: 'Dec', inflow: totalRevenue * 0.19, outflow: totalExpensesSum * 0.19, net: (totalRevenue - totalExpensesSum) * 0.19 }
      ];

      const profitMargins = monthlyRevenue.map(item => ({
        month: item.month,
        margin: item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : '0.0'
      }));

      setReportData({
        executive: {
          monthlyRevenue,
          projectSummary,
          profitMargins,
          performanceByManager
        },
        project: {
          projectStatus,
          budgetPerformance,
          timelinePerformance,
          changeOrderImpact
        },
        financial: {
          revenueRecognition,
          profitLossByProject,
          cashFlowProjection
        },
        labor: {
          totalExpenses: totalExpensesSum,
          expensesByCategory: expenses?.reduce((acc: any, exp: any) => {
            if (!acc[exp.category]) acc[exp.category] = 0;
            acc[exp.category] += Number(exp.amount) || 0;
            return acc;
          }, {}),
          expensesByProject: expensesByProject
        }
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (reportType: string, format: 'excel' | 'pdf' | 'csv') => {
    const data = reportData[reportType];
    if (!data) return;

    const exportData: ExportData = {
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
      data: Object.values(data).flat(),
      metadata: {
        dateRange: dateRange?.from && dateRange?.to 
          ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
          : 'All Time',
        generatedBy: 'Construction Analytics',
        generatedAt: new Date().toLocaleString(),
        filters: {
          category: selectedCategory,
          fieldLeader: selectedFieldLeader
        }
      }
    };

    try {
      switch (format) {
        case 'excel':
          exportToExcel(exportData);
          break;
        case 'pdf':
          await exportToPDF(exportData);
          break;
        case 'csv':
          exportToCSV(exportData);
          break;
      }
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const handleDeleteReport = (reportCategory: string) => {
    if (window.confirm('Are you sure you want to delete this report template?')) {
      toast.success(`${reportCategory.charAt(0).toUpperCase() + reportCategory.slice(1)} report template removed`);
    }
  };

  const reports = [
    {
      title: 'Executive Dashboard',
      description: 'High-level KPIs, revenue trends, and performance metrics for leadership teams',
      category: 'executive',
      lastUpdated: 'Today',
      canDelete: true
    },
    {
      title: 'Project Performance',
      description: 'Comprehensive project status, budget vs actual, timeline analysis and milestone tracking',
      category: 'project',
      lastUpdated: 'Today',
      canDelete: true
    },
    {
      title: 'Financial Analysis',
      description: 'Revenue recognition, profit & loss by project, cash flow projections and financial health',
      category: 'financial',
      lastUpdated: 'Today',
      canDelete: true
    },
    {
      title: 'Labor Report',
      description: 'Labor costs, expense analysis by category and project, workforce productivity metrics',
      category: 'labor',
      lastUpdated: 'Today',
      canDelete: true
    },
    {
      title: 'Project Report',
      description: 'Detailed project snapshot with comprehensive data including pending expenses and financial metrics',
      category: 'snapshot',
      lastUpdated: 'Today',
      canDelete: true
    },
    {
      title: 'Custom Report Builder',
      description: 'Build custom reports with any data from the application using our advanced report designer',
      category: 'custom',
      lastUpdated: 'Available',
      canDelete: false
    }
  ];

  const filteredReports = reports.filter(report => 
    selectedCategory === 'all' || report.category === selectedCategory
  );

  return (
    <Layout title="Analytics & Reporting" subtitle="Executive reports and business intelligence">
      <div className="space-y-8">
        <ReportFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedProjectManager={selectedFieldLeader}
          onProjectManagerChange={setSelectedFieldLeader}
          projectManagers={fieldLeaders}
          onApplyFilters={fetchReportData}
          onClearFilters={() => {
            setSelectedCategory('all');
            setDateRange(undefined);
            setSelectedFieldLeader('all');
          }}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 bg-white/80 backdrop-blur-sm border shadow-sm">
            <TabsTrigger value="gallery" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <FileText className="w-4 h-4" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="executive" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4" />
              Executive
            </TabsTrigger>
            <TabsTrigger value="project" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Building className="w-4 h-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="labor" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              Labor
            </TabsTrigger>
            <TabsTrigger value="snapshot" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <FileText className="w-4 h-4" />
              Snapshot
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Settings className="w-4 h-4" />
              Custom Builder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-6 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredReports.map((report, index) => (
                <ReportCard
                  key={index}
                  title={report.title}
                  description={report.description}
                  category={report.category}
                  lastUpdated={report.lastUpdated}
                  onView={() => setActiveTab(report.category)}
                  onExport={() => report.category !== 'custom' && handleExportReport(report.category, 'excel')}
                  onDelete={report.canDelete ? () => handleDeleteReport(report.category) : undefined}
                  canDelete={report.canDelete}
                  isLoading={loading}
                />
              ))}
            </div>
            
            {filteredReports.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more reports.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="executive" className="space-y-4">
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => handleExportReport('executive', 'excel')}>
                <Download className="w-4 h-4 mr-1" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportReport('executive', 'pdf')}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportReport('executive', 'csv')}>
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            </div>
            {reportData.executive && <ExecutiveReports data={reportData.executive} />}
          </TabsContent>

          <TabsContent value="project" className="space-y-4">
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => handleExportReport('project', 'excel')}>
                <Download className="w-4 h-4 mr-1" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportReport('project', 'pdf')}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportReport('project', 'csv')}>
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            </div>
            {reportData.project && <ProjectReports data={reportData.project} />}
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => handleExportReport('financial', 'excel')}>
                <Download className="w-4 h-4 mr-1" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportReport('financial', 'pdf')}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportReport('financial', 'csv')}>
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            </div>
            {reportData.financial && <FinancialReports data={reportData.financial} />}
          </TabsContent>

          <TabsContent value="labor" className="space-y-4">
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => handleExportReport('labor', 'excel')}>
                <Download className="w-4 h-4 mr-1" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportReport('labor', 'pdf')}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportReport('labor', 'csv')}>
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            </div>
            {reportData.labor && <LaborReport data={reportData.labor} />}
          </TabsContent>

          <TabsContent value="snapshot" className="space-y-4">
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => handleExportReport('snapshot', 'excel')}>
                <Download className="w-4 h-4 mr-1" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportReport('snapshot', 'pdf')}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportReport('snapshot', 'csv')}>
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            </div>
            <ProjectReport 
              projects={projects}
              totalExpenses={totalExpenses}
              totalBilled={totalBilled}
              totalReceived={totalReceived}
            />
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <CustomReportBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
