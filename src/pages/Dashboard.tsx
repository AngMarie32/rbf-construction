
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { NewProposalDialog } from '@/components/proposals/NewProposalDialog';
import { Building, DollarSign, Calendar, TrendingUp, FileText, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Project } from '@/types';
import { useNavigate } from 'react-router-dom';

interface DatabaseProject {
  id: string;
  name: string;
  type: string;
  contract_value: number;
  status: string;
  due_date: string | null;
  start_date: string | null;
  completion_percentage: number | null;
  address: string | null;
  project_code: string | null;
  client: string | null;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database response to our Project interface
      const mappedProjects: Project[] = (data || []).map((dbProject: DatabaseProject) => ({
        id: dbProject.id,
        name: dbProject.name,
        type: dbProject.type,
        contractValue: dbProject.contract_value,
        status: dbProject.status as Project['status'],
        startDate: dbProject.start_date ? new Date(dbProject.start_date) : new Date(),
        dueDate: dbProject.due_date ? new Date(dbProject.due_date) : new Date(),
        completionPercentage: dbProject.completion_percentage || 0,
        address: dbProject.address || '',
        projectCode: dbProject.project_code || '',
        client: dbProject.client || '',
        createdAt: new Date(dbProject.created_at),
        updatedAt: new Date(dbProject.updated_at)
      }));
      
      setProjects(mappedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'Open').length;
  const planningProjects = projects.filter(p => p.status === 'Planning').length;
  const totalContractValue = projects.reduce((sum, p) => sum + p.contractValue, 0);

  const recentProjects = projects.slice(0, 3);

  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="Welcome back! Here's an overview of your construction projects.">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

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
            change={totalProjects > 0 ? "+2 this month" : "No projects yet"}
            changeType={totalProjects > 0 ? "positive" : "neutral"}
            icon={<Building className="w-6 h-6" />}
          />
          <StatCard
            title="Active Projects"
            value={activeProjects}
            change={activeProjects > 0 ? `${activeProjects} on schedule` : "No active projects"}
            changeType={activeProjects > 0 ? "positive" : "neutral"}
            icon={<Calendar className="w-6 h-6" />}
          />
          <StatCard
            title="Planning Phase"
            value={planningProjects}
            change={planningProjects > 0 ? "1 starting soon" : "No projects in planning"}
            changeType="neutral"
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <StatCard
            title="Total Contract Value"
            value={totalContractValue > 0 ? `$${(totalContractValue / 1000000).toFixed(1)}M` : "$0"}
            change={totalContractValue > 0 ? "+15% from last quarter" : "No contracts yet"}
            changeType={totalContractValue > 0 ? "positive" : "neutral"}
            icon={<DollarSign className="w-6 h-6" />}
          />
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Projects</CardTitle>
            <NewProjectDialog onProjectCreated={fetchProjects} />
          </CardHeader>
          <CardContent>
            {recentProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">No projects found. Create your first project to get started!</p>
                <div className="mt-4">
                  <NewProjectDialog onProjectCreated={fetchProjects} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <NewProposalDialog onProposalCreated={() => {}} 
                trigger={
                  <Button variant="outline" className="h-20 flex flex-col space-y-2">
                    <FileText className="w-6 h-6" />
                    <span className="text-sm">New Proposal</span>
                  </Button>
                }
              />
              <Button 
                variant="outline" 
                className="h-20 flex flex-col space-y-2"
                onClick={() => navigate('/bid-planner')}
              >
                <Calculator className="w-6 h-6" />
                <span className="text-sm">Bid Planner</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col space-y-2"
                onClick={() => navigate('/payment-apps')}
              >
                <DollarSign className="w-6 h-6" />
                <span className="text-sm">Payment App</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col space-y-2"
                onClick={() => navigate('/sov')}
              >
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
