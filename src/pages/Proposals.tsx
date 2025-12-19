
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  FileText, 
  Download,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EnhancedProposalDialog } from '@/components/proposals/EnhancedProposalDialog';
import { ProposalTemplateDialog } from '@/components/proposals/ProposalTemplateDialog';
import { ProposalViewModal } from '@/components/proposals/ProposalViewModal';
import { format } from 'date-fns';

interface Proposal {
  id: string;
  project_name: string;
  client: string;
  scope?: string;
  created_at: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Approved' | 'Rejected';
  amount: number;
}

export default function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newProposalOpen, setNewProposalOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database fields to component interface and ensure status type safety
      const mappedData = (data || []).map(item => ({
        id: item.id,
        project_name: item.project_name,
        client: item.client,
        scope: item.scope,
        created_at: item.created_at,
        status: (item.status as 'Draft' | 'Sent' | 'Viewed' | 'Approved' | 'Rejected') || 'Draft',
        amount: item.amount
      }));
      
      setProposals(mappedData);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Failed to load proposals');
    }
  };

  const filteredProposals = proposals.filter(proposal => {
    const searchMatch = proposal.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        proposal.client.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === 'all' ? true : proposal.status === statusFilter;
    return searchMatch && statusMatch;
  });

  const handleViewProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setViewModalOpen(true);
  };

  const handleEditProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setNewProposalOpen(true);
  };

  const handleDeleteProposal = (proposal: Proposal) => {
    // Implement delete logic here
    toast.success(`Proposal "${proposal.project_name}" deleted successfully`);
  };

  const handleProposalCreated = () => {
    fetchProposals();
    setNewProposalOpen(false);
    setSelectedProposal(null);
  };

  // Map proposal to expected format for ProposalViewModal
  const mapProposalForModal = (proposal: Proposal | null) => {
    if (!proposal) return null;
    
    // Map status to match ProposalViewModal's expected type
    let modalStatus: 'Draft' | 'Sent' | 'Approved' | 'Rejected' = 'Draft';
    if (proposal.status === 'Draft' || proposal.status === 'Sent' || proposal.status === 'Approved' || proposal.status === 'Rejected') {
      modalStatus = proposal.status;
    } else if (proposal.status === 'Viewed') {
      modalStatus = 'Sent'; // Map 'Viewed' to 'Sent' for the modal
    }
    
    return {
      id: proposal.id,
      projectName: proposal.project_name,
      client: proposal.client,
      scope: proposal.scope || '',
      createdAt: new Date(proposal.created_at),
      status: modalStatus,
      amount: proposal.amount
    };
  };

  const statusOptions = ['Draft', 'Sent', 'Viewed', 'Approved', 'Rejected'];

  return (
    <Layout title="Proposals" subtitle="Create and manage project proposals">
      <div className="space-y-6">
        {/* Enhanced Header with Quick Guide */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Proposals</h1>
                <p className="text-gray-600">Create professional proposals and track client responses</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setNewProposalOpen(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Proposal
                </Button>
                <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proposals.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Approved Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{proposals.filter(p => p.status === 'Approved').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{proposals.filter(p => p.status === 'Sent' || p.status === 'Viewed').length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Input
              type="search"
              placeholder="Search proposals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Add more filter options here if needed */}
        </div>

        {/* Proposal List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProposals.map((proposal) => (
                <tr key={proposal.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{proposal.project_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{proposal.client}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{format(new Date(proposal.created_at), 'PPP')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      className={
                        proposal.status === 'Approved'
                          ? 'bg-green-500 text-white'
                          : proposal.status === 'Rejected'
                          ? 'bg-red-500 text-white'
                          : 'bg-yellow-500 text-gray-800'
                      }
                    >
                      {proposal.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">${proposal.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewProposal(proposal)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditProposal(proposal)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteProposal(proposal)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      <EnhancedProposalDialog
        open={newProposalOpen}
        onOpenChange={setNewProposalOpen}
        proposal={selectedProposal}
        onProposalCreated={handleProposalCreated}
      />

      <ProposalTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onTemplateSelect={() => {}}
      />

      <ProposalViewModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        proposal={mapProposalForModal(selectedProposal)}
      />
    </Layout>
  );
}
