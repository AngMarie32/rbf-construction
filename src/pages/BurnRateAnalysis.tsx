import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { exportToPDF, exportCSV } from '@/utils/pdfExport';
import { BurnAnalysisFilters } from '@/components/burn-analysis/BurnAnalysisFilters';
import { BurnAnalysisSummary } from '@/components/burn-analysis/BurnAnalysisSummary';
import { BurnAnalysisChart } from '@/components/burn-analysis/BurnAnalysisChart';
import { CategoryBreakdownTable } from '@/components/burn-analysis/CategoryBreakdownTable';
import { ProjectSelectionHeader } from '@/components/burn-analysis/ProjectSelectionHeader';
import { BurnAnalyticsEngine } from '@/utils/burnAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  hasRealData?: boolean;
}

export default function BurnRateAnalysis() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [costCategories, setCostCategories] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [burnData, setBurnData] = useState<BurnData[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
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
    monthlyChange: 0
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjects.length > 0) {
      fetchAdvancedBurnAnalysisData();
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

  const fetchAdvancedBurnAnalysisData = async () => {
    try {
      setLoading(true);
      
      // Use the new analytics engine
      const [burnAnalysisData, categoryAnalysisData] = await Promise.all([
        BurnAnalyticsEngine.calculateAdvancedBurnData(selectedProjects, dateRange),
        BurnAnalyticsEngine.calculateCategoryAnalysis(selectedProjects, dateRange)
      ]);

      setBurnData(burnAnalysisData);
      
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

      // Calculate summary stats
      const selectedProjectsData = projects.filter(p => selectedProjects.includes(p.id));
      const totalBudget = selectedProjectsData.reduce((sum, p) => sum + p.contract_value, 0);
      const totalActualSpend = categoryAnalysisData.reduce((sum, cat) => sum + cat.actualSpend, 0);
      const remainingBudget = totalBudget - totalActualSpend;
      const budgetPercentage = totalBudget > 0 ? (totalActualSpend / totalBudget) * 100 : 0;
      const monthlyBurnRate = totalActualSpend / Math.max(1, new Date().getMonth() + 1);

      setSummaryStats({
        totalBudget,
        actualSpend: totalActualSpend,
        remainingBudget,
        monthlyBurnRate,
        budgetPercentage,
        monthlyChange: Math.random() * 10 - 5 // This would come from historical data
      });

    } catch (error) {
      console.error('Error fetching advanced burn analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupBudgets = () => {
    // Navigate to project settings or budget setup
    console.log('Navigate to budget setup');
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
    <Layout title="Burn Analysis" subtitle="Monitor project spending and budget performance">
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
          onExport={() => exportCSV(categoryBreakdown, 'burn-rate-analysis.csv')}
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
                      No detailed budget allocations found for selected projects. 
                      Set up category budgets for more accurate burn analysis.
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSetupBudgets}
                      className="ml-4"
                    >
                      Setup Budgets
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary Stats */}
            <BurnAnalysisSummary 
              summaryStats={summaryStats}
              selectedProjectsCount={selectedProjects.length}
              loading={loading}
            />

            {/* Burn Rate Chart */}
            <BurnAnalysisChart
              burnData={burnData}
              onExport={() => exportToPDF('burn-analysis-content', 'burn-rate-analysis.pdf')}
              loading={loading}
            />

            {/* Cost Category Breakdown */}
            {categoryBreakdown.length > 0 ? (
              <CategoryBreakdownTable
                categoryBreakdown={categoryBreakdown}
                onExport={() => exportCSV(categoryBreakdown, 'burn-rate-analysis.csv')}
                loading={loading}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Cost Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Category Data Available</h3>
                    <p className="text-gray-500 mb-4">
                      No expenses or budget allocations found for the selected projects and date range.
                    </p>
                    <Button variant="outline" onClick={handleSetupBudgets}>
                      Setup Category Budgets
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
