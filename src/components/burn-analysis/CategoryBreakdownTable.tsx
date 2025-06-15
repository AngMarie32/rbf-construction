
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CheckCircle, AlertTriangle, TrendingDown } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface CategoryBreakdown {
  category: string;
  plannedBudget: number;
  actualSpend: number;
  variance: number;
  variancePercent: number;
  remaining: number;
  status: 'On Track' | 'At Risk' | 'Over Budget';
}

interface CategoryBreakdownTableProps {
  categoryBreakdown: CategoryBreakdown[];
  onExport: () => void;
  loading?: boolean;
}

export function CategoryBreakdownTable({ 
  categoryBreakdown, 
  onExport, 
  loading = false 
}: CategoryBreakdownTableProps) {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded"></div>
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
        <CardTitle>Cost Category Breakdown</CardTitle>
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
              <TableHead className="text-right">Actual Spend</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">Variance %</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryBreakdown.map((category) => (
              <TableRow key={category.category} className="hover:bg-gray-50">
                <TableCell className="font-medium">{category.category}</TableCell>
                <TableCell className="text-right">${category.plannedBudget.toLocaleString()}</TableCell>
                <TableCell className="text-right">${category.actualSpend.toLocaleString()}</TableCell>
                <TableCell className={`text-right ${category.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {category.variance >= 0 ? '+' : ''}${category.variance.toLocaleString()}
                </TableCell>
                <TableCell className={`text-right ${category.variancePercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {category.variancePercent >= 0 ? '+' : ''}
                  {category.variancePercent.toFixed(1)}%
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
  );
}
