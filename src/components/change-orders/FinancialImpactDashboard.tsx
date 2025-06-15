
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface FinancialImpactProps {
  changeOrders: any[];
  projectBudget: number;
}

export function FinancialImpactDashboard({ changeOrders, projectBudget }: FinancialImpactProps) {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

  useEffect(() => {
    generateTrendData();
    generateCategoryData();
    generateStatusData();
  }, [changeOrders]);

  const generateTrendData = () => {
    const monthlyData = changeOrders.reduce((acc, co) => {
      const month = new Date(co.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { month, amount: 0, count: 0 };
      }
      acc[month].amount += co.amount;
      acc[month].count += 1;
      return acc;
    }, {});

    setTrendData(Object.values(monthlyData));
  };

  const generateCategoryData = () => {
    const categories = changeOrders.reduce((acc, co) => {
      const category = co.description.includes('Material') ? 'Material' :
                     co.description.includes('Labor') ? 'Labor' :
                     co.description.includes('Equipment') ? 'Equipment' :
                     co.description.includes('Scope') ? 'Scope Change' : 'Other';
      
      if (!acc[category]) {
        acc[category] = { category, amount: 0, count: 0 };
      }
      acc[category].amount += co.amount;
      acc[category].count += 1;
      return acc;
    }, {});

    setCategoryData(Object.values(categories));
  };

  const generateStatusData = () => {
    const statuses = changeOrders.reduce((acc, co) => {
      if (!acc[co.status]) {
        acc[co.status] = { status: co.status, amount: 0, count: 0 };
      }
      acc[co.status].amount += co.amount;
      acc[co.status].count += 1;
      return acc;
    }, {});

    setStatusData(Object.values(statuses));
  };

  const totalChangeOrderValue = changeOrders.reduce((sum, co) => sum + co.amount, 0);
  const approvedValue = changeOrders.filter(co => co.status === 'Approved').reduce((sum, co) => sum + co.amount, 0);
  const pendingValue = changeOrders.filter(co => co.status === 'Submitted').reduce((sum, co) => sum + co.amount, 0);
  
  const budgetImpact = (totalChangeOrderValue / projectBudget) * 100;
  const approvedImpact = (approvedValue / projectBudget) * 100;

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CO Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalChangeOrderValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {budgetImpact.toFixed(1)}% of project budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Value</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${approvedValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {approvedImpact.toFixed(1)}% of project budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">${pendingValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {changeOrders.filter(co => co.status === 'Submitted').length} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Impact</CardTitle>
            {budgetImpact > 10 ? (
              <TrendingUp className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={Math.min(budgetImpact, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {budgetImpact.toFixed(1)}% of ${projectBudget.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Change Order Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'amount' ? `$${Number(value).toLocaleString()}` : value,
                    name === 'amount' ? 'Amount' : 'Count'
                  ]}
                />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']} />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Budget Overrun Risk</span>
                <Badge variant={budgetImpact > 15 ? "destructive" : budgetImpact > 10 ? "default" : "secondary"}>
                  {budgetImpact > 15 ? "High" : budgetImpact > 10 ? "Medium" : "Low"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending Approval Value</span>
                <Badge variant={pendingValue > 50000 ? "destructive" : pendingValue > 25000 ? "default" : "secondary"}>
                  ${pendingValue.toLocaleString()}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Change Order Frequency</span>
                <Badge variant={changeOrders.length > 10 ? "destructive" : changeOrders.length > 5 ? "default" : "secondary"}>
                  {changeOrders.length} orders
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
