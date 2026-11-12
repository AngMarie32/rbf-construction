import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Download, Eye, Pencil, Trash2, FileSignature, Send, CheckCircle2, Trophy, PenLine, MoreHorizontal, ListChecks } from 'lucide-react';
import { ExportMenu, downloadCsv } from '@/components/ui/export-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { syncProposalToSov } from '@/utils/proposalWorkflow';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EnhancedProposalDialog } from '@/components/proposals/EnhancedProposalDialog';
import { ProposalTemplateDialog } from '@/components/proposals/ProposalTemplateDialog';
import { ProposalViewModal } from '@/components/proposals/ProposalViewModal';
import { generateProfessionalProposalPDF } from '@/utils/proposalPdfExport';
import { format } from 'date-fns';
import { SendForSignatureButton } from '@/components/esign/SendForSignatureButton';
import { cn } from '@/lib/utils';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ProposalStatus = 'Draft' | 'Sent' | 'Viewed' | 'Approved' | 'Rejected';

interface Proposal {
  id: string;
  project_name: string;
  client: string;
  scope?: string;
  created_at: string;
  status: ProposalStatus;
  amount: number;
  raw?: any;
}

const STATUS_OPTIONS: ProposalStatus[] = ['Draft', 'Sent', 'Viewed', 'Approved', 'Rejected'];

const STATUS_STYLE: Record<ProposalStatus, string> = {
  Draft: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300',
  Sent: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300',
  Viewed: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/20 dark:text-indigo-300',
  Approved: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  Rejected: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300',
};

