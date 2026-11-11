import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, FileText, Download, GitPullRequestArrow, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateChangeOrderDialog } from '@/components/change-orders/CreateChangeOrderDialog';
import { ChangeOrderTemplatesDialog } from '@/components/change-orders/ChangeOrderTemplatesDialog';
import { format } from 'date-fns';
import { SendForSignatureButton } from '@/components/esign/SendForSignatureButton';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';

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

interface ProjectOption {
  id: string;
  name: string;
  status?: string | null;
}

const statusTone: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Submitted: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  Approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Rejected: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

export default function ChangeOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectFilter = searchParams.get('project') || 'all';
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [createDialogOpen, setCreateDialogOpen] = useState(searchParams.get('new') === '1');
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    fetchChangeOrders();
    supabase
      .from('projects')
      .select('id, name, status').is('archived_at', null)
      .then(({ data }) => setProjects(sortProjectsOpenFirst(data || [])));
  }, []);

  const fetchChangeOrders = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const setProjectFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('project');
    else next.set('project', value);
    next.delete('new');
    setSearchParams(next, { replace: true });
  };

  const projectName = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p) => (map[p.id] = p.name));
    return map;
  }, [projects]);

  const filteredChangeOrders = changeOrders.filter((co) => {
    const q = searchQuery.toLowerCase();
    const searchMatch = (co.number || '').toLowerCase().includes(q) || (co.description || '').toLowerCase().includes(q);
    const statusMatch = filterStatus === 'All' || co.status === filterStatus;
    const projectMatch = projectFilter === 'all' || co.project_id === projectFilter;
    return searchMatch && statusMatch && projectMatch;
  });

  const isFiltered = searchQuery !== '' || filterStatus !== 'All';
  const selectedProjectName = projectFilter !== 'all' ? projectName[projectFilter] : undefined;

  const handleSaveChangeOrder = () => {
    fetchChangeOrders();
    setCreateDialogOpen(false);
  };

  const pageActions = (
    <>
      <Button onClick={() => setCreateDialogOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        New Change Order
      </Button>
      <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
        <FileText className="w-4 h-4 mr-2" />
        Templates
      </Button>
      <Button variant="outline">
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
    </>
  );

  return (
    <Layout
      title={selectedProjectName ? `Change Orders · ${selectedProjectName}` : 'Change Orders'}
      subtitle="Track extra work and price changes, and get them signed by the owner"
      actions={pageActions}
    >
      <div className="space-y-6">
        {selectedProjectName && (
          <Link
            to={`/projects/${projectFilter}?tab=change-orders`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to {selectedProjectName}
          </Link>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="Search by number or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">Loading change orders…</CardContent></Card>
        ) : filteredChangeOrders.length === 0 ? (
          <EmptyState
            icon={GitPullRequestArrow}
            filtered={isFiltered}
            onClearFilters={() => { setSearchQuery(''); setFilterStatus('All'); }}
            title={selectedProjectName ? `No change orders on ${selectedProjectName} yet` : 'Create your first change order'}
            description="When the owner asks for extra work or the scope changes, write it up here. Price it, send it for e-signature, and keep a clear record of every approved change on the job."
            action={{ label: 'Create your first change order', onClick: () => setCreateDialogOpen(true) }}
            secondaryAction={{ label: 'Start from a template', icon: FileText, onClick: () => setTemplatesOpen(true) }}
            steps={['Describe the change and price it', 'Send it to the owner for signature', 'Track approved changes against the contract']}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {filteredChangeOrders.length} change order{filteredChangeOrders.length === 1 ? '' : 's'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredChangeOrders.map((co) => (
                <div key={co.id} className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold">CO #{co.number}</h4>
                      {projectName[co.project_id] && (
                        <Link to={`/projects/${co.project_id}?tab=change-orders`} className="text-xs text-primary hover:underline">
                          {projectName[co.project_id]}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusTone[co.status] || 'bg-muted text-muted-foreground'} variant="secondary">{co.status}</Badge>
                      <SendForSignatureButton
                        source="change_order"
                        sourceId={co.id}
                        projectId={co.project_id}
                        title={`Change Order ${co.number}`}
                        documentType="Change Order"
                        variant="outline"
                        size="sm"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{co.description}</p>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium tabular-nums">${co.amount?.toLocaleString()}</span>
                    <span className="text-muted-foreground">{co.date ? format(new Date(co.date), 'PPP') : ''}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <CreateChangeOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectFilter !== 'all' ? projectFilter : null}
        onSave={handleSaveChangeOrder}
      />

      <ChangeOrderTemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelectTemplate={() => {}}
      />
    </Layout>
  );
}
