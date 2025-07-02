
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface LaborReportProps {
  data: {
    totalExpenses: number;
    expensesByCategory: Record<string, number>;
    expensesByProject: Record<string, number>;
  };
}

export function LaborReport({ data }: LaborReportProps) {
  const categoryData = Object.entries(data.expensesByCategory || {}).map(([category, amount]) => ({
    category,
    amount,
    percentage: ((amount / data.totalExpenses) * 100).toFixed(1)
  }));

  const projectData = Object.entries(data.expensesByProject || {}).slice(0, 10).map(([projectId, amount]) => ({
    project: `Project ${projectId.slice(-6)}`,
    amount,
    percentage: ((amount / data.totalExpenses) * 100).toFixed(1)
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Labor Costs</p>
                <p className="text-2xl font-bold text-blue-900">
                  ${data.totalExpenses?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Projects</p>
                <p className="text-2xl font-bold text-green-900">
                  {Object.keys(data.expensesByProject || {}).length}
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-full">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Avg Cost per Project</p>
                <p className="text-2xl font-bold text-orange-900">
                  ${Math.round(data.totalExpenses / Math.max(Object.keys(data.expensesByProject || {}).length, 1)).toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-500 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Top Category</p>
                <p className="text-lg font-bold text-purple-900">
                  {categoryData.length > 0 ? categoryData.sort((a, b) => b.amount - a.amount)[0].category : 'N/A'}
                </p>
              </div>
              <div className="bg-purple-500 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expenses by Category */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              Labor Costs by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="category" 
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'Amount']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenses by Project (Pie Chart) */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <div className="bg-green-500 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              Project Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectData.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ project, percentage }) => `${project} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {projectData.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'Amount']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryData.sort((a, b) => b.amount - a.amount).map((item, index) => (
                <div key={item.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-gray-900">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">${item.amount.toLocaleString()}</div>
                    <Badge variant="secondary" className="text-xs">
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Projects */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900">Top Projects by Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projectData.sort((a, b) => b.amount - a.amount).slice(0, 8).map((item, index) => (
                <div key={item.project} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{item.project}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">${item.amount.toLocaleString()}</div>
                    <Badge variant="outline" className="text-xs">
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
