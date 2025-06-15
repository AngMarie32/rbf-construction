
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Building, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface ProjectReportsProps {
  data: {
    projectStatus: any[];
    budgetPerformance: any[];
    timelinePerformance: any[];
    changeOrderImpact: any[];
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function ProjectReports({ data }: ProjectReportsProps) {
  const { projectStatus, budgetPerformance, timelinePerformance, changeOrderImpact } = data;

  return (
    <div className="space-y-6">
      {/* Project Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Project Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectStatus}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {projectStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timeline Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timelinePerformance.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.onTime ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{item.projectName}</p>
                      <p className="text-sm text-gray-600">{item.manager}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.daysVariance > 0 ? '+' : ''}{item.daysVariance} days</p>
                    <p className="text-sm text-gray-600">vs planned</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={budgetPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="projectName" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
              <Bar dataKey="budgeted" fill="#8884d8" name="Budgeted" />
              <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Change Order Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Change Order Impact Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={changeOrderImpact}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Change Order Value']} />
              <Line type="monotone" dataKey="changeOrderValue" stroke="#ff7300" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
