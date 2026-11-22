import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, FileText, Plus, Save, Trash2, Upload } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { getScheduledMonthlyRent, validateRentBumps } from '@/utils/leaseTerms';
import { cn } from '@/lib/utils';

const LEASE_TYPES = ['gross', 'nnn', 'modified_gross', 'percentage', 'month_to_month', 'other'];
const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const money = (value: number | null | undefined) => (Number(value) || 0).toLocaleString('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const label = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const numberOrNull = (value: string) => value === '' ? null : Number(value);
const formatBytes = (value: number | null) => {
  if (!value) return '';
  return value >= 1024 * 1024 ? `${(value / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(value / 1024)} KB`;
};

interface UnitRecord {
  id: string;
  property_id: string;
  unit_number: string;
  tenant_name: string | null;
  market_rent: number | null;
  lease_start: string | null;
  lease_end: string | null;
  square_feet: number | null;
}

interface PropertyRecord {
  id: string;
  name: string;
  company_id: string;
}

interface LeaseForm {
  lease_type: string;
  security_deposit: number | null;
  base_nnn_monthly: number;
  allocation_method: string;
  fixed_allocation_percent: number | null;
  cam_cap_type: string;
  cam_cap_value: number | null;
  admin_fee_cap_percent: number | null;
  custom_admin_fee_percent: number | null;
  management_fee_cap_type: string;
  management_fee_cap_value: number | null;
  custom_management_fee_type: string | null;
  custom_management_fee_amount: number | null;
  custom_management_fee_percent: number | null;
  renewal_terms: string;
  notes: string;
}

interface RentBumpRow {
  id: string;
  start_year: number;
  end_year: number;
  increase_percent: number;
}

interface LeaseDocument {
  id: string;
  file_name: string;
  file_path: string;
  content_type: string | null;
  file_size: number | null;
  created_at: string;
}

const emptyLease: LeaseForm = {
  lease_type: 'gross',
  security_deposit: null,
  base_nnn_monthly: 0,
  allocation_method: 'sqft',
  fixed_allocation_percent: null,
  cam_cap_type: 'none',
  cam_cap_value: null,
  admin_fee_cap_percent: null,
  custom_admin_fee_percent: null,
  management_fee_cap_type: 'none',
  management_fee_cap_value: null,
  custom_management_fee_type: null,
  custom_management_fee_amount: null,
  custom_management_fee_percent: null,
  renewal_terms: '',
  notes: '',
};

export default function LeaseDetails() {
  const { unitId } = useParams<{ unitId: string }>();
  const { companies, selectedIds } = useCompanies();
  const fileInput = useRef<HTMLInputElement>(null);
  const [unit, setUnit] = useState<UnitRecord | null>(null);
  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [form, setForm] = useState<LeaseForm>(emptyLease);
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [bumps, setBumps] = useState<RentBumpRow[]>([]);
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadDocuments = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('property_lease_documents')
      .select('id, file_name, file_path, content_type, file_size, created_at')
      .eq('lease_id', id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setDocuments((data || []) as LeaseDocument[]);
  }, []);

  const load = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setLoadError('');
    const { data: unitData, error: unitError } = await supabase
      .from('property_units')
      .select('id, property_id, unit_number, tenant_name, market_rent, lease_start, lease_end, square_feet')
      .eq('id', unitId)
      .maybeSingle();
    if (unitError || !unitData) {
      setLoadError(unitError?.message || 'This unit could not be found.');
      setLoading(false);
      return;
    }
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, company_id')
      .eq('id', unitData.property_id)
      .single();
    if (propertyError || !propertyData) {
      setLoadError(propertyError?.message || 'This property could not be found.');
      setLoading(false);
      return;
    }
    setUnit(unitData as UnitRecord);
    setProperty(propertyData as PropertyRecord);

    const { data: lease, error: leaseError } = await supabase
      .from('property_leases')
      .select('*')
      .eq('unit_id', unitId)
      .maybeSingle();
    if (leaseError) {
      setLoadError(leaseError.message);
      setLoading(false);
      return;
    }
    if (lease) {
      setLeaseId(lease.id);
      setForm({
        lease_type: lease.lease_type,
        security_deposit: lease.security_deposit,
        base_nnn_monthly: Number(lease.base_nnn_monthly) || 0,
        allocation_method: lease.allocation_method,
        fixed_allocation_percent: lease.fixed_allocation_percent,
        cam_cap_type: lease.cam_cap_type,
        cam_cap_value: lease.cam_cap_value,
        admin_fee_cap_percent: lease.admin_fee_cap_percent,
        custom_admin_fee_percent: lease.custom_admin_fee_percent,
        management_fee_cap_type: lease.management_fee_cap_type,
        management_fee_cap_value: lease.management_fee_cap_value,
        custom_management_fee_type: lease.custom_management_fee_type,
        custom_management_fee_amount: lease.custom_management_fee_amount,
        custom_management_fee_percent: lease.custom_management_fee_percent,
        renewal_terms: lease.renewal_terms || '',
        notes: lease.notes || '',
      });
      const [{ data: bumpData, error: bumpError }] = await Promise.all([
        supabase.from('property_lease_rent_bumps').select('*').eq('lease_id', lease.id).order('start_year'),
        loadDocuments(lease.id),
      ]);
      if (bumpError) toast.error(bumpError.message);
      setBumps((bumpData || []) as RentBumpRow[]);
    } else {
      setLeaseId(null);
      setForm(emptyLease);
      setBumps([]);
      setDocuments([]);
    }
    setLoading(false);
  }, [unitId, loadDocuments]);

  useEffect(() => {
    load();
  }, [load]);

  const company = companies.find((item) => item.id === property?.company_id);
  const outsideCompanySelection = !!property && selectedIds.length > 0 && !selectedIds.includes(property.company_id);
  const previewYears = useMemo(() => {
    const finalYear = Math.min(30, Math.max(5, ...bumps.map((bump) => bump.end_year)));
    return Array.from({ length: finalYear }, (_, index) => index + 1);
  }, [bumps]);

  const update = <K extends keyof LeaseForm>(key: K, value: LeaseForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveLease = async (showConfirmation = true): Promise<string | null> => {
    if (!unit) return null;
    if (unit.lease_start && unit.lease_end && unit.lease_end < unit.lease_start) {
      toast.error('The lease end is before the lease start.');
      return null;
    }
    const bumpError = validateRentBumps(bumps);
    if (bumpError) {
      toast.error(bumpError);
      return null;
    }
    setSaving(true);
    const { error: unitError } = await supabase
      .from('property_units')
      .update({ market_rent: unit.market_rent, lease_start: unit.lease_start, lease_end: unit.lease_end })
      .eq('id', unit.id);
    if (unitError) {
      toast.error(unitError.message);
      setSaving(false);
      return null;
    }
    const { data: savedLease, error: leaseError } = await supabase
      .from('property_leases')
      .upsert({ unit_id: unit.id, ...form }, { onConflict: 'unit_id' })
      .select('id')
      .single();
    if (leaseError || !savedLease) {
      toast.error(leaseError?.message || 'The lease could not be saved.');
      setSaving(false);
      return null;
    }
    const { error: deleteError } = await supabase.from('property_lease_rent_bumps').delete().eq('lease_id', savedLease.id);
    if (!deleteError && bumps.length) {
      const { error: insertError } = await supabase.from('property_lease_rent_bumps').insert(
        bumps.map((bump) => ({
          lease_id: savedLease.id,
          start_year: bump.start_year,
          end_year: bump.end_year,
          increase_percent: bump.increase_percent,
        })),
      );
      if (insertError) toast.error(insertError.message);
      else {
        setLeaseId(savedLease.id);
        setSaving(false);
        if (showConfirmation) toast.success('Lease terms saved');
        return savedLease.id;
      }
    } else if (!deleteError) {
      setLeaseId(savedLease.id);
      setSaving(false);
      if (showConfirmation) toast.success('Lease terms saved');
      return savedLease.id;
    } else toast.error(deleteError.message);
    setSaving(false);
    return null;
  };

  const addBump = () => {
    const lastYear = Math.max(0, ...bumps.map((bump) => bump.end_year));
    setBumps((current) => [...current, {
      id: crypto.randomUUID(),
      start_year: lastYear + 1,
      end_year: lastYear + 5,
      increase_percent: 0,
    }]);
  };

  const uploadFile = async (file: File) => {
    if (!unit) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Choose a PDF, Word document, JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Lease documents must be 25 MB or smaller.');
      return;
    }
    const id = await saveLease(false);
    if (!id) return;
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${unit.id}/${id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('lease-documents').upload(path, file, { contentType: file.type });
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    const { error: documentError } = await supabase.from('property_lease_documents').insert({
      lease_id: id,
      file_name: file.name,
      file_path: path,
      content_type: file.type,
      file_size: file.size,
      uploaded_by: authData.user?.id || null,
    });
    if (documentError) {
      await supabase.storage.from('lease-documents').remove([path]);
      toast.error(documentError.message);
    } else {
      toast.success(`${file.name} uploaded`);
      await loadDocuments(id);
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
  };

  const dropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const downloadDocument = async (document: LeaseDocument) => {
    const { data, error } = await supabase.storage.from('lease-documents').download(document.file_path);
    if (error) return toast.error(error.message);
    const url = URL.createObjectURL(data);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = document.file_name;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const deleteDocument = async (document: LeaseDocument) => {
    const { error: storageError } = await supabase.storage.from('lease-documents').remove([document.file_path]);
    if (storageError) return toast.error(storageError.message);
    const { error } = await supabase.from('property_lease_documents').delete().eq('id', document.id);
    if (error) return toast.error(error.message);
    setDocuments((current) => current.filter((item) => item.id !== document.id));
    toast.success('Document deleted');
  };

  if (loading) {
    return <Layout hideTitle title="Lease details"><div className="py-16 text-center text-sm text-muted-foreground">Loading lease details…</div></Layout>;
  }

  if (loadError || !unit || !property) {
    return (
      <Layout hideTitle title="Lease details">
        <div className="mx-auto max-w-xl py-16 text-center">
          <p className="font-medium">Lease details are unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Button asChild className="mt-5" variant="outline"><Link to="/properties">Back to properties</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideTitle title={`Lease · Unit ${unit.unit_number}`}>
      <div className="space-y-6">
        <PageHero
          eyebrow={`${property.name}${company ? ` · ${company.name}` : ''}`}
          title={`Unit ${unit.unit_number} lease`}
          subtitle={unit.tenant_name || 'No tenant assigned'}
          actions={
            <>
              <Link to="/properties" className={heroButton}><ArrowLeft className="h-4 w-4" /> Properties</Link>
              <button type="button" className={heroButtonPrimary} disabled={saving || uploading || outsideCompanySelection} onClick={() => saveLease()}>
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save lease'}
              </button>
            </>
          }
        />

        {outsideCompanySelection && (
          <div className="rounded-lg bg-muted p-4 text-sm">Choose {company?.name || 'this property’s company'} in the company selector to edit this lease.</div>
        )}

        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-lg font-semibold">Lease terms</h2>
            <p className="text-sm text-muted-foreground">The financial terms used for this unit’s current lease.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Lease type</Label>
              <Select value={form.lease_type} onValueChange={(value) => update('lease_type', value)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{LEASE_TYPES.map((type) => <SelectItem key={type} value={type}>{label(type)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base monthly rent</Label>
              <Input className="mt-1" type="number" min="0" step="0.001" value={unit.market_rent ?? ''} onChange={(event) => setUnit({ ...unit, market_rent: numberOrNull(event.target.value) })} />
            </div>
            <div>
              <Label>Security deposit</Label>
              <Input className="mt-1" type="number" min="0" step="0.001" value={form.security_deposit ?? ''} onChange={(event) => update('security_deposit', numberOrNull(event.target.value))} />
            </div>
            <div>
              <Label>Lease start</Label>
              <Input className="mt-1" type="date" value={unit.lease_start || ''} onChange={(event) => setUnit({ ...unit, lease_start: event.target.value || null })} />
            </div>
            <div>
              <Label>Lease end</Label>
              <Input className="mt-1" type="date" value={unit.lease_end || ''} onChange={(event) => setUnit({ ...unit, lease_end: event.target.value || null })} />
            </div>
            <div>
              <Label>Base NNN charges / month</Label>
              <Input className="mt-1" type="number" min="0" step="0.001" value={form.base_nnn_monthly} onChange={(event) => update('base_nnn_monthly', Number(event.target.value) || 0)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Renewal and option terms</Label>
              <Textarea className="mt-1" rows={2} value={form.renewal_terms} onChange={(event) => update('renewal_terms', event.target.value)} placeholder="Renewal options, notice windows, extension rates…" />
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Rent bumps</h2>
              <p className="text-sm text-muted-foreground">Each increase applies once at the start of its lease-year period.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addBump}><Plus className="mr-1 h-4 w-4" /> Add period</Button>
          </div>
          {bumps.length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2 font-medium">From lease year</th><th className="pb-2 font-medium">Through lease year</th><th className="pb-2 font-medium">Increase at start (%)</th><th className="pb-2" /></tr></thead>
                <tbody>
                  {bumps.map((bump) => (
                    <tr key={bump.id} className="border-b last:border-0">
                      <td className="py-2 pr-3"><Input type="number" min="1" step="1" value={bump.start_year} onChange={(event) => setBumps((current) => current.map((item) => item.id === bump.id ? { ...item, start_year: Number(event.target.value) } : item))} /></td>
                      <td className="py-2 pr-3"><Input type="number" min="1" step="1" value={bump.end_year} onChange={(event) => setBumps((current) => current.map((item) => item.id === bump.id ? { ...item, end_year: Number(event.target.value) } : item))} /></td>
                      <td className="py-2 pr-3"><Input type="number" min="0" step="0.001" value={bump.increase_percent} onChange={(event) => setBumps((current) => current.map((item) => item.id === bump.id ? { ...item, increase_percent: Number(event.target.value) } : item))} /></td>
                      <td className="py-2 text-right"><Button type="button" variant="ghost" size="icon" aria-label="Remove rent bump" onClick={() => setBumps((current) => current.filter((item) => item.id !== bump.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {bumps.length === 0 && <p className="mb-5 text-sm text-muted-foreground">No escalation periods yet. Add one to schedule a future rent change.</p>}
          <div>
            <h3 className="mb-3 text-sm font-medium">Scheduled monthly base rent</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {previewYears.map((year) => (
                <div key={year} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Lease year {year}</p>
                  <p className="mt-1 font-semibold tabular-nums">{money(getScheduledMonthlyRent(Number(unit.market_rent) || 0, bumps, year))}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Expense allocation & CAM cap</h2>
            <p className="mt-1 text-sm text-muted-foreground">How this lease shares operating expenses and limits annual CAM increases.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Allocation method</Label>
                <Select value={form.allocation_method} onValueChange={(value) => update('allocation_method', value)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sqft">Pro-rata by square footage</SelectItem><SelectItem value="fixed">Fixed percentage</SelectItem></SelectContent>
                </Select>
              </div>
              {form.allocation_method === 'fixed' && (
                <div><Label>Fixed allocation (%)</Label><Input className="mt-1" type="number" min="0" step="0.001" value={form.fixed_allocation_percent ?? ''} onChange={(event) => update('fixed_allocation_percent', numberOrNull(event.target.value))} /></div>
              )}
              <div>
                <Label>CAM cap type</Label>
                <Select value={form.cam_cap_type} onValueChange={(value) => update('cam_cap_type', value)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No cap</SelectItem><SelectItem value="percent">Percentage increase cap</SelectItem><SelectItem value="dollar">Dollar cap</SelectItem></SelectContent>
                </Select>
              </div>
              {form.cam_cap_type !== 'none' && (
                <div><Label>{form.cam_cap_type === 'percent' ? 'Maximum increase (%)' : 'Maximum annual share ($)'}</Label><Input className="mt-1" type="number" min="0" step="0.001" value={form.cam_cap_value ?? ''} onChange={(event) => update('cam_cap_value', numberOrNull(event.target.value))} /></div>
              )}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Admin & management fees</h2>
            <p className="mt-1 text-sm text-muted-foreground">Lease-specific caps and overrides; blank overrides use the property default.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><Label>Admin fee cap (%)</Label><Input className="mt-1" type="number" min="0" step="0.001" value={form.admin_fee_cap_percent ?? ''} onChange={(event) => update('admin_fee_cap_percent', numberOrNull(event.target.value))} /></div>
              <div><Label>Custom admin fee (%)</Label><Input className="mt-1" type="number" min="0" step="0.001" value={form.custom_admin_fee_percent ?? ''} onChange={(event) => update('custom_admin_fee_percent', numberOrNull(event.target.value))} /></div>
              <div>
                <Label>Management fee cap</Label>
                <Select value={form.management_fee_cap_type} onValueChange={(value) => update('management_fee_cap_type', value)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No cap</SelectItem><SelectItem value="percent_of_rent">Percent of base rent</SelectItem><SelectItem value="per_sqft">Dollars per sq ft</SelectItem><SelectItem value="fixed">Fixed dollar amount</SelectItem></SelectContent>
                </Select>
              </div>
              {form.management_fee_cap_type !== 'none' && <div><Label>Cap value</Label><Input className="mt-1" type="number" min="0" step="0.001" value={form.management_fee_cap_value ?? ''} onChange={(event) => update('management_fee_cap_value', numberOrNull(event.target.value))} /></div>}
              <div>
                <Label>Custom management fee</Label>
                <Select value={form.custom_management_fee_type || 'default'} onValueChange={(value) => update('custom_management_fee_type', value === 'default' ? null : value)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="default">Use property default</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed amount</SelectItem></SelectContent>
                </Select>
              </div>
              {form.custom_management_fee_type === 'percentage' && <div><Label>Custom management fee (%)</Label><Input className="mt-1" type="number" min="0" step="0.001" value={form.custom_management_fee_percent ?? ''} onChange={(event) => update('custom_management_fee_percent', numberOrNull(event.target.value))} /></div>}
              {form.custom_management_fee_type === 'fixed' && <div><Label>Custom management fee ($)</Label><Input className="mt-1" type="number" min="0" step="0.001" value={form.custom_management_fee_amount ?? ''} onChange={(event) => update('custom_management_fee_amount', numberOrNull(event.target.value))} /></div>}
            </div>
          </Card>
        </div>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Lease notes</h2>
          <Textarea className="mt-4" rows={4} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Special clauses, expense exclusions, tenant responsibilities…" />
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-lg font-semibold">Lease documents</h2>
            <p className="text-sm text-muted-foreground">Private PDF, Word, or image files, up to 25 MB each. Uploading also saves the current terms.</p>
          </div>
          <div
            className={cn('rounded-lg border border-dashed p-6 text-center transition-colors', dragging && 'border-primary bg-primary/5')}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={dropFile}
          >
            <input ref={fileInput} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={chooseFile} />
            <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Drag and drop a lease or amendment here</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" disabled={uploading || saving || outsideCompanySelection} onClick={() => fileInput.current?.click()}>
              {uploading ? 'Uploading…' : 'Choose file'}
            </Button>
          </div>
          <div className="mt-4 divide-y">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center gap-3 py-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{document.file_name}</p><p className="text-xs text-muted-foreground">{formatBytes(document.file_size)}</p></div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Download ${document.file_name}`} onClick={() => downloadDocument(document)}><Download className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${document.file_name}`} onClick={() => deleteDocument(document)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {documents.length === 0 && <p className="py-4 text-sm text-muted-foreground">No lease documents uploaded.</p>}
          </div>
        </Card>

        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          RBF Tracker remains the system of record for CAM reconciliations, utility billing, and water readings. This portal will pull those results read-only for analytics.
        </div>
      </div>
    </Layout>
  );
}
