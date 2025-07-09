
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line } from 'recharts';
import { DollarSign, TrendingUp, PieChart, BarChart3 } from 'lucide-react';

interface FinancialReportsProps {
  data: {
    revenueRecognition: any[];
    profitLossByProject: any[];
    cashFlowProjection: any[];
  };
}

export function FinancialReports({ data }: FinancialReportsProps) {
  const { revenueRecognition, profitLossByProject, cashFlowProjection } = data;

  // Currency formatter function to ensure two decimal places
  const formatCurrency = (value: number) => {
    return `$${Number(value).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Revenue Recognition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Revenue Recognition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={revenueRecognition}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
              <Area type="monotone" dataKey="recognized" stackId="1" stroke="#8884d8" fill="#8884d8" />
              <Area type="monotone" dataKey="deferred" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profit & Loss by Project */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Profit & Loss by Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={profitLossByProject}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="projectName" />
              <YAxis />
              <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
              <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
              <Bar dataKey="costs" fill="#ff7300" name="Costs" />
              <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Flow Projection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cash Flow Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashFlowProjection}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
              <Line type="monotone" dataKey="inflow" stroke="#82ca9d" strokeWidth={2} name="Cash Inflow" />
              <Line type="monotone" dataKey="outflow" stroke="#ff7300" strokeWidth={2} name="Cash Outflow" />
              <Line type="monotone" dataKey="net" stroke="#8884d8" strokeWidth={2} name="Net Cash Flow" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
