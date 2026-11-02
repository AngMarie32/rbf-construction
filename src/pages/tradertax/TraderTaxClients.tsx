import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/contexts/CompanyContext';
import { tth } from '@/integrations/supabase/tradertax';
import { EntityType, FilingStatus, ServiceType, TthClient, TthEngagement } from '@/types/tradertax';
import { DEFAULT_TAX_YEAR, SUPPORTED_TAX_YEARS } from '@/utils/traderTax/taxYearConfig';
import { engagementStatusLabel, statusTone } from '@/utils/traderTax/labels';

interface ClientRow extends TthClient {
  engagements: Pick<TthEngagement, 'id' | 'tax_year' | 'status' | 'service_type'>[];
}

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'smllc', label: 'Single-member LLC' },
  { value: 'partnership', label: 'Partnership / multi-member LLC' },
  { value: 's_corp', label: 'S corporation' },
  { value: 'c_corp', label: 'C corporation' },
  { value: 'trust', label: 'Trust' },
];

const FILING_STATUSES: { value: FilingStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'mfj', label: 'Married filing jointly' },
  { value: 'mfs', label: 'Married filing separately' },
  { value: 'hoh', label: 'Head of household' },
  { value: 'qw', label: 'Qualifying surviving spouse' },
];

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'tax_return', label: 'Tax return' },
  { value: 'consultation_and_return', label: 'Consultation + return' },
  { value: 'entity_setup', label: 'Entity setup' },
  { value: 'amended_return', label: 'Amended return' },
  { value: 'audit_support', label: 'Audit support' },
];

const emptyForm = {
  display_name: '',
  legal_name: '',
  email: '',
  phone: '',
  entity_type: 'individual' as EntityType,
  filing_status: 'single' as FilingStatus,
  home_state: '',
  notes: '',
  tax_year: DEFAULT_TAX_YEAR,
  service_type: 'consultation' as ServiceType,
  fee: '',
};

export default function TraderTaxClients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedIds } = useCompanies();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const companyId = selectedIds.length === 1 ? selectedIds[0] : null;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await tth
      .from('tth_clients')
      .select('*')
      .order('display_name');

    if (error) {
      toast.error('Could not load clients', { description: error.message });
      setLoading(false);
      return;
    }

    const clientIds = (data ?? []).map((c) => c.id);
    let engagements: TthEngagement[] = [];
    if (clientIds.length) {
      const { data: engs } = await tth
        .from('tth_engagements')
        .select('*')
        .in('client_id', clientIds)
        .order('tax_year', { ascending: false });
      engagements = (engs ?? []) as TthEngagement[];
    }

    setClients(
      (data ?? []).map((c) => ({
        ...(c as TthClient),
        engagements: engagements.filter((e) => e.client_id === c.id),
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.display_name, c.legal_name, c.email, c.home_state]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [clients, search, statusFilter]);

  const handleCreate = async () => {
    if (!form.display_name.trim()) {
      toast.error('Client name is required');
      return;
    }
    setSaving(true);

    const { data: created, error } = await tth
      .from('tth_clients')
      .insert({
        company_id: companyId,
        display_name: form.display_name.trim(),
        legal_name: form.legal_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        entity_type: form.entity_type,
        filing_status: form.filing_status,
        home_state: form.home_state || null,
        notes: form.notes.trim() || null,
        status: 'onboarding',
        created_by: user?.id ?? null,
      })
      .select('*')
      .single();

    if (error || !created) {
      toast.error('Could not create the client', { description: error?.message });
      setSaving(false);
      return;
    }

    const { data: engagement, error: engError } = await tth
      .from('tth_engagements')
      .insert({
        client_id: created.id,
        company_id: companyId,
        tax_year: form.tax_year,
        service_type: form.service_type,
        status: 'intake',
        fee: form.fee ? Number(form.fee) : null,
        created_by: user?.id ?? null,
      })
      .select('*')
      .single();

    if (engError) {
      toast.error('Client created, but the engagement failed', { description: engError.message });
      setSaving(false);
      await load();
      return;
    }

    await tth.from('tth_activity').insert({
      client_id: created.id,
      engagement_id: engagement?.id ?? null,
      kind: 'client_created',
      message: `Client and ${form.tax_year} engagement created.`,
      actor: user?.id ?? null,
    });

    toast.success('Client created');
    setDialogOpen(false);
    setForm({ ...emptyForm });
    setSaving(false);
    navigate(`/tradertax/clients/${created.id}`);
  };

  return (
    <Layout
      title="TraderTaxHQ — Clients"
      subtitle="Intake, secure documents, analysis, consultation, and filing in one place"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-9"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New client
        </Button>
      </div>

      <Card className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading clients…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium">No clients yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a client to generate an intake link and open a secure document channel.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Engagements</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Secure channel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/tradertax/clients/${c.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{c.display_name}</div>
                    {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {ENTITY_TYPES.find((e) => e.value === c.entity_type)?.label ?? c.entity_type}
                  </TableCell>
                  <TableCell className="text-sm">{c.home_state ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.engagements.length === 0 && (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                      {c.engagements.slice(0, 3).map((e) => (
                        <Badge key={e.id} variant="outline" className="text-xs font-normal">
                          {e.tax_year} · {engagementStatusLabel(e.status)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusTone(c.status)}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {c.titanfile_channel_url ? (
                      <span className="text-emerald-600">Connected</span>
                    ) : (
                      <span className="text-muted-foreground">Not set up</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New client</DialogTitle>
            <DialogDescription>
              Creates the client and their first engagement. The intake link and document channel are
              generated from the engagement.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Client name *</Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Jordan Reyes"
              />
            </div>
            <div className="space-y-2">
              <Label>Legal / entity name</Label>
              <Input
                value={form.legal_name}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                placeholder="Reyes Trading LLC"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Entity type</Label>
              <Select
                value={form.entity_type}
                onValueChange={(v) => setForm({ ...form, entity_type: v as EntityType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filing status</Label>
              <Select
                value={form.filing_status}
                onValueChange={(v) => setForm({ ...form, filing_status: v as FilingStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILING_STATUSES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Home state</Label>
              <Input
                value={form.home_state}
                maxLength={2}
                placeholder="TX"
                onChange={(e) => setForm({ ...form, home_state: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tax year</Label>
              <Select
                value={String(form.tax_year)}
                onValueChange={(v) => setForm({ ...form, tax_year: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_TAX_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                value={form.service_type}
                onValueChange={(v) => setForm({ ...form, service_type: v as ServiceType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee</Label>
              <Input
                type="number"
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Referral source, what they came in for, anything already known."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
