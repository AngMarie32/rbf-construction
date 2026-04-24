import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  FileText, 
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateChangeOrderDialog } from '@/components/change-orders/CreateChangeOrderDialog';
import { ChangeOrderTemplatesDialog } from '@/components/change-orders/ChangeOrderTemplatesDialog';
import { FinancialImpactDashboard } from '@/components/change-orders/FinancialImpactDashboard';
import { format } from 'date-fns';
import { SendForSignatureButton } from '@/components/esign/SendForSignatureButton';

interface ChangeOrder {
  id: string;
  project_id: string;
  number: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  created_at: string;
}

export default function ChangeOrders() {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('dashboard');

  useEffect(() => {
    fetchChangeOrders();
  }, []);

  const fetchChangeOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching change orders:', error);
        toast.error('Failed to load change orders');
      } else {
        setChangeOrders(data || []);
      }
    } catch (error) {
      console.error('Error fetching change orders:', error);
      toast.error('Failed to load change orders');
    }
  };

  const filteredChangeOrders = changeOrders.filter(co => {
    const searchMatch = co.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        co.description.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = filterStatus === 'All' || co.status === filterStatus;
    return searchMatch && statusMatch;
  });

  const handleSaveChangeOrder = () => {
    fetchChangeOrders();
    setCreateDialogOpen(false);
    toast.success('Change order created successfully');
  };

  return (
    <Layout title="Change Orders" subtitle="Manage project change orders and track approvals">
      <div className="space-y-6">
        {/* Enhanced Header with Quick Guide */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Change Orders</h1>
                <p className="text-gray-600">Track project modifications and their financial impact</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setCreateDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Change Order
                </Button>
                <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="text"
            placeholder="Search change orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="col-span-1">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Change Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Change Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredChangeOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredChangeOrders.map(co => (
                  <div key={co.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{co.number}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{co.status}</Badge>
                        <SendForSignatureButton
                          source="change_order"
                          sourceId={co.id}
                          projectId={co.project_id}
                          title={`Change Order ${co.number}`}
                          variant="outline"
                          size="sm"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{co.description}</p>
                    <div className="flex justify-between text-sm">
                      <span>Amount: ${co.amount?.toLocaleString()}</span>
                      <span>Date: {format(new Date(co.date), 'PPP')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No change orders found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Change Order Dialog */}
      <CreateChangeOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId="default-project"
        onSave={handleSaveChangeOrder}
      />

      {/* Change Order Templates Dialog */}
      <ChangeOrderTemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelectTemplate={() => {}}
      />
    </Layout>
  );
}
