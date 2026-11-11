
import { useState, useEffect } from 'react';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ReportCard } from '@/components/reports/ReportCard';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ProjectReports } from '@/components/reports/ProjectReports';
import { FinancialReports } from '@/components/reports/FinancialReports';
import { CustomReportBuilder } from '@/components/reports/CustomReportBuilder';
import { AnalyticsReportBuilder } from '@/components/reports/AnalyticsReportBuilder';

import { ProjectReport } from '@/components/reports/ProjectReport';
import { buildFinancialAnalytics, buildLaborAnalytics, buildProjectAnalytics, type ATimeEntry } from '@/lib/analyticsData';
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

function ExportMenu({ onExport }: { onExport: (format: 'excel' | 'pdf' | 'csv') => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport('excel')}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('pdf')}>PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('csv')}>CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('snapshot');
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
    fetchReportData();
  }, []);

  // Fetch field leaders from actual project data
  const fetchFieldLeaders = (projectsData: any[]) => {
    const uniqueLeaders = [...new Set(
      projectsData
        .filter(project => project.field_leader)
        .map(project => project.field_leader)
    )];
    
    const leadersArray = uniqueLeaders.map(name => ({
      id: name,
      name: name
    }));
    
    setFieldLeaders(leadersArray);
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch actual data from database with all project information
      const [
        { data: projects },
        { data: expenses },
        { data: billing },
        { data: changeOrders },
        { data: timeEntries }
      ] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('project_billing').select('*'),
        supabase.from('change_orders').select('*'),
        supabase.from('time_entries').select('project_id, work_date, employee_name, trade, regular_hours, overtime_hours, hourly_rate, ot_multiplier, burden_percent, total_cost')
      ]);

      // Set projects data and extract field leaders
      const projectsData = sortProjectsOpenFirst(projects || []);
      setProjects(projectsData);
      fetchFieldLeaders(projectsData);

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

      // Every tab is built from stored records (see src/lib/analyticsData.ts).
      setReportData({
        project: buildProjectAnalytics(projectsData, expenses || [], changeOrders || []),
        financial: buildFinancialAnalytics(projectsData, expenses || [], billing || []),
        labor: buildLaborAnalytics((timeEntries || []) as ATimeEntry[], projectsData),
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    // Apply filters and refresh data
    fetchReportData();
    toast.success('Filters applied successfully');
  };

  const handleExportReport = async (reportType: string, format: 'excel' | 'pdf' | 'csv') => {
    const data = reportData[reportType];
    if (!data) return;

    const exportData: ExportData = {
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
      data: data.exportRows || [],
      metadata: {
        dateRange: dateRange?.from && dateRange?.to 
          ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
          : 'All Time',
        generatedBy: 'RBF Construction',
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
      title: 'Project Report',
      description: 'Detailed project snapshot with comprehensive data including pending expenses and financial metrics',
      category: 'snapshot',
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
    <Layout title="Analytics & Reports" subtitle="Company-wide reports on projects, money and labor">
      <div className="space-y-6">
        <ReportFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedProjectManager={selectedFieldLeader}
          onProjectManagerChange={setSelectedFieldLeader}
          projectManagers={fieldLeaders}
          onApplyFilters={handleApplyFilters}
          onClearFilters={() => {
            setSelectedCategory('all');
            setDateRange(undefined);
            setSelectedFieldLeader('all');
          }}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="gallery" className="gap-2">
              <FileText className="w-4 h-4" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="snapshot" className="gap-2">
              <FileText className="w-4 h-4" />
              Snapshot
            </TabsTrigger>
            <TabsTrigger value="project" className="gap-2">
              <Building className="w-4 h-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="labor" className="gap-2">
              <Users className="w-4 h-4" />
              Labor
            </TabsTrigger>
            <TabsTrigger value="builder" className="gap-2">
              <Settings className="w-4 h-4" />
              Report Builder
            </TabsTrigger>
          </TabsList>
          </div>


          <TabsContent value="gallery" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No reports found</h3>
                <p className="text-muted-foreground">Try adjusting your filters to see more reports.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="snapshot" className="space-y-4">
            <div className="flex justify-end">
              <ExportMenu onExport={(fmt) => handleExportReport('snapshot', fmt)} />
            </div>
            <ProjectReport 
              projects={projects}
              totalExpenses={totalExpenses}
              totalBilled={totalBilled}
              totalReceived={totalReceived}
            />
          </TabsContent>

          <TabsContent value="project" className="space-y-4">
            {reportData.project && <ProjectReports data={reportData.project} actions={<ExportMenu onExport={(fmt) => handleExportReport('project', fmt)} />} />}
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            {reportData.financial && <FinancialReports data={reportData.financial} actions={<ExportMenu onExport={(fmt) => handleExportReport('financial', fmt)} />} />}
          </TabsContent>

          <TabsContent value="labor" className="space-y-4">
            {reportData.labor && <LaborReport data={reportData.labor} actions={<ExportMenu onExport={(fmt) => handleExportReport('labor', fmt)} />} />}
          </TabsContent>

          <TabsContent value="builder" className="space-y-4">
            <AnalyticsReportBuilder />
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <CustomReportBuilder />
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}
