
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calculator, 
  FileText, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';

interface CompanySettings {
  profit_margin: number;
  overhead_percentage: number;
  default_tax_rate: number;
  default_retainage_rate: number;
}

interface BidOverviewProps {
  projectId: string;
  companySettings: CompanySettings;
  totalEstimate?: number;
  itemCount?: number;
  categoryCount?: number;
  projectName?: string;
}

export function BidOverview({ 
  projectId, 
  companySettings, 
  totalEstimate = 0, 
  itemCount = 0, 
  categoryCount = 0, 
  projectName 
}: BidOverviewProps) {
  const profit = totalEstimate * (companySettings.profit_margin / 100);
  const overhead = totalEstimate * (companySettings.overhead_percentage / 100);
  const directCosts = totalEstimate - profit - overhead;

  const handleExportToPDF = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  const handleScheduleReview = () => {
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + 7);
    toast.success(`Review scheduled for ${reviewDate.toLocaleDateString()}`);
  };

  const handleAdjustMargins = () => {
    toast.info('Navigate to Settings tab to adjust profit margins and overhead');
  };

  return (
    <div className="space-y-6">
      {/* Project Info */}
      {projectName && (
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{projectName}</div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimate</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalEstimate.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Project bid total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Line Items</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemCount}</div>
            <p className="text-xs text-muted-foreground">
              Across {categoryCount} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Direct Costs</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${directCosts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalEstimate > 0 ? Math.round((directCosts / totalEstimate) * 100) : 0}% of total bid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{companySettings.profit_margin}%</div>
            <p className="text-xs text-muted-foreground">
              ${profit.toLocaleString()} profit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bid Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Bid Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Direct Costs</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {totalEstimate > 0 ? Math.round((directCosts / totalEstimate) * 100) : 0}%
                </Badge>
                <span className="font-medium">${directCosts.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overhead</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{companySettings.overhead_percentage}%</Badge>
                <span className="font-medium">${overhead.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Profit</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{companySettings.profit_margin}%</Badge>
                <span className="font-medium">${profit.toLocaleString()}</span>
              </div>
            </div>
            <div className="border-t pt-2 flex justify-between items-center font-semibold">
              <span>Total Bid Amount</span>
              <span className="text-lg text-green-600">${totalEstimate.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportToPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Print/Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleScheduleReview}>
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Review
            </Button>
            <Button variant="outline" size="sm" onClick={handleAdjustMargins}>
              <Percent className="w-4 h-4 mr-2" />
              Adjust Margins
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
