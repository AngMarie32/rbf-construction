
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/dashboard/StatCard';
import { CompanyScheduleWidget } from '@/components/dashboard/CompanyScheduleWidget';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { FinancialDateFilter } from '@/components/dashboard/FinancialDateFilter';
import { DollarSign, Calendar, Users, Building2, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalRevenue: number;
  totalExpenses: number;
  totalEquipment: number;
  availableEquipment: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    totalEquipment: 0,
    availableEquipment: 0
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [financialDateRange, setFinancialDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchDashboardStats();
  }, [dateRange, financialDateRange]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch projects stats
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, status, contract_value');

      if (projectsError) throw projectsError;

      // Fetch equipment stats
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('id, status');

      if (equipmentError) throw equipmentError;

      // Calculate stats
      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter(p => p.status === 'Active').length || 0;
      const totalRevenue = projects?.reduce((sum, p) => sum + (p.contract_value || 0), 0) || 0;
      
      const totalEquipment = equipment?.length || 0;
      const availableEquipment = equipment?.filter(e => e.status === 'Available').length || 0;

      setStats({
        totalProjects,
        activeProjects,
        totalRevenue,
        totalExpenses: 0, // Would need expenses table
        totalEquipment,
        availableEquipment
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    setDateRange({
      start: range.from.toISOString(),
      end: range.to.toISOString()
    });
  };

  const handleFinancialDateRangeChange = (range: { from: Date; to: Date }) => {
    setFinancialDateRange({
      start: range.from.toISOString(),
      end: range.to.toISOString()
    });
  };

  return (
    <Layout title="Dashboard" subtitle="Overview of your construction business">
      <div className="space-y-6">
        {/* Date Filters */}
        <div className="flex flex-wrap gap-4">
          <DateFilter onDateRangeChange={handleDateRangeChange} />
          <FinancialDateFilter onDateRangeChange={handleFinancialDateRangeChange} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Projects"
            value={stats.totalProjects.toString()}
            icon={<Building2 className="w-5 h-5" />}
            trend={{ value: 12, isPositive: true }}
            loading={loading}
          />
          <StatCard
            title="Active Projects"
            value={stats.activeProjects.toString()}
            icon={<Calendar className="w-5 h-5" />}
            trend={{ value: 8, isPositive: true }}
            loading={loading}
          />
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            trend={{ value: 15, isPositive: true }}
            loading={loading}
          />
          <StatCard
            title="Equipment Available"
            value={`${stats.availableEquipment}/${stats.totalEquipment}`}
            icon={<Users className="w-5 h-5" />}
            trend={{ value: 3, isPositive: false }}
            loading={loading}
          />
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Schedule Widget */}
          <div className="lg:col-span-1">
            <CompanyScheduleWidget />
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">New project created</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Equipment maintenance completed</p>
                      <p className="text-xs text-muted-foreground">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Payment application submitted</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alerts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border-l-4 border-orange-500 bg-orange-50">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Equipment maintenance due</p>
                  <p className="text-xs text-muted-foreground">Excavator #3 requires scheduled maintenance</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border-l-4 border-blue-500 bg-blue-50">
                <Calendar className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Upcoming project deadline</p>
                  <p className="text-xs text-muted-foreground">Site preparation phase due in 3 days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
