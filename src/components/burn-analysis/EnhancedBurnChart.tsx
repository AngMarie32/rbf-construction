
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { EnhancedBurnData } from '@/utils/enhancedBurnAnalytics';

interface EnhancedBurnChartProps {
  burnData: EnhancedBurnData[];
  onExport: () => void;
  loading?: boolean;
}

export function EnhancedBurnChart({ burnData, onExport, loading = false }: EnhancedBurnChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Burn Rate Analysis (EVM)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestData = burnData[burnData.length - 1];
  const spi = latestData?.schedulePerformanceIndex || 1;
  const cpi = latestData?.costPerformanceIndex || 1;
  
  // Performance status
  const scheduleStatus = spi >= 1 ? 'On Schedule' : 'Behind Schedule';
  const costStatus = cpi >= 1 ? 'Under Budget' : 'Over Budget';
  
  const scheduleColor = spi >= 1 ? 'text-green-600' : 'text-red-600';
  const costColor = cpi >= 1 ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            Enhanced Burn Rate Analysis (EVM)
            {(spi < 0.9 || cpi < 0.9) && (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
          </CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={spi >= 1 ? 'default' : 'destructive'} className="text-xs">
                SPI: {spi.toFixed(2)}
              </Badge>
              <span className={scheduleColor}>{scheduleStatus}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={cpi >= 1 ? 'default' : 'destructive'} className="text-xs">
                CPI: {cpi.toFixed(2)}
              </Badge>
              <span className={costColor}>{costStatus}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="EVM">
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EVM">EVM View</SelectItem>
              <SelectItem value="Performance">Performance</SelectItem>
              <SelectItem value="Forecast">Forecast</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            plannedValue: { label: "Planned Value (PV)", color: "#3b82f6" },
            earnedValue: { label: "Earned Value (EV)", color: "#10b981" },
            actualCost: { label: "Actual Cost (AC)", color: "#f59e0b" },
            estimateAtCompletion: { label: "Estimate at Completion", color: "#ef4444" }
          }}
          className="h-[400px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={burnData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`, 
                  name
                ]}
              />
              <Legend />
              
              {/* Budget at Completion reference line */}
              <ReferenceLine 
                y={latestData?.budgetAtCompletion} 
                stroke="#94a3b8" 
                strokeDasharray="10 10" 
                label="Budget at Completion (BAC)"
              />
              
              <Line 
                type="monotone" 
                dataKey="plannedValue" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                name="Planned Value (PV)"
              />
              <Line 
                type="monotone" 
                dataKey="earnedValue" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 4 }}
                name="Earned Value (EV)"
              />
              <Line 
                type="monotone" 
                dataKey="actualCost" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: "#f59e0b", r: 4 }}
                name="Actual Cost (AC)"
              />
              <Line 
                type="monotone" 
                dataKey="estimateAtCompletion" 
                stroke="#ef4444" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#ef4444", r: 4 }}
                name="Estimate at Completion (EAC)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Performance Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 font-medium">Schedule Variance</div>
            <div className={`text-lg font-bold ${latestData?.scheduleVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${latestData?.scheduleVariance.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 font-medium">Cost Variance</div>
            <div className={`text-lg font-bold ${latestData?.costVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${latestData?.costVariance.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-orange-600 font-medium">Forecast Variance</div>
            <div className={`text-lg font-bold ${(latestData?.estimateAtCompletion || 0) <= (latestData?.budgetAtCompletion || 0) ? 'text-green-600' : 'text-red-600'}`}>
              ${((latestData?.estimateAtCompletion || 0) - (latestData?.budgetAtCompletion || 0)).toLocaleString()}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-purple-600 font-medium">Project Health</div>
            <div className="flex items-center gap-1">
              {spi >= 0.9 && cpi >= 0.9 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-bold">Healthy</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-bold">At Risk</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
