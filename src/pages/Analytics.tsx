
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
import { exportToExcel, exportToPDF, exportToCSV, ExportData } from '@/utils/reportExports';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Download, BarChart3, TrendingUp, Building } from 'lucide-react';

interface ProjectManager {
  id: string;
  name: string;
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('gallery');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [selectedProjectManager, setSelectedProjectManager] = useState<string>('');
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [reportData, setReportData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjectManagers();
    fetchReportData();
  }, []);

  const fetchProjectManagers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name')
        .not('name', 'is', null);

      if (error) throw error;

      setProjectManagers(profiles || []);
    } catch (error) {
      console.error('Error fetching project managers:', error);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*');

      if (projectsError) throw projectsError;

      // Generate mock data for demonstration
      const monthlyRevenue = [
        { month: 'Jan', revenue: 450000, costs: 320000, profit: 130000 },
        { month: 'Feb', revenue: 520000, costs: 380000, profit: 140000 },
        { month: 'Mar', revenue: 480000, costs: 340000, profit: 140000 },
        { month: 'Apr', revenue: 610000, costs: 420000, profit: 190000 },
        { month: 'May', revenue: 580000, costs: 400000, profit: 180000 },
        { month: 'Jun', revenue: 650000, costs: 450000, profit: 200000 }
      ];

      const performanceByManager = projectManagers.slice(0, 5).map((pm, index) => ({
        name: pm.name,
        totalRevenue: (Math.random() * 500000) + 200000,
        projectCount: Math.floor(Math.random() * 8) + 2,
        onTimeRate: Math.floor(Math.random() * 30) + 70,
        avgProfitMargin: Math.floor(Math.random() * 10) + 15
      }));

      const projectSummary = {
        totalRevenue: projects?.reduce((sum, p) => sum + p.contract_value, 0) || 0,
        activeProjects: projects?.filter(p => p.status === 'Open').length || 0,
        avgProfitMargin: 18.5,
        onTimeRate: 87
      };

      const projectStatus = [
        { name: 'Planning', value: projects?.filter(p => p.status === 'Planning').length || 0 },
        { name: 'Open', value: projects?.filter(p => p.status === 'Open').length || 0 },
        { name: 'Closed', value: projects?.filter(p => p.status === 'Closed').length || 0 }
      ];

      const budgetPerformance = projects?.slice(0, 6).map(project => ({
        projectName: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
        budgeted: project.contract_value,
        actual: project.contract_value * (0.85 + Math.random() * 0.3)
      })) || [];

      const timelinePerformance = projects?.slice(0, 5).map(project => ({
        projectName: project.name,
        manager: 'Project Manager',
        daysVariance: Math.floor(Math.random() * 20) - 10,
        onTime: Math.random() > 0.3
      })) || [];

      const changeOrderImpact = [
        { month: 'Jan', changeOrderValue: 25000 },
        { month: 'Feb', changeOrderValue: 38000 },
        { month: 'Mar', changeOrderValue: 18000 },
        { month: 'Apr', changeOrderValue: 45000 },
        { month: 'May', changeOrderValue: 32000 },
        { month: 'Jun', changeOrderValue: 28000 }
      ];

      const revenueRecognition = monthlyRevenue.map(item => ({
        month: item.month,
        recognized: item.revenue * 0.8,
        deferred: item.revenue * 0.2
      }));

      const profitLossByProject = projects?.slice(0, 6).map(project => ({
        projectName: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
        revenue: project.contract_value,
        costs: project.contract_value * 0.75,
        profit: project.contract_value * 0.25
      })) || [];

      const cashFlowProjection = [
        { month: 'Jul', inflow: 580000, outflow: 420000, net: 160000 },
        { month: 'Aug', inflow: 620000, outflow: 450000, net: 170000 },
        { month: 'Sep', inflow: 540000, outflow: 380000, net: 160000 },
        { month: 'Oct', inflow: 680000, outflow: 480000, net: 200000 },
        { month: 'Nov', inflow: 640000, outflow: 440000, net: 200000 },
        { month: 'Dec', inflow: 720000, outflow: 500000, net: 220000 }
      ];

      const profitMargins = monthlyRevenue.map(item => ({
        month: item.month,
        margin: ((item.profit / item.revenue) * 100).toFixed(1)
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
        dateRange: dateRange.from && dateRange.to 
          ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
          : 'All Time',
        generatedBy: 'RBF Construction Analytics',
        generatedAt: new Date().toLocaleString(),
        filters: {
          category: selectedCategory,
          projectManager: selectedProjectManager
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

  const reports = [
    {
      title: 'Executive Dashboard',
      description: 'High-level KPIs, revenue trends, and performance metrics',
      category: 'executive',
      lastUpdated: 'Today'
    },
    {
      title: 'Project Performance',
      description: 'Project status, budget vs actual, timeline analysis',
      category: 'project',
      lastUpdated: 'Today'
    },
    {
      title: 'Financial Analysis',
      description: 'Revenue recognition, P&L by project, cash flow',
      category: 'financial',
      lastUpdated: 'Today'
    },
    {
      title: 'Performance by Manager',
      description: 'Individual project manager performance metrics',
      category: 'executive',
      lastUpdated: 'Today'
    }
  ];

  const filteredReports = reports.filter(report => 
    selectedCategory === 'all' || report.category === selectedCategory
  );

  return (
    <Layout title="Analytics & Reporting" subtitle="Executive reports and business intelligence">
      <div className="space-y-6">
        <ReportFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedProjectManager={selectedProjectManager}
          onProjectManagerChange={setSelectedProjectManager}
          projectManagers={projectManagers}
          onApplyFilters={fetchReportData}
          onClearFilters={() => {
            setSelectedCategory('all');
            setDateRange({ from: undefined, to: undefined });
            setSelectedProjectManager('');
          }}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Report Gallery
            </TabsTrigger>
            <TabsTrigger value="executive" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Executive
            </TabsTrigger>
            <TabsTrigger value="project" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Financial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report, index) => (
                <ReportCard
                  key={index}
                  title={report.title}
                  description={report.description}
                  category={report.category}
                  lastUpdated={report.lastUpdated}
                  onView={() => setActiveTab(report.category)}
                  onExport={() => handleExportReport(report.category, 'excel')}
                  isLoading={loading}
                />
              ))}
            </div>
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
        </Tabs>
      </div>
    </Layout>
  );
}