const money0 = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ProposalStatus>('all');
  const [newProposalOpen, setNewProposalOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Proposal | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project');

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProposals(
        (data || []).map((item) => ({
          id: item.id,
          project_name: item.project_name || 'Untitled',
          client: item.client || '',
          scope: item.scope,
          created_at: item.created_at,
          status: (STATUS_OPTIONS.includes(item.status as ProposalStatus) ? item.status : 'Draft') as ProposalStatus,
          amount: Number(item.amount) || 0,
          raw: item,
        }))
      );
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const by = (s: ProposalStatus[]) => proposals.filter((p) => s.includes(p.status));
    const sum = (list: Proposal[]) => list.reduce((acc, p) => acc + p.amount, 0);
    const approved = by(['Approved']);
    const rejected = by(['Rejected']);
    const pending = by(['Sent', 'Viewed']);
    const decided = approved.length + rejected.length;
    return {
      drafts: by(['Draft']).length,
      pending: pending.length,
      pendingValue: sum(pending),
      approved: approved.length,
      approvedValue: sum(approved),
    };
  }, [proposals]);

  const sendToSov = async (p: Proposal) => {
    const projectId = p.raw?.project_id;
    if (!projectId) {
      toast.error('Link this proposal to a project first (Edit → Project), then send it to the Schedule of Values.');
      return;
    }
    try {
      const n = await syncProposalToSov({ id: p.id, project_id: projectId, project_name: p.project_name, proposal_items: p.raw?.proposal_items });
      if (p.status !== 'Approved') await supabase.from('proposals').update({ status: 'Approved' }).eq('id', p.id);
      toast.success(`Sent ${n} line${n === 1 ? '' : 's'} to the Schedule of Values`);
      navigate(`/schedule-of-values?project=${projectId}`);
    } catch (e: any) {
      toast.error(e.message || 'Could not send the proposal to the Schedule of Values');
    }
  };

  // The proposal the "next step" bar acts on: newest approved (else newest) proposal tied to a project,
  // preferring the project we arrived with.
  const nextCandidate = useMemo(() => {
    const linked = proposals.filter((p) => p.raw?.project_id && Array.isArray(p.raw?.proposal_items) && p.raw.proposal_items.length);
    const pool = projectParam ? linked.filter((p) => p.raw.project_id === projectParam) : linked;
    return pool.find((p) => p.status === 'Approved') || pool.find((p) => p.status !== 'Rejected') || null;
  }, [proposals, projectParam]);

  const exportCsv = () =>
    downloadCsv(
      'proposals',
      ['Project', 'Client', 'Created', 'Status', 'Amount'],
      filteredProposals.map((p) => [p.project_name, p.client, format(new Date(p.created_at), 'yyyy-MM-dd'), p.status, p.amount.toFixed(2)])
    );

  const filteredProposals = useMemo(
    () => (statusFilter === 'all' ? proposals : proposals.filter((p) => p.status === statusFilter)),
    [proposals, statusFilter]
  );

  const openNew = () => {
    setSelectedProposal(null);
    setNewProposalOpen(true);
  };

  const handleViewProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setViewModalOpen(true);
  };

  const handleEditProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setNewProposalOpen(true);
  };

  const deleteProposal = async (proposal: Proposal) => {
    const { error } = await supabase.from('proposals').delete().eq('id', proposal.id);
    if (error) {
      console.error('Error deleting proposal:', error);
      toast.error(`Couldn't delete the proposal: ${error.message}`);
      return;
    }
    setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
    toast.success(`Proposal "${proposal.project_name}" deleted`);
  };

  const handleExportProposalPDF = async (proposal: Proposal, quiet = false) => {
    try {
      await generateProfessionalProposalPDF({
        projectName: proposal.project_name,
        client: proposal.client,
        amount: proposal.amount,
        status: proposal.status,
        createdAt: new Date(proposal.created_at),
        scope: proposal.scope || undefined,
        id: proposal.id,
        clientAddress: proposal.raw?.client_address || undefined,
        clientPhone: proposal.raw?.client_phone || undefined,
        clientEmail: proposal.raw?.client_email || undefined,
        projectAddress: proposal.raw?.project_address || undefined,
        validDays: proposal.raw?.valid_days || undefined,
        notes: proposal.raw?.notes || undefined,
        proposalItems: Array.isArray(proposal.raw?.proposal_items) ? proposal.raw.proposal_items : undefined,
      });
      if (!quiet) toast.success('Proposal PDF exported');
    } catch (error) {
      console.error('Error exporting proposal PDF:', error);
      toast.error('Failed to export proposal PDF');
    }
  };

  const handleExportAll = async () => {
    if (filteredProposals.length === 0) {
      toast.error('No proposals to export');
      return;
    }
    for (const proposal of filteredProposals) await handleExportProposalPDF(proposal, true);
    toast.success(`Exported ${filteredProposals.length} proposal PDF${filteredProposals.length === 1 ? '' : 's'}`);
  };

  const handleProposalCreated = () => {
    fetchProposals();
    setNewProposalOpen(false);
    setSelectedProposal(null);
  };

  const mapProposalForModal = (proposal: Proposal | null) => {
    if (!proposal) return null;
    const modalStatus: 'Draft' | 'Sent' | 'Approved' | 'Rejected' = proposal.status === 'Viewed' ? 'Sent' : proposal.status;
    return {
      id: proposal.id,
      projectName: proposal.project_name,
      client: proposal.client,
      scope: proposal.scope || '',
      createdAt: new Date(proposal.created_at),
      status: modalStatus,
      amount: proposal.amount,
    };
  };

  const columns: DataTableColumn<Proposal>[] = [
    {
      id: 'project',
      header: 'Project',
      value: (p) => p.project_name,
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{p.project_name}</p>
          {p.scope && <p className="max-w-xs truncate text-xs text-muted-foreground">{p.scope}</p>}
        </div>
      ),
    },
    { id: 'client', header: 'Client', value: (p) => p.client, cell: (p) => p.client || <span className="text-muted-foreground">—</span> },
    {
      id: 'date',
      header: 'Created',
      value: (p) => new Date(p.created_at),
      cell: (p) => <span className="whitespace-nowrap">{format(new Date(p.created_at), 'MMM d, yyyy')}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      value: (p) => p.status,
      cell: (p) => (
        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', STATUS_STYLE[p.status])}>
          {p.status}
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      value: (p) => p.amount,
      cell: (p) => <span className="font-semibold tabular-nums">{money0(p.amount)}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      cell: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="View" onClick={() => handleViewProposal(p)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => handleEditProposal(p)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <SendForSignatureButton
            source="proposal"
            sourceId={p.id}
            title={`Proposal – ${p.project_name}`}
            company={p.client}
            documentType="Proposal"
            iconOnly
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="More">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onSelect={() => handleExportProposalPDF(p)}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => sendToSov(p)} disabled={!p.raw?.project_id}>
                <ListChecks className="mr-2 h-4 w-4" />
                {p.raw?.project_id ? 'Send to Schedule of Values' : 'Send to SOV (link a project first)'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirmDelete(p)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <Layout hideTitle title="Proposals" subtitle="Create and manage project proposals">
      <div className="space-y-6">
        <PageHero
          eyebrow="Bidding"
          title="Proposals"
          subtitle="Send professional proposals, collect signatures and track which bids you win."
          actions={
            <>
              <button type="button" className={heroButtonPrimary} onClick={openNew}>
                <Plus className="h-4 w-4" /> New proposal
              </button>
              <button type="button" className={heroButton} onClick={() => setTemplateDialogOpen(true)}>
                <FileText className="h-4 w-4" /> Templates
              </button>
            </>
          }
          stats={[
            { label: 'Out for decision', value: loading ? '…' : money0(stats.pendingValue), tone: stats.pendingValue ? 'warn' : undefined },
            { label: 'Won', value: loading ? '…' : money0(stats.approvedValue), tone: stats.approvedValue ? 'good' : undefined },
          ]}
        />

        <WorkflowStepper
          projectId={projectParam || nextCandidate?.raw?.project_id}
          next={{
            label: nextCandidate ? `Send "${nextCandidate.project_name}" to Schedule of Values` : 'Send approved proposal to Schedule of Values',
            description: nextCandidate
              ? `Turns its ${nextCandidate.raw.proposal_items.length} priced line${nextCandidate.raw.proposal_items.length === 1 ? '' : 's'} into billing lines${nextCandidate.status === 'Approved' ? '' : ' and marks it Approved'}. Lines already billed are never changed.`
              : '',
            disabled: !nextCandidate,
            disabledReason: 'Create a proposal linked to a project (for example from the Bid Planner), then send it on once the client approves.',
            onClick: () => (nextCandidate ? sendToSov(nextCandidate) : undefined),
          }}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AccentStat label="Total proposals" value={proposals.length} icon={FileSignature} accent="blue" loading={loading} hint="All time" />
          <AccentStat label="Drafts" value={stats.drafts} icon={PenLine} accent="slate" loading={loading} hint="Not sent yet" />
          <AccentStat
            label="Awaiting response"
            value={stats.pending}
            icon={Send}
            accent="amber"
            tone={stats.pending ? 'warn' : undefined}
            loading={loading}
            hint={`${money0(stats.pendingValue)} sent or viewed`}
          />
          <AccentStat
            label="Approved"
            value={stats.approved}
            icon={stats.approved ? Trophy : CheckCircle2}
            accent="emerald"
            tone={stats.approved ? 'good' : undefined}
            loading={loading}
            hint={`${money0(stats.approvedValue)} won`}
          />
        </div>

        <DataTable
          columns={columns}
          rows={filteredProposals}
          totalCount={proposals.length}
          getRowId={(p) => p.id}
          loading={loading}
          searchPlaceholder="Search project or client…"
          toolbarEnd={
            <ExportMenu
              options={[
                { label: 'Proposal list (CSV)', hint: 'Rows shown, for Excel', format: 'csv', disabled: !filteredProposals.length, onSelect: exportCsv },
                {
                  label: `PDFs of shown proposals (${filteredProposals.length})`,
                  hint: 'One client-ready PDF each',
                  format: 'pdf',
                  disabled: !filteredProposals.length,
                  onSelect: handleExportAll,
                },
              ]}
            />
          }
          initialSort={{ id: 'date', desc: true }}
          onRowClick={handleViewProposal}
          filters={
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s} ({proposals.filter((p) => p.status === s).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          empty={
            proposals.length ? (
              <EmptyState
                icon={FileSignature}
                title="No proposals match"
                description="Try a different search or status."
                filtered
                onClearFilters={() => setStatusFilter('all')}
              />
            ) : (
              <EmptyState
                icon={FileSignature}
                title="No proposals yet"
                description="Turn a bid into a client-ready proposal, send it for e-signature and track whether you win the job."
                action={{ label: 'New proposal', onClick: openNew, icon: Plus }}
                secondaryAction={{ label: 'Open Bid Planner', to: '/bid-planner' }}
                steps={['Price the job in the Bid Estimator or Bid Planner', 'Create the proposal and download the PDF', 'Send it for signature and mark the result']}
              />
            )
          }
        />
      </div>

      <EnhancedProposalDialog
        open={newProposalOpen}
        onOpenChange={(o) => {
          setNewProposalOpen(o);
          if (!o) setSelectedProposal(null);
        }}
        proposal={
          selectedProposal
            ? {
                id: selectedProposal.id,
                projectName: selectedProposal.project_name,
                client: selectedProposal.client,
                scope: selectedProposal.scope,
                amount: selectedProposal.amount,
                status: selectedProposal.status === 'Viewed' ? 'Sent' : selectedProposal.status,
                clientAddress: selectedProposal.raw?.client_address,
                clientPhone: selectedProposal.raw?.client_phone,
                clientEmail: selectedProposal.raw?.client_email,
                projectAddress: selectedProposal.raw?.project_address,
                validDays: selectedProposal.raw?.valid_days,
                notes: selectedProposal.raw?.notes,
                proposalItems: selectedProposal.raw?.proposal_items,
                projectId: selectedProposal.raw?.project_id,
              }
            : null
        }
        onProposalCreated={handleProposalCreated}
      />

      <ProposalTemplateDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} onTemplateSelect={() => {}} />

      <ProposalViewModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        proposal={mapProposalForModal(selectedProposal)}
        onDownload={selectedProposal ? () => handleExportProposalPDF(selectedProposal) : undefined}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.project_name}"{confirmDelete?.client ? ` for ${confirmDelete.client}` : ''} will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) deleteProposal(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
