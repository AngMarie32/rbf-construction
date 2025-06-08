
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';

interface BurnAnalysisTabProps {
  projectId: string;
}

interface BurnData {
  month: string;
  plannedSpending: number;
  actualSpending: number;
}

export function BurnAnalysisTab({ projectId }: BurnAnalysisTabProps) {
  const [burnData, setBurnData] = useState<BurnData[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalBudget: 0,
    actualSpend: 0,
    remainingBudget: 0,
    budgetPercentage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectBurnData();
  }, [projectId]);

  const fetchProjectBurnData = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('contract_value, start_date')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Fetch billing data for this project
      const { data: billingData, error: billingError } = await supabase
        .from('project_billing')
        .select('billed_amount, billing_period_end')
        .eq('project_id', projectId);

      if (billingError) throw billingError;

      const totalBudget = project?.contract_value || 0;
      const totalActualSpend = (billingData || []).reduce((sum, b) => sum + (b.billed_amount || 0), 0);

      // Generate monthly burn chart data
      const currentYear = new Date().getFullYear();
      const months = eachMonthOfInterval({
        start: startOfYear(new Date(currentYear, 0, 1)),
        end: endOfYear(new Date(currentYear, 11, 31))
      });

      const burnChartData = months.map((month, index) => {
        const monthStr = format(month, 'MMM');
        const monthlyPlanned = totalBudget / 12;
        const cumulativePlanned = monthlyPlanned * (index + 1);
        
        const cumulativeActual = (billingData || [])
          .filter(b => {
            const billingMonth = new Date(b.billing_period_end);
            return billingMonth <= month;
          })
          .reduce((sum, b) => sum + (b.billed_amount || 0), 0);

        return {
          month: monthStr,
          plannedSpending: cumulativePlanned,
          actualSpending: cumulativeActual
        };
      });

      setBurnData(burnChartData);

      setSummaryStats({
        totalBudget,
        actualSpend: totalActualSpend,
        remainingBudget: totalBudget - totalActualSpend,
        budgetPercentage: totalBudget > 0 ? (totalActualSpend / totalBudget) * 100 : 0
      });

    } catch (error) {
      console.error('Error fetching project burn data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${summaryStats.totalBudget.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summaryStats.actualSpend.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.budgetPercentage.toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            <TrendingDown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${summaryStats.remainingBudget.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(100 - summaryStats.budgetPercentage).toFixed(1)}% remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Burn Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Burn Rate Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              plannedSpending: { label: "Planned Spending", color: "#3b82f6" },
              actualSpending: { label: "Actual Spending", color: "#06b6d4" }
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burnData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                />
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
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
