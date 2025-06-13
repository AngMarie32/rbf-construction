
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft,
  PieChart,
  BarChart3,
  Calculator,
  AlertTriangle,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BidAnalysisProps {
  projectId: string;
  onBack: () => void;
}

export function BidAnalysis({ projectId, onBack }: BidAnalysisProps) {
  const [bidItems, setBidItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState<any>(null);

  useEffect(() => {
    fetchBidData();
  }, [projectId]);

  const fetchBidData = async () => {
    try {
      // Fetch bid items
      const { data: items, error: itemsError } = await supabase
        .from('bid_items')
        .select('*')
        .eq('project_id', projectId);

      if (itemsError) throw itemsError;

      // Fetch project data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      setBidItems(items || []);
      setProjectData(project);
    } catch (error) {
      console.error('Error fetching bid data:', error);
      toast.error('Failed to load bid analysis data');
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

  // Calculate analysis metrics
  const totalBidValue = bidItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const categoryBreakdown = bidItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + (item.total || 0);
    return acc;
  }, {} as Record<string, number>);

  const highestCategory = Object.entries(categoryBreakdown).sort(([,a], [,b]) => b - a)[0];
  const averageItemCost = totalBidValue / bidItems.length || 0;
  const profitMargin = 0.15; // 15%
  const overhead = 0.10; // 10%
  const directCosts = totalBidValue * 0.75;

  // Risk assessment
  const highCostItems = bidItems.filter(item => (item.total || 0) > averageItemCost * 2);
  const riskScore = highCostItems.length > 5 ? 'High' : highCostItems.length > 2 ? 'Medium' : 'Low';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bid Planner
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Bid Analysis</h1>
          <p className="text-muted-foreground">{projectData?.name}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Bid Value</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">${totalBidValue.toLocaleString()}</div>
            <p className="text-xs text-blue-600 mt-1">{bidItems.length} line items</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Profit Margin</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{(profitMargin * 100).toFixed(1)}%</div>
            <p className="text-xs text-green-600 mt-1">${(totalBidValue * profitMargin).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Risk Level</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">{riskScore}</div>
            <p className="text-xs text-orange-600 mt-1">{highCostItems.length} high-cost items</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Avg Item Cost</CardTitle>
            <Calculator className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">${averageItemCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-purple-600 mt-1">Per line item</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(categoryBreakdown)
              .sort(([,a], [,b]) => b - a)
              .map(([category, amount]) => {
                const percentage = (amount / totalBidValue) * 100;
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                        <span className="font-semibold">${amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Cost Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Cost Structure Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">${directCosts.toLocaleString()}</div>
              <div className="text-sm text-blue-700 font-medium">Direct Costs</div>
              <div className="text-xs text-blue-500 mt-1">75% of total bid</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">${(totalBidValue * overhead).toLocaleString()}</div>
              <div className="text-sm text-orange-700 font-medium">Overhead</div>
              <div className="text-xs text-orange-500 mt-1">10% of total bid</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">${(totalBidValue * profitMargin).toLocaleString()}</div>
              <div className="text-sm text-green-700 font-medium">Profit</div>
              <div className="text-xs text-green-500 mt-1">15% of total bid</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Overall Risk Level</div>
                <div className="text-sm text-muted-foreground">Based on item complexity and cost distribution</div>
              </div>
              <Badge className={
                riskScore === 'High' ? 'bg-red-100 text-red-800' :
                riskScore === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }>
                {riskScore} Risk
              </Badge>
            </div>

            {highCostItems.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">High-Cost Items (Above Average)</h4>
                <div className="space-y-2">
                  {highCostItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">{item.description}</div>
                        <div className="text-xs text-muted-foreground">{item.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${(item.total || 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {((item.total || 0) / totalBidValue * 100).toFixed(1)}% of bid
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {highestCategory && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">Largest Category: {highestCategory[0]}</div>
                  <div className="text-sm text-muted-foreground">
                    Consider breaking down this ${highestCategory[1].toLocaleString()} category into more detailed line items for better cost control.
                  </div>
                </div>
              </div>
            )}

            {riskScore === 'High' && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium">High Risk Detected</div>
                  <div className="text-sm text-muted-foreground">
                    Review high-cost items carefully and consider adding contingency buffers for complex work items.
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Profit Margin Analysis</div>
                <div className="text-sm text-muted-foreground">
                  Current 15% profit margin is healthy. Consider market conditions and competition when finalizing pricing.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
