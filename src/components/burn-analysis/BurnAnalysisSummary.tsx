
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface SummaryStats {
  totalBudget: number;
  actualSpend: number;
  remainingBudget: number;
  monthlyBurnRate: number;
  budgetPercentage: number;
  monthlyChange: number;
}

interface BurnAnalysisSummaryProps {
  summaryStats: SummaryStats;
  selectedProjectsCount: number;
  loading?: boolean;
}

export function BurnAnalysisSummary({ 
  summaryStats, 
  selectedProjectsCount,
  loading = false 
}: BurnAnalysisSummaryProps) {
  const getBudgetStatus = () => {
    if (summaryStats.budgetPercentage > 100) return { status: 'Over Budget', color: 'bg-red-500', icon: AlertTriangle };
    if (summaryStats.budgetPercentage > 90) return { status: 'At Risk', color: 'bg-yellow-500', icon: AlertTriangle };
    return { status: 'On Track', color: 'bg-green-500', icon: CheckCircle };
  };

  const budgetStatus = getBudgetStatus();
  const StatusIcon = budgetStatus.icon;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
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
            Across {selectedProjectsCount} project{selectedProjectsCount !== 1 ? 's' : ''}
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
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {summaryStats.budgetPercentage.toFixed(1)}% of budget
            </p>
            <Badge className={`${budgetStatus.color} text-white text-xs`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {budgetStatus.status}
            </Badge>
          </div>
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
            {(100 - summaryStats.budgetPercentage).toFixed(1)}% remaining
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Burn Rate</CardTitle>
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            {summaryStats.monthlyChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-red-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-600" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${summaryStats.monthlyBurnRate.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {summaryStats.monthlyChange >= 0 ? '+' : ''}{summaryStats.monthlyChange.toFixed(1)}% vs. last month
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
