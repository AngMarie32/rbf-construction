import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { exportToPDF, exportToCSV } from '@/utils/pdfExport';
import { BurnAnalysisFilters } from '@/components/burn-analysis/BurnAnalysisFilters';
import { BurnAnalysisSummary } from '@/components/burn-analysis/BurnAnalysisSummary';
import { EnhancedBurnChart } from '@/components/burn-analysis/EnhancedBurnChart';
import { EnhancedCategoryBreakdown } from '@/components/burn-analysis/EnhancedCategoryBreakdown';
import { MilestoneTracker } from '@/components/burn-analysis/MilestoneTracker';
import { ProjectSelectionHeader } from '@/components/burn-analysis/ProjectSelectionHeader';
import { EnhancedBurnAnalyticsEngine, EnhancedBurnData, CategoryAnalysis, MilestoneAnalysis } from '@/utils/enhancedBurnAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, Settings, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Project {
  id: string;
  name: string;
  contract_value: number;
  start_date: string;
  due_date: string;
  status: string;
}

export default function BurnRateAnalysis() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [costCategories, setCostCategories] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [burnData, setBurnData] = useState<EnhancedBurnData[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryAnalysis[]>([]);
  const [milestones, setMilestones] = useState<MilestoneAnalysis[]>([]);
  const [hasDetailedBudgets, setHasDetailedBudgets] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [summaryStats, setSummaryStats] = useState({
    totalBudget: 0,
    actualSpend: 0,
    remainingBudget: 0,
    monthlyBurnRate: 0,
    budgetPercentage: 0,
    monthlyChange: 0,
    schedulePerformanceIndex: 1,
    costPerformanceIndex: 1,
    estimateAtCompletion: 0
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjects.length > 0) {
      fetchEnhancedBurnAnalysisData();
    }
  }, [selectedProjects, dateRange]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, contract_value, start_date, due_date, status')
        .order('name');

      if (error) throw error;
      setProjects(sortProjectsOpenFirst(data || []));
      
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

  const fetchEnhancedBurnAnalysisData = async () => {
    try {
      setLoading(true);
      
      // Use the enhanced analytics engine
      const [burnAnalysisData, categoryAnalysisData, milestoneData] = await Promise.all([
        EnhancedBurnAnalyticsEngine.calculateEnhancedBurnData(selectedProjects, dateRange),
        EnhancedBurnAnalyticsEngine.calculateEnhancedCategoryAnalysis(selectedProjects, dateRange),
        EnhancedBurnAnalyticsEngine.getMilestoneAnalysis(selectedProjects)
      ]);

      setBurnData(burnAnalysisData);
      setMilestones(milestoneData);
      
      // Check if we have real budget data
      const hasRealBudgetData = categoryAnalysisData.some(cat => cat.hasRealData && cat.plannedBudget > 0);
      setHasDetailedBudgets(hasRealBudgetData);
      
      // Filter categories
      const filteredCategories = categoryAnalysisData.filter(cat => 
        costCategories === 'All' || cat.category === costCategories
      ).filter(cat =>
        searchTerm === '' || cat.category.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setCategoryBreakdown(filteredCategories);

      // Calculate enhanced summary stats
      const selectedProjectsData = projects.filter(p => selectedProjects.includes(p.id));
      const totalBudget = selectedProjectsData.reduce((sum, p) => sum + p.contract_value, 0);
      const totalActualSpend = categoryAnalysisData.reduce((sum, cat) => sum + cat.actualSpend, 0);
      const remainingBudget = totalBudget - totalActualSpend;
      const budgetPercentage = totalBudget > 0 ? (totalActualSpend / totalBudget) * 100 : 0;
      const monthlyBurnRate = totalActualSpend / Math.max(1, new Date().getMonth() + 1);

      // Get latest EVM metrics
      const latestBurnData = burnAnalysisData[burnAnalysisData.length - 1];
      const spi = latestBurnData?.schedulePerformanceIndex || 1;
      const cpi = latestBurnData?.costPerformanceIndex || 1;
      const eac = latestBurnData?.estimateAtCompletion || totalBudget;

      setSummaryStats({
        totalBudget,
        actualSpend: totalActualSpend,
        remainingBudget,
        monthlyBurnRate,
        budgetPercentage,
        monthlyChange: Math.random() * 10 - 5, // This would come from historical data
        schedulePerformanceIndex: spi,
        costPerformanceIndex: cpi,
        estimateAtCompletion: eac
      });

    } catch (error) {
      console.error('Error fetching enhanced burn analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupBudgets = () => {
    console.log('Navigate to budget setup');
  };

  const handleExportPDF = () => {
    exportToPDF('burn-analysis-content', 'enhanced-burn-rate-analysis.pdf');
  };

  const handleExportCSV = () => {
    const exportData = [
      ...categoryBreakdown.map(cat => ({
        Category: cat.category,
        'Planned Budget': cat.plannedBudget,
        'Earned Value': cat.earnedValue,
        'Actual Spend': cat.actualSpend,
        'Cost Variance': cat.earnedValue - cat.actualSpend,
        'Variance %': cat.variancePercent,
        'Schedule Impact': cat.scheduleImpact,
        Status: cat.status
      }))
    ];
    exportToCSV({
      title: 'enhanced-burn-rate-analysis',
      data: exportData
    });
  };

  if (loading && selectedProjects.length === 0) {
    return (
      <Layout title="Enhanced Burn Analysis" subtitle="Advanced project spending analysis with Earned Value Management">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Enhanced Burn Analysis" subtitle="Advanced project spending analysis with Earned Value Management">
      <div id="burn-analysis-content" className="space-y-6">
        {/* Filters */}
        <BurnAnalysisFilters
          projects={projects}
          selectedProjects={selectedProjects}
          onProjectToggle={(projectId) => {
            setSelectedProjects(prev => 
              prev.includes(projectId) 
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
            );
          }}
          costCategories={costCategories}
          onCostCategoriesChange={setCostCategories}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onClearFilters={() => {
            setSelectedProjects([]);
            setCostCategories('All');
            setSearchTerm('');
            setDateRange({ from: undefined, to: undefined });
          }}
          onExport={handleExportCSV}
        />

        {/* Project Selection Header */}
        <ProjectSelectionHeader 
          selectedProjects={selectedProjects}
          projects={projects}
        />

        {selectedProjects.length > 0 && (
          <>
            {/* Budget Setup Alert */}
            {!hasDetailedBudgets && (
              <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="flex items-center justify-between">
                    <span>
                      Enhanced burn analysis works best with detailed budget allocations. 
                      Set up category budgets and task schedules for full EVM capabilities.
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSetupBudgets}
                      className="ml-4"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Setup Budgets
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Enhanced Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Enhanced Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-blue-600 text-sm font-medium">Schedule Performance</div>
                    <div className={`text-2xl font-bold ${summaryStats.schedulePerformanceIndex >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                      {summaryStats.schedulePerformanceIndex.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">SPI (Target: ≥1.0)</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-green-600 text-sm font-medium">Cost Performance</div>
                    <div className={`text-2xl font-bold ${summaryStats.costPerformanceIndex >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                      {summaryStats.costPerformanceIndex.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">CPI (Target: ≥1.0)</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-purple-600 text-sm font-medium">Forecast at Completion</div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${summaryStats.estimateAtCompletion.toLocaleString()}
                    </div>
                    <div className={`text-xs ${summaryStats.estimateAtCompletion <= summaryStats.totalBudget ? 'text-green-600' : 'text-red-600'}`}>
                      {summaryStats.estimateAtCompletion <= summaryStats.totalBudget ? 'Under Budget' : 'Over Budget'}
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-orange-600 text-sm font-medium">Project Health</div>
                    <div className="text-2xl font-bold">
                      {summaryStats.schedulePerformanceIndex >= 0.9 && summaryStats.costPerformanceIndex >= 0.9 ? 
                        <span className="text-green-600">Healthy</span> : 
                        <span className="text-red-600">At Risk</span>
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      Based on SPI & CPI
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analysis">EVM Analysis</TabsTrigger>
                <TabsTrigger value="categories">Category Breakdown</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-6">
                <EnhancedBurnChart
                  burnData={burnData}
                  onExport={handleExportPDF}
                  loading={loading}
                />
              </TabsContent>

              <TabsContent value="categories" className="space-y-6">
                <EnhancedCategoryBreakdown
                  categoryBreakdown={categoryBreakdown}
                  onExport={handleExportCSV}
                  loading={loading}
                />
              </TabsContent>

              <TabsContent value="milestones" className="space-y-6">
                <MilestoneTracker
                  milestones={milestones}
                  loading={loading}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </Layout>
  );
}
