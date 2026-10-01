
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';

interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface EnhancedProposalDialogProps {
  onProposalCreated: () => void;
  trigger?: React.ReactNode;
  proposal?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EnhancedProposalDialog({ 
  onProposalCreated, 
  trigger, 
  proposal, 
  open: controlledOpen, 
  onOpenChange 
}: EnhancedProposalDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectName: '',
    client: '',
    clientAddress: '',
    clientPhone: '',
    clientEmail: '',
    projectAddress: '',
    description: '',
    amount: 0,
    status: 'Draft' as 'Draft' | 'Sent' | 'Approved' | 'Rejected',
    validDays: 30,
    notes: ''
  });

  const [projectId, setProjectId] = useState<string>('none');
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('projects').select('id, name, status').then(({ data }) => {
      setProjects(sortProjectsOpenFirst((data as any[]) || []));
    });
  }, []);

  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([
    { id: '1', description: '', quantity: 1, unit: 'each', unitPrice: 0, total: 0 }
  ]);

  // Helper function to format currency with commas and two decimal places
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Use controlled open state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    if (proposal) {
      setFormData({
        projectName: proposal.projectName || '',
        client: proposal.client || '',
        clientAddress: proposal.clientAddress || '',
        clientPhone: proposal.clientPhone || '',
        clientEmail: proposal.clientEmail || '',
        projectAddress: proposal.projectAddress || '',
        description: proposal.scope || '',
        amount: proposal.amount || 0,
        status: proposal.status || 'Draft',
        validDays: proposal.validDays || 30,
        notes: proposal.notes || ''
      });
      setProjectId(proposal.projectId || 'none');

      if (proposal.proposalItems && proposal.proposalItems.length > 0) {
        setProposalItems(proposal.proposalItems.map((item: any, index: number) => ({
          id: item.id || (index + 1).toString(),
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'each',
          unitPrice: item.unitPrice || 0,
          total: item.total || 0
        })));
      }
    }
  }, [proposal]);

  const addProposalItem = () => {
    const newItem: ProposalItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit: 'each',
      unitPrice: 0,
      total: 0
    };
    setProposalItems([...proposalItems, newItem]);
  };

  const updateProposalItem = (id: string, field: keyof ProposalItem, value: any) => {
    setProposalItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeProposalItem = (id: string) => {
    setProposalItems(items => items.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return proposalItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectName || !formData.client) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = calculateTotal();
      
      const proposalData = {
        project_name: formData.projectName,
        client: formData.client,
        client_address: formData.clientAddress,
        client_phone: formData.clientPhone,
        client_email: formData.clientEmail,
        project_address: formData.projectAddress,
        scope: formData.description,
        amount: totalAmount,
        status: formData.status,
        valid_days: formData.validDays,
        notes: formData.notes,
        proposal_items: proposalItems as any,
        project_id: projectId === 'none' ? null : projectId,
      };

      const { data: saved, error } = proposal?.id
        ? await supabase.from('proposals').update(proposalData).eq('id', proposal.id).select('id').single()
        : await supabase.from('proposals').insert(proposalData).select('id').single();

      if (error) throw error;

      if (projectId !== 'none' && saved?.id) {
        const n = await syncProposalToPayApp(saved.id, projectId, proposalItems);
        if (n > 0) toast.success(`${n} payment application line(s) synced to the project`);
      }

      toast.success(proposal?.id ? 'Proposal updated successfully' : 'Proposal created successfully');
      setIsOpen(false);
      onProposalCreated();
    } catch (error) {
      console.error('Error saving proposal:', error);
      toast.error('Failed to save proposal');
    } finally {
      setLoading(false);
    }
  };

  const syncProposalToPayApp = async (proposalId: string, pid: string, items: ProposalItem[]) => {
    const lines = items.filter(i => i.description.trim() || i.total);
    const { data: existing, error: exErr } = await supabase
      .from('sov_items')
      .select('id, item_number, total_completed_and_stored, project_id')
      .eq('source_proposal_id' as any, proposalId)
      .order('item_number');
    if (exErr) throw exErr;
    const rows = (existing || []) as any[];
    // If the proposal moved to a different project, remove untouched lines from the old one
    const sameProject = rows.filter(r => r.project_id === pid);
    for (const r of rows.filter(r => r.project_id !== pid)) {
      if (!Number(r.total_completed_and_stored)) await supabase.from('sov_items').delete().eq('id', r.id);
    }
    const { count } = await supabase.from('sov_items').select('id', { count: 'exact', head: true }).eq('project_id', pid);
    let next = (count || 0) + 1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const fields = {
        category: 'Proposal',
        subcategory: formData.projectName,
        description: l.description || `Line ${i + 1}`,
        scheduled_value: Math.round(Number(l.total || 0) * 100) / 100,
      };
      if (sameProject[i]) {
        const { error: uErr } = await supabase.from('sov_items').update(fields).eq('id', sameProject[i].id);
        if (uErr) throw uErr;
      } else {
        const { error: iErr } = await supabase.from('sov_items').insert({
          ...fields,
          project_id: pid,
          item_number: String(next++).padStart(3, '0'),
          source_proposal_id: proposalId,
        } as any);
        if (iErr) throw iErr;
      }
    }
    for (const r of sameProject.slice(lines.length)) {
      if (!Number(r.total_completed_and_stored)) await supabase.from('sov_items').delete().eq('id', r.id);
    }
    await supabase.from('proposals').update({ sov_synced_at: new Date().toISOString() } as any).eq('id', proposalId);
    return lines.length;
  };

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      New Proposal
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposal?.id ? 'Edit Proposal' : 'Create New Proposal'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Link to project (creates payment application lines)</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}{p.status ? ` (${p.status})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Each line item becomes a line on this project's payment applications and stays in sync when you edit the proposal.</p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="projectAddress">Project Address</Label>
                <Input
                  id="projectAddress"
                  value={formData.projectAddress}
                  onChange={(e) => setFormData({ ...formData, projectAddress: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client">Client Name *</Label>
                <Input
                  id="client"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="clientPhone">Phone</Label>
                <Input
                  id="clientPhone"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="validDays">Proposal Valid (Days)</Label>
                <Input
                  id="validDays"
                  type="number"
                  value={formData.validDays}
                  onChange={(e) => setFormData({ ...formData, validDays: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="clientAddress">Client Address</Label>
                <Textarea
                  id="clientAddress"
                  value={formData.clientAddress}
                  onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Scope Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Scope of Work</span>
                <Button type="button" variant="outline" size="sm" onClick={addProposalItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposalItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateProposalItem(item.id, 'description', e.target.value)}
                      placeholder="Work description"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateProposalItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label>Unit</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateProposalItem(item.id, 'unit', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateProposalItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label>Total</Label>
                    <div className="font-medium text-right p-2">${formatCurrency(item.total)}</div>
                  </div>
                  <div className="col-span-1">
                    {proposalItems.length > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeProposalItem(item.id)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-end items-center text-lg font-bold">
                  Total: ${formatCurrency(calculateTotal())}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="notes">Notes & Terms</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional terms and conditions..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : proposal?.id ? 'Update Proposal' : 'Create Proposal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
