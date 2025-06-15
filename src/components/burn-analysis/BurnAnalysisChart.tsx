
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface BurnData {
  month: string;
  plannedSpending: number;
  actualSpending: number;
  forecastedSpending: number;
  budgetThreshold: number;
}

interface BurnAnalysisChartProps {
  burnData: BurnData[];
  onExport: () => void;
  loading?: boolean;
}

export function BurnAnalysisChart({ burnData, onExport, loading = false }: BurnAnalysisChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Burn Rate Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check for budget overruns
  const hasOverrun = burnData.some(data => data.actualSpending > data.plannedSpending);
  const latestData = burnData[burnData.length - 1];
  const variancePercentage = latestData ? 
    ((latestData.actualSpending - latestData.plannedSpending) / latestData.plannedSpending) * 100 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            Burn Rate Analysis
            {hasOverrun && (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
          </CardTitle>
          {hasOverrun && (
            <p className="text-sm text-amber-600">
              Warning: Actual spending is {Math.abs(variancePercentage).toFixed(1)}% 
              {variancePercentage > 0 ? ' over' : ' under'} planned budget
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Select defaultValue="Monthly">
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Daily">Daily</SelectItem>
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
            plannedSpending: { label: "Planned Spending", color: "#3b82f6" },
            actualSpending: { label: "Actual Spending", color: "#06b6d4" },
            forecastedSpending: { label: "Forecasted Spending", color: "#10b981" },
            budgetThreshold: { label: "Budget Threshold", color: "#f59e0b" }
          }}
          className="h-[400px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={burnData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
              />
              <Legend />
              
              {/* Budget threshold line */}
              <ReferenceLine 
                y={latestData?.budgetThreshold} 
                stroke="#f59e0b" 
                strokeDasharray="10 10" 
                label="Budget Limit"
              />
              
              <Line 
                type="monotone" 
                dataKey="plannedSpending" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: "#3b82f6" }}
                name="Planned"
              />
              <Line 
                type="monotone" 
                dataKey="actualSpending" 
                stroke="#06b6d4" 
                strokeWidth={2}
                dot={{ fill: "#06b6d4" }}
                name="Actual"
              />
              <Line 
                type="monotone" 
                dataKey="forecastedSpending" 
                stroke="#10b981" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "#10b981" }}
                name="Forecast"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
