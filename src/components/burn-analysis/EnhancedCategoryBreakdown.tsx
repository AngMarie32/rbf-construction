
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, CheckCircle, AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import { CategoryAnalysis } from '@/utils/enhancedBurnAnalytics';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface EnhancedCategoryBreakdownProps {
  categoryBreakdown: CategoryAnalysis[];
  onExport: () => void;
  loading?: boolean;
}

export function EnhancedCategoryBreakdown({ 
  categoryBreakdown, 
  onExport, 
  loading = false 
}: EnhancedCategoryBreakdownProps) {
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
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getScheduleImpactBadge = (impact: number) => {
    if (impact <= 0.1) return <Badge variant="default" className="text-xs">Low Impact</Badge>;
    if (impact <= 0.3) return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Medium Impact</Badge>;
    return <Badge variant="destructive" className="text-xs">High Impact</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Category Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Enhanced Category Analysis with EVM</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
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
              <TableHead className="text-right">Earned Value</TableHead>
              <TableHead className="text-right">Actual Spend</TableHead>
              <TableHead className="text-right">Cost Variance</TableHead>
              <TableHead className="text-right">Variance %</TableHead>
              <TableHead>Schedule Impact</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryBreakdown.map((category) => {
              const costVariance = category.earnedValue - category.actualSpend;
              const costVariancePercent = category.earnedValue > 0 ? 
                (costVariance / category.earnedValue) * 100 : 0;

              return (
                <TableRow key={category.category} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div>
                      <div>{category.category}</div>
                      {category.hasRealData && (
                        <div className="mt-1">
                          <Progress 
                            value={category.plannedBudget > 0 ? (category.actualSpend / category.plannedBudget) * 100 : 0} 
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    ${category.plannedBudget.toLocaleString()}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div>
                      <div>${category.earnedValue.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        {category.plannedBudget > 0 ? 
                          `${((category.earnedValue / category.plannedBudget) * 100).toFixed(1)}% earned` : 
                          'N/A'
                        }
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    ${category.actualSpend.toLocaleString()}
                  </TableCell>
                  
                  <TableCell className={`text-right ${costVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {costVariance >= 0 ? '+' : ''}${costVariance.toLocaleString()}
                  </TableCell>
                  
                  <TableCell className={`text-right ${costVariancePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {costVariancePercent >= 0 ? '+' : ''}
                    {costVariancePercent.toFixed(1)}%
                  </TableCell>
                  
                  <TableCell>
                    {getScheduleImpactBadge(category.scheduleImpact)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(category.status)}
                      <Badge className={`${getStatusColor(category.status)} text-white text-xs`}>
                        {category.status}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {categoryBreakdown.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Category Data Available</h3>
            <p className="text-gray-500 mb-4">
              No expenses or budget allocations found for the selected projects and date range.
            </p>
            <Button variant="outline">Setup Category Budgets</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
