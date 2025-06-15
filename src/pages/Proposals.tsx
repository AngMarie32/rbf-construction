import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { EnhancedProposalDialog } from '@/components/proposals/EnhancedProposalDialog';
import { ProposalViewModal } from '@/components/proposals/ProposalViewModal';
import { ProposalTemplateDialog } from '@/components/proposals/ProposalTemplateDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, FileText, Edit, Trash2, Eye, Download, Clipboard, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateProfessionalProposalPDF } from '@/utils/proposalPdfExport';
import { Proposal } from '@/types';

interface DatabaseProposal {
  id: string;
  project_name: string;
  client: string;
  client_address?: string;
  client_phone?: string;
  client_email?: string;
  project_address?: string;
  scope: string | null;
  amount: number;
  status: string;
  valid_days?: number;
  notes?: string;
  proposal_items?: any[];
  created_at: string;
  updated_at: string;
}

export default function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'projectName' | 'client' | 'amount' | 'status' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewingProposal, setViewingProposal] = useState<Proposal | null>(null);
  const [editingProposal, setEditingProposal] = useState<any>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, []);

  useEffect(() => {
    filterProposals();
  }, [proposals, searchTerm, statusFilter]);

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedProposals: Proposal[] = (data || []).map((dbProposal: DatabaseProposal) => ({
        id: dbProposal.id,
        projectName: dbProposal.project_name,
        client: dbProposal.client,
        clientAddress: dbProposal.client_address,
        clientPhone: dbProposal.client_phone,
        clientEmail: dbProposal.client_email,
        projectAddress: dbProposal.project_address,
        scope: dbProposal.scope || '',
        amount: dbProposal.amount,
        status: dbProposal.status as Proposal['status'],
        validDays: dbProposal.valid_days || 30,
        notes: dbProposal.notes,
        proposalItems: dbProposal.proposal_items || [],
        createdAt: new Date(dbProposal.created_at)
      }));
      
      setProposals(mappedProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const filterProposals = () => {
    let filtered = proposals;

    if (searchTerm) {
      filtered = filtered.filter(proposal =>
        proposal.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.client.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(proposal => proposal.status === statusFilter);
    }

    setFilteredProposals(filtered);
  };

  const deleteProposal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Proposal deleted successfully');
      fetchProposals();
    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Failed to delete proposal');
    }
  };

  const downloadProposalPDF = (proposal: Proposal) => {
    generateProfessionalProposalPDF({
      projectName: proposal.projectName,
      client: proposal.client,
      clientAddress: proposal.clientAddress,
      clientPhone: proposal.clientPhone,
      clientEmail: proposal.clientEmail,
      projectAddress: proposal.projectAddress,
      amount: proposal.amount,
      status: proposal.status,
      createdAt: proposal.createdAt,
      scope: proposal.scope,
      notes: proposal.notes,
      validDays: proposal.validDays,
      proposalItems: proposal.proposalItems
    });
    
    toast.success('Proposal PDF downloaded successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalValue = proposals.reduce((sum, proposal) => sum + proposal.amount, 0);

  const handleSort = (field: 'projectName' | 'client' | 'amount' | 'status' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredProposals = filteredProposals.sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;

    switch (sortField) {
      case 'projectName':
        aValue = a.projectName.toLowerCase();
        bValue = b.projectName.toLowerCase();
        break;
      case 'client':
        aValue = a.client.toLowerCase();
        bValue = b.client.toLowerCase();
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'status':
        aValue = a.status.toLowerCase();
        bValue = b.status.toLowerCase();
        break;
      case 'createdAt':
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
      default:
        aValue = a.createdAt;
        bValue = b.createdAt;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleTemplateSelect = (template: any) => {
    // Create a new proposal from the selected template
    const newProposal = {
      projectName: `${template.name} Project`,
      client: '',
      clientAddress: '',
      clientPhone: '',
      clientEmail: '',
      projectAddress: '',
      scope: template.description,
      amount: template.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
      status: 'Draft' as const,
      validDays: 30,
      notes: `Created from template: ${template.name}`,
      proposalItems: template.items || []
    };
    
    setEditingProposal(newProposal);
    setShowTemplateDialog(false);
    toast.success(`New proposal created from template "${template.name}"`);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return <ArrowUpDown className={`w-4 h-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />;
  };

  if (loading) {
    return (
      <Layout title="Proposals" subtitle="Manage your project proposals">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Proposals" subtitle="Manage your project proposals">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search proposals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
              <Clipboard className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <EnhancedProposalDialog 
              onProposalCreated={fetchProposals}
              proposal={editingProposal}
            />
          </div>
        </div>

        {/* Stats Cards - keeping existing structure */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{proposals.length}</div>
              <p className="text-sm text-gray-600">Total Proposals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {proposals.filter(p => p.status === 'Approved').length}
              </div>
              <p className="text-sm text-gray-600">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {proposals.filter(p => p.status === 'Sent').length}
              </div>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                ${totalValue.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Total Value</p>
            </CardContent>
          </Card>
        </div>

        {/* Proposals Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Proposals ({filteredProposals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProposals.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No proposals match your filters' 
                    : 'No proposals found. Create your first proposal to get started!'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <EnhancedProposalDialog onProposalCreated={fetchProposals} />
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('projectName')}
                      >
                        <div className="flex items-center">
                          Project Name
                          {getSortIcon('projectName')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('client')}
                      >
                        <div className="flex items-center">
                          Client
                          {getSortIcon('client')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('amount')}
                      >
                        <div className="flex items-center">
                          Amount
                          {getSortIcon('amount')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center">
                          Created
                          {getSortIcon('createdAt')}
                        </div>
                      </TableHead>
                      <TableHead className="w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndFilteredProposals.map((proposal) => (
                      <TableRow key={proposal.id}>
                        <TableCell className="font-medium">
                          {proposal.projectName}
                        </TableCell>
                        <TableCell>{proposal.client}</TableCell>
                        <TableCell className="font-medium">
                          ${proposal.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(proposal.status)}>
                            {proposal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {proposal.createdAt.toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setViewingProposal(proposal)}
                              title="View proposal"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingProposal(proposal)}
                              title="Edit proposal"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => downloadProposalPDF(proposal)}
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteProposal(proposal.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete proposal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        {viewingProposal && (
          <ProposalViewModal
            proposal={viewingProposal}
            open={!!viewingProposal}
            onOpenChange={(open) => !open && setViewingProposal(null)}
          />
        )}

        <ProposalTemplateDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          onTemplateSelect={handleTemplateSelect}
        />

        {editingProposal && (
          <EnhancedProposalDialog
            onProposalCreated={() => {
              fetchProposals();
              setEditingProposal(null);
            }}
            proposal={editingProposal}
            trigger={<div />}
          />
        )}
      </div>
    </Layout>
  );
}
