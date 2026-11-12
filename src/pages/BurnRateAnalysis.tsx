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
import { AlertTriangle, Info, Settings, TrendingUp, Wallet, Flame, Gauge, Target, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHero, heroButton } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { isOpenJob } from '@/lib/analyticsData';
import { cn } from '@/lib/utils';
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
  const [allCategories, setAllCategories] = useState<CategoryAnalysis[]>([]);
  const navigate = useNavigate();
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
        .select('id, name, contract_value, start_date, due_date, status').is('archived_at', null)
        .order('name');

      if (error) throw error;
      setProjects(sortProjectsOpenFirst(data || []));

      // Select active projects by default
      const activeProjects = (data || [])
        .filter(p => isOpenJob(p.status))
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

      setAllCategories(categoryAnalysisData);

      // Calculate enhanced summary stats
      const selectedProjectsData = projects.filter(p => selectedProjects.includes(p.id));
      const totalBudget = selectedProjectsData.reduce((sum, p) => sum + p.contract_value, 0);
      const totalActualSpend = categoryAnalysisData.reduce((sum, cat) => sum + cat.actualSpend, 0);
      const remainingBudget = totalBudget - totalActualSpend;
      const budgetPercentage = totalBudget > 0 ? (totalActualSpend / totalBudget) * 100 : 0;
      const starts = selectedProjectsData.map((p) => (p.start_date ? new Date(`${p.start_date.slice(0, 10)}T00:00:00`).getTime() : NaN)).filter((t) => !Number.isNaN(t));
      const monthsRunning = starts.length ? Math.max(1, (Date.now() - Math.min(...starts)) / (86400000 * 30.44)) : 1;
      const monthlyBurnRate = totalActualSpend / monthsRunning;

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
        monthlyChange: 0,
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

  // Category budgets are estimated from the contract; task schedules come from Project Schedule.
  const handleSetupBudgets = () => navigate(selectedProjects.length === 1 ? `/project-schedule?project=${selectedProjects[0]}` : '/project-schedule');

  const categoryBreakdown = allCategories
    .filter((cat) => costCategories === 'All' || cat.category === costCategories)
    .filter((cat) => searchTerm === '' || cat.category.toLowerCase().includes(searchTerm.toLowerCase()));
  const money0 = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString()}`;
  const healthy = summaryStats.schedulePerformanceIndex >= 0.9 && summaryStats.costPerformanceIndex >= 0.9;
  const monthsLeft = summaryStats.monthlyBurnRate > 0 ? summaryStats.remainingBudget / summaryStats.monthlyBurnRate : null;

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
      <Layout hideTitle title="Burn Analysis">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideTitle title="Burn Analysis">
      <div id="burn-analysis-content" className="space-y-6">
        <PageHero
          eyebrow="Financial"
          title="Burn Analysis"
          subtitle="How fast each job is spending its budget, and whether cost and schedule are on track."
          actions={
            <button type="button" className={heroButton} onClick={handleExportCSV} disabled={!categoryBreakdown.length}>
              Export CSV
            </button>
          }
          stats={
            selectedProjects.length
              ? [
                  { label: 'Budget used', value: loading ? '…' : `${summaryStats.budgetPercentage.toFixed(0)}%`, tone: summaryStats.budgetPercentage > 100 ? 'bad' : undefined },
                  { label: 'Health', value: loading ? '…' : healthy ? 'On track' : 'At risk', tone: healthy ? 'good' : 'bad' },
                ]
              : []
          }
        />

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
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-900 dark:text-amber-200">
                  <div className="flex items-center justify-between">
                    <span>
                      Category budgets are estimated from the contract value. Add tasks with dates and progress in Project Schedule
                      so schedule performance reflects real progress.
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSetupBudgets}
                      className="ml-4"
                    >
                      <CalendarClock className="w-4 h-4 mr-1" />
                      Open Project Schedule
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
              <AccentStat label="Budget" value={money0(summaryStats.totalBudget)} icon={Wallet} accent="blue" loading={loading} hint={`${selectedProjects.length} job${selectedProjects.length === 1 ? '' : 's'}`} />
              <AccentStat label="Spent" value={money0(summaryStats.actualSpend)} icon={Flame} accent="orange" loading={loading} hint={`${summaryStats.budgetPercentage.toFixed(1)}% of budget`} />
              <AccentStat
                label="Remaining"
                value={money0(summaryStats.remainingBudget)}
                icon={Target}
                accent="emerald"
                tone={summaryStats.remainingBudget < 0 ? 'bad' : undefined}
                loading={loading}
                hint={monthsLeft == null ? '—' : monthsLeft < 0 ? 'Over budget' : `≈ ${monthsLeft.toFixed(1)} months at this pace`}
              />
              <AccentStat label="Burn per month" value={money0(summaryStats.monthlyBurnRate)} icon={TrendingUp} accent="indigo" loading={loading} hint="Average since the jobs started" />
              <AccentStat
                label="Cost performance (CPI)"
                value={summaryStats.costPerformanceIndex.toFixed(2)}
                icon={Gauge}
                accent="amber"
                tone={summaryStats.costPerformanceIndex >= 1 ? 'good' : summaryStats.costPerformanceIndex < 0.9 ? 'bad' : 'warn'}
                loading={loading}
                hint="≥ 1.00 means under budget for work done"
              />
              <AccentStat
                label="Forecast at completion"
                value={money0(summaryStats.estimateAtCompletion)}
                icon={AlertTriangle}
                accent="rose"
                tone={summaryStats.estimateAtCompletion > summaryStats.totalBudget ? 'bad' : 'good'}
                loading={loading}
                hint={`SPI ${summaryStats.schedulePerformanceIndex.toFixed(2)} · ${summaryStats.estimateAtCompletion > summaryStats.totalBudget ? `${money0(summaryStats.estimateAtCompletion - summaryStats.totalBudget)} over` : 'within budget'}`}
              />
            </div>

            <Tabs defaultValue="analysis" className="w-full">
              <TabsList>
                <TabsTrigger value="analysis">Spending vs plan</TabsTrigger>
                <TabsTrigger value="categories">By category</TabsTrigger>
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
