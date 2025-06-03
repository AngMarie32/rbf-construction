import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Calculator, FileText, Upload, Trash2, Filter, Download, Settings, Calendar, TrendingUp, Eye, Edit3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SOVItem {
  id: string;
  itemNumber: string;
  category: string;
  description: string;
  originalContractSum: number;
  approvedChanges: number;
  revisedContractSum: number;
  workCompleted: number;
  percentComplete: number;
  balanceToFinish: number;
  retainage: number;
}

interface Project {
  id: string;
  name: string;
  projectCode: string;
  client: string;
  address: string;
}

interface ChangeOrder {
  id: string;
  number: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  user: string;
  revision: string;
}

export default function ScheduleOfValues() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'divisions' | 'summary'>('divisions');
  const [timeFilter, setTimeFilter] = useState('All Time');
  const [showHistory, setShowHistory] = useState(false);

  // Summary calculations
  const totalContractSum = sovItems.reduce((sum, item) => sum + item.revisedContractSum, 0);
  const completedToDate = sovItems.reduce((sum, item) => sum + item.workCompleted, 0);
  const remainingBalance = totalContractSum - completedToDate;
  const overallProgress = totalContractSum > 0 ? (completedToDate / totalContractSum) * 100 : 0;

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchSOVItems();
      fetchChangeOrders();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code, client, address')
        .order('name');

      if (error) throw error;
      
      // Map the snake_case data to camelCase to match the Project interface
      const mappedProjects = (data || []).map(project => ({
        id: project.id,
        name: project.name,
        projectCode: project.project_code || '',
        client: project.client || '',
        address: project.address || ''
      }));
      
      setProjects(mappedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchChangeOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', selectedProject)
        .order('date', { ascending: false });

      if (error) throw error;

      const mappedOrders = (data || []).map((order, index) => ({
        id: order.id,
        number: order.number,
        description: order.description,
        amount: order.amount,
        date: new Date(order.date).toLocaleDateString(),
        status: order.status,
        user: 'System User',
        revision: `#${index + 1}`
      }));

      setChangeOrders(mappedOrders);
    } catch (error) {
      console.error('Error fetching change orders:', error);
    }
  };

  const fetchSOVItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', selectedProject)
        .order('item_number');

      if (error) throw error;

      const mappedItems = (data || []).map(item => {
        const approvedChanges = changeOrders
          .filter(co => co.status === 'Approved')
          .reduce((sum, co) => sum + co.amount, 0);
        
        return {
          id: item.id,
          itemNumber: item.item_number,
          category: item.category,
          description: item.description,
          originalContractSum: item.scheduled_value,
          approvedChanges: approvedChanges * 0.1, // Distribute changes proportionally
          revisedContractSum: item.scheduled_value + (approvedChanges * 0.1),
          workCompleted: item.total_completed_and_stored || 0,
          percentComplete: item.percent_complete || 0,
          balanceToFinish: (item.scheduled_value + (approvedChanges * 0.1)) - (item.total_completed_and_stored || 0),
          retainage: (item.total_completed_and_stored || 0) * 0.1
        };
      });

      setSovItems(mappedItems);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load SOV items');
    } finally {
      setLoading(false);
    }
  };

  const updateSOVItem = async (id: string, field: string, value: number) => {
    try {
      const updateData: any = { [field]: value };
      
      if (field === 'workCompleted') {
        const item = sovItems.find(i => i.id === id);
        if (item) {
          const percentComplete = item.revisedContractSum > 0 ? (value / item.revisedContractSum) * 100 : 0;
          updateData.percent_complete = Math.min(percentComplete, 100);
          updateData.total_completed_and_stored = value;
        }
      }

      const { error } = await supabase
        .from('sov_items')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      fetchSOVItems();
      toast.success('SOV item updated successfully');
    } catch (error) {
      console.error('Error updating SOV item:', error);
      toast.error('Failed to update SOV item');
    }
  };

  const generateG702 = () => {
    if (sovItems.length === 0) {
      toast.error('No SOV items to generate G702 application');
      return;
    }
    
    window.location.href = `/payment-apps?project=${selectedProject}&action=generate`;
  };

  const exportToPDF = () => {
    toast.success('PDF export functionality will be implemented');
  };

  const editValues = () => {
    toast.success('Edit values mode activated');
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  const getCompletionColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <Layout title="Schedule of Values" subtitle="Track project progress and payment applications">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <span>Project Management</span>
              <span className="mx-2">›</span>
              <span className="text-blue-600">Schedule of Values</span>
            </div>
            <h1 className="text-3xl font-bold">Schedule of Values</h1>
            {selectedProjectData && (
              <p className="text-gray-600 mt-1">
                {selectedProjectData.name} | Project #{selectedProjectData.projectCode}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.open('/payment-apps', '_blank')}>
              <FileText className="w-4 h-4 mr-2" />
              G703 & G702
            </Button>
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={editValues}>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Values
            </Button>
          </div>
        </div>

        {/* Project Selection */}
        <Card>
          <CardContent className="pt-6">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} - {project.client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProject && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Contract Sum</p>
                      <p className="text-sm text-gray-500">Including approved change orders</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calculator className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2">${totalContractSum.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Completed to Date</p>
                      <p className="text-sm text-gray-500">{overallProgress.toFixed(0)}% of total contract value</p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2 text-green-600">${completedToDate.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Remaining Balance</p>
                      <p className="text-sm text-gray-500">{(100 - overallProgress).toFixed(0)}% of total contract value</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Calculator className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2">${remainingBalance.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="text-sm text-gray-500">3 days ago by John Doe</p>
                    </div>
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold mt-2">May 5, 2025</p>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Time">All Time</SelectItem>
                    <SelectItem value="This Month">This Month</SelectItem>
                    <SelectItem value="Last Month">Last Month</SelectItem>
                    <SelectItem value="This Quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  View Options
                </Button>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Options
              </Button>
            </div>

            {/* Progress Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Project Completion Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Progress chart visualization will be implemented</p>
                </div>
              </CardContent>
            </Card>

            {/* SOV Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8">Loading SOV items...</div>
                ) : sovItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No SOV items found. Import from bid planner or add items manually.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">ITEM/DIVISION</TableHead>
                          <TableHead className="font-semibold">DESCRIPTION OF WORK</TableHead>
                          <TableHead className="font-semibold">ORIGINAL CONTRACT SUM</TableHead>
                          <TableHead className="font-semibold">APPROVED CHANGES</TableHead>
                          <TableHead className="font-semibold">REVISED CONTRACT SUM</TableHead>
                          <TableHead className="font-semibold">WORK COMPLETED</TableHead>
                          <TableHead className="font-semibold">% COMPLETE</TableHead>
                          <TableHead className="font-semibold">BALANCE TO FINISH</TableHead>
                          <TableHead className="font-semibold">ACTIONS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sovItems.map((item) => (
                          <TableRow key={item.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{item.itemNumber}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.description}</div>
                                <div className="text-sm text-gray-500">{item.category}</div>
                              </div>
                            </TableCell>
                            <TableCell>${item.originalContractSum.toLocaleString()}</TableCell>
                            <TableCell className="text-blue-600">
                              ${item.approvedChanges.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              ${item.revisedContractSum.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.workCompleted}
                                onChange={(e) => updateSOVItem(item.id, 'workCompleted', parseFloat(e.target.value) || 0)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${getCompletionColor(item.percentComplete)}`}
                                    style={{ width: `${Math.min(item.percentComplete, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium">
                                  {item.percentComplete.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>${item.balanceToFinish.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-100 font-semibold">
                          <TableCell colSpan={2}>TOTAL CONTRACT</TableCell>
                          <TableCell>${sovItems.reduce((sum, item) => sum + item.originalContractSum, 0).toLocaleString()}</TableCell>
                          <TableCell className="text-blue-600">
                            ${sovItems.reduce((sum, item) => sum + item.approvedChanges, 0).toLocaleString()}
                          </TableCell>
                          <TableCell>${totalContractSum.toLocaleString()}</TableCell>
                          <TableCell>${completedToDate.toLocaleString()}</TableCell>
                          <TableCell>{overallProgress.toFixed(0)}%</TableCell>
                          <TableCell>${remainingBalance.toLocaleString()}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Historical Changes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Historical Changes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
                  {showHistory ? 'Hide History' : 'Show History'}
                </Button>
              </CardHeader>
              {showHistory && (
                <CardContent>
                  <div className="space-y-4">
                    {changeOrders.map((order) => (
                      <div key={order.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">Change Order {order.number} Approved</span>
                            <Badge variant="secondary">{order.revision}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{order.date} by {order.user}</p>
                          <p className="text-sm">{order.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">+${order.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
