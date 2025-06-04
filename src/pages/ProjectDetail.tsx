
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Project as ProjectType } from '@/types';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';

interface Project extends ProjectType {}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [billingData, setBillingData] = useState([]);
  const [sovItems, setSovItems] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);

  useEffect(() => {
    fetchProject();
    fetchProjectData();
  }, [id]);

  const fetchProject = async () => {
    if (!id) {
      toast.error('Project ID is missing.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform snake_case to camelCase to match Project type
      const transformedProject: Project = {
        id: data.id,
        name: data.name,
        type: data.type,
        contractValue: data.contract_value || 0,
        status: data.status as 'Planning' | 'Open' | 'Closed',
        startDate: new Date(data.start_date),
        dueDate: new Date(data.due_date),
        completionPercentage: data.completion_percentage || 0,
        address: data.address || '',
        projectCode: data.project_code || '',
        client: data.client || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      setProject(transformedProject);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project details.');
      setLoading(false);
    }
  };

  const fetchProjectData = async () => {
    if (!id) return;

    try {
      // Fetch billing data
      const { data: billing } = await supabase
        .from('project_billing')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      setBillingData(billing || []);

      // Fetch SOV items
      const { data: sov } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', id)
        .order('item_number')
        .limit(5);

      setSovItems(sov || []);

      // Fetch change orders
      const { data: changes } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', id)
        .order('date', { ascending: false })
        .limit(5);

      setChangeOrders(changes || []);
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  const handleUpdate = async () => {
    await fetchProject();
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Planning':
        return 'bg-yellow-500';
      case 'Open':
        return 'bg-green-500';
      case 'Closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleViewBurnAnalysis = () => {
    navigate(`/burn-analysis?project=${id}`);
  };

  if (loading) {
    return (
      <Layout title="Project Details" subtitle="Loading project details...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout title="Project Details" subtitle="Project not found">
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-gray-500">Project not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={project?.name || 'Project Details'} subtitle={`${project?.type} • ${project?.status}`}>
      <div className="space-y-6">
        {/* Project Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={`${getStatusColor(project.status)} text-white`}>
                    {project.status}
                  </Badge>
                  <span className="text-sm text-gray-500">#{project.projectCode || 'No Code'}</span>
                </div>
                <CardTitle className="text-2xl">{project.name}</CardTitle>
                <p className="text-gray-600 mt-1">{project.type}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleViewBurnAnalysis}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Burn Analysis
                </Button>
                <EditProjectDialog project={project} onProjectUpdated={handleUpdate} />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${project.contractValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total contract value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Start Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{format(new Date(project.startDate), 'MMM dd, yyyy')}</div>
              <p className="text-xs text-muted-foreground">
                Project start date
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{format(new Date(project.dueDate), 'MMM dd, yyyy')}</div>
              <p className="text-xs text-muted-foreground">
                Project due date
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`${activeTab === 'billing'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Billing
              </button>
              <button
                onClick={() => setActiveTab('sov')}
                className={`${activeTab === 'sov'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Schedule of Values
              </button>
              <button
                onClick={() => setActiveTab('changes')}
                className={`${activeTab === 'changes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Change Orders
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'overview' && (
              <Card>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Project Overview</h3>
                      <p className="text-gray-600">This project is a {project.type.toLowerCase()} project for {project.client}.</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold">Client Information</h3>
                      <p className="text-gray-600">Client: {project.client || 'No client specified'}</p>
                      <p className="text-gray-600">Address: {project.address || 'No address specified'}</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold">Project Progress</h3>
                      <p className="text-gray-600">Completion: {project.completionPercentage}%</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${project.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'billing' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Billing Records</CardTitle>
                  <Button onClick={() => navigate('/project-billing')}>View All</Button>
                </CardHeader>
                <CardContent>
                  {billingData.length > 0 ? (
                    <div className="space-y-4">
                      {billingData.map((bill: any) => (
                        <div key={bill.id} className="flex justify-between items-center p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{bill.invoice_number || `Billing ${bill.id.slice(0, 8)}`}</p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(bill.billing_period_start), 'MMM dd')} - {format(new Date(bill.billing_period_end), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${bill.billed_amount?.toLocaleString()}</p>
                            <Badge variant={bill.status === 'Paid' ? 'default' : 'secondary'}>
                              {bill.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No billing records found.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'sov' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Schedule of Values</CardTitle>
                  <Button onClick={() => navigate('/sov')}>View All</Button>
                </CardHeader>
                <CardContent>
                  {sovItems.length > 0 ? (
                    <div className="space-y-4">
                      {sovItems.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{item.item_number} - {item.description}</p>
                            <p className="text-sm text-gray-600">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${item.scheduled_value?.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">{item.percent_complete}% complete</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No SOV items found.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'changes' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Change Orders</CardTitle>
                  <Button onClick={() => navigate('/change-orders')}>View All</Button>
                </CardHeader>
                <CardContent>
                  {changeOrders.length > 0 ? (
                    <div className="space-y-4">
                      {changeOrders.map((change: any) => (
                        <div key={change.id} className="flex justify-between items-center p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">CO-{change.number}</p>
                            <p className="text-sm text-gray-600">{change.description}</p>
                            <p className="text-xs text-gray-500">{format(new Date(change.date), 'MMM dd, yyyy')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${change.amount?.toLocaleString()}</p>
                            <Badge variant={change.status === 'Approved' ? 'default' : 'secondary'}>
                              {change.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No change orders found.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
