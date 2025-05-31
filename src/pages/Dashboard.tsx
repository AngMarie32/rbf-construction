
import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { mockProjects } from '@/data/mockData';
import { Building, DollarSign, Calendar, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  const totalProjects = mockProjects.length;
  const activeProjects = mockProjects.filter(p => p.status === 'Open').length;
  const planningProjects = mockProjects.filter(p => p.status === 'Planning').length;
  const totalContractValue = mockProjects.reduce((sum, p) => sum + p.contractValue, 0);

  const recentProjects = mockProjects.slice(0, 3);

  return (
    <Layout 
      title="Dashboard" 
      subtitle="Welcome back! Here's an overview of your construction projects."
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Projects"
            value={totalProjects}
            change="+2 this month"
            changeType="positive"
            icon={<Building className="w-6 h-6" />}
          />
          <StatCard
            title="Active Projects"
            value={activeProjects}
            change="2 on schedule"
            changeType="positive"
            icon={<Calendar className="w-6 h-6" />}
          />
          <StatCard
            title="Planning Phase"
            value={planningProjects}
            change="1 starting soon"
            changeType="neutral"
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <StatCard
            title="Total Contract Value"
            value={`$${(totalContractValue / 1000000).toFixed(1)}M`}
            change="+15% from last quarter"
            changeType="positive"
            icon={<DollarSign className="w-6 h-6" />}
          />
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Projects</CardTitle>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex flex-col space-y-2">
                <FileText className="w-6 h-6" />
                <span className="text-sm">New Proposal</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col space-y-2">
                <Calculator className="w-6 h-6" />
                <span className="text-sm">Bid Planner</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col space-y-2">
                <DollarSign className="w-6 h-6" />
                <span className="text-sm">Payment App</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col space-y-2">
                <Calendar className="w-6 h-6" />
                <span className="text-sm">Schedule</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
