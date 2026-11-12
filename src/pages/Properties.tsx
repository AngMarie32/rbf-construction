import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Building2, CalendarClock, DoorOpen, Home, MoreHorizontal, Pencil, Plus, Trash2, TrendingDown, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

interface Property {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  property_type: string;
  purchase_price: number | null;
  notes: string | null;
}

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  market_rent: number | null;
  status: string;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  lease_start: string | null;
  lease_end: string | null;
}

const PROPERTY_TYPES = ['residential', 'multi_family', 'commercial', 'land', 'mixed_use'];
const UNIT_STATUS = ['occupied', 'vacant', 'notice', 'renovation'];
const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const money0 = (n: number | null | undefined) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtDate = (d: string | null) => (d ? format(new Date(`${d.slice(0, 10)}T00:00:00`), 'MMM d, yyyy') : '');
const daysUntil = (d: string) => {
  const t = new Date();
  return Math.round((new Date(`${d.slice(0, 10)}T00:00:00`).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 86400000);
};

const STATUS_STYLE: Record<string, string> = {
  occupied: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  vacant: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300',
  notice: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
  renovation: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300',
};

const emptyProperty = (companyId: string): Property => ({
  id: '',
  company_id: companyId,
  name: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  property_type: 'residential',
  purchase_price: null,
  notes: '',
});

const emptyUnit = (propertyId: string): Unit => ({
  id: '',
  property_id: propertyId,
  unit_number: '',
  bedrooms: null,
  bathrooms: null,
  square_feet: null,
  market_rent: null,
  status: 'vacant',
  tenant_name: '',
  tenant_email: '',
  tenant_phone: '',
  lease_start: null,
  lease_end: null,
});

export default function Properties() {
  const { companies, selectedIds } = useCompanies();
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [propForm, setPropForm] = useState<Property | null>(null);
  const [unitForm, setUnitForm] = useState<Unit | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirm, setConfirm] = useState<{ kind: 'property'; item: Property } | { kind: 'unit'; item: Unit } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (selectedIds.length === 0) {
      setProperties([]);
      setUnits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: props } = await supabase.from('properties').select('*').in('company_id', selectedIds).order('name');
    const list = ((props as any) || []) as Property[];
    setProperties(list);
    if (list.length) {
      const { data: u } = await supabase
        .from('property_units')
        .select('*')
        .in('property_id', list.map((p) => p.id))
        .order('unit_number');
      setUnits(((u as any) || []) as Unit[]);
    } else setUnits([]);
    setLoading(false);
  }, [selectedIds]);

  useEffect(() => {
    load();
  }, [load]);

  const leaseSoon = (u: Unit) => u.status !== 'vacant' && !!u.lease_end && daysUntil(u.lease_end) <= 60;

  const stats = useMemo(() => {
    const occupied = units.filter((u) => u.status === 'occupied' || u.status === 'notice');
    const potential = units.reduce((s, u) => s + (Number(u.market_rent) || 0), 0);
    const inPlace = occupied.reduce((s, u) => s + (Number(u.market_rent) || 0), 0);
    return {
      occupied: occupied.length,
      occupancy: units.length ? Math.round((occupied.length / units.length) * 100) : 0,
      potential,
      inPlace,
      vacancyLoss: potential - inPlace,
      expiring: units.filter(leaseSoon).length,
      invested: properties.reduce((s, p) => s + (Number(p.purchase_price) || 0), 0),
    };
  }, [properties, units]);

  const propStats = (p: Property) => {
    const pu = units.filter((u) => u.property_id === p.id);
    const occ = pu.filter((u) => u.status === 'occupied' || u.status === 'notice');
    const rent = occ.reduce((s, u) => s + (Number(u.market_rent) || 0), 0);
    return { units: pu.length, occupied: occ.length, rent, pct: pu.length ? (occ.length / pu.length) * 100 : 0, yieldPct: p.purchase_price ? ((rent * 12) / Number(p.purchase_price)) * 100 : null };
  };

  const visibleUnits = units.filter(
    (u) =>
      (selectedProperty === 'all' || u.property_id === selectedProperty) &&
      (statusFilter === 'all' || u.status === statusFilter || (statusFilter === 'expiring' && leaseSoon(u)))
  );

  const num = (v: string) => (v === '' ? null : Number(v));

  const saveProperty = async () => {
    if (!propForm) return;
    if (!propForm.name.trim()) return toast.error('Give the property a name.');
    if (!propForm.company_id) return toast.error('Pick the company that owns it.');
    setSaving(true);
    const { id, ...rest } = propForm;
    const payload = { ...rest, name: rest.name.trim(), purchase_price: propForm.purchase_price ?? null };
    const { error } = id ? await supabase.from('properties').update(payload).eq('id', id) : await supabase.from('properties').insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(id ? 'Property updated' : 'Property added');
    setPropForm(null);
    load();
  };

  const saveUnit = async () => {
    if (!unitForm) return;
    if (!unitForm.unit_number.trim()) return toast.error('Enter a unit number or name.');
    if (unitForm.lease_start && unitForm.lease_end && unitForm.lease_end < unitForm.lease_start) return toast.error('The lease end is before the lease start.');
    setSaving(true);
    const { id, ...rest } = unitForm;
    const { error } = id ? await supabase.from('property_units').update(rest).eq('id', id) : await supabase.from('property_units').insert(rest);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(id ? 'Unit updated' : 'Unit added');
    setUnitForm(null);
    load();
  };

  const doDelete = async () => {
    if (!confirm) return;
    if (confirm.kind === 'property') {
      const ids = units.filter((u) => u.property_id === confirm.item.id).map((u) => u.id);
      if (ids.length) {
        const { error: uErr } = await supabase.from('property_units').delete().in('id', ids);
        if (uErr) return toast.error(uErr.message);
      }
      const { error } = await supabase.from('properties').delete().eq('id', confirm.item.id);
      if (error) return toast.error(error.message);
      if (selectedProperty === confirm.item.id) setSelectedProperty('all');
      toast.success('Property deleted');
    } else {
      const { error } = await supabase.from('property_units').delete().eq('id', confirm.item.id);
      if (error) return toast.error(error.message);
      toast.success('Unit deleted');
    }
    setConfirm(null);
    load();
  };

  const propName = (id: string) => properties.find((p) => p.id === id)?.name || '—';

  const columns: DataTableColumn<Unit>[] = [
    {
      id: 'unit',
      header: 'Unit',
      value: (u) => `${propName(u.property_id)} ${u.unit_number}`,
      cell: (u) => (
        <div>
          <p className="font-medium">Unit {u.unit_number}</p>
          <p className="text-xs text-muted-foreground">{propName(u.property_id)}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      value: (u) => u.status,
      cell: (u) => <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', STATUS_STYLE[u.status] || STATUS_STYLE.renovation)}>{label(u.status)}</span>,
    },
    {
      id: 'tenant',
      header: 'Tenant',
      value: (u) => u.tenant_name,
      cell: (u) =>
        u.tenant_name ? (
          <div>
            <p>{u.tenant_name}</p>
            <p className="text-xs text-muted-foreground">{[u.tenant_phone, u.tenant_email].filter(Boolean).join(' · ')}</p>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'lease',
      header: 'Lease ends',
      value: (u) => u.lease_end,
      cell: (u) => {
        if (!u.lease_end) return <span className="text-muted-foreground">{u.status === 'vacant' ? '—' : 'Month to month'}</span>;
        const d = daysUntil(u.lease_end);
        return (
          <div>
            <p className="whitespace-nowrap">{fmtDate(u.lease_end)}</p>
            {u.status !== 'vacant' && d < 0 && <Badge variant="destructive">Ended {-d}d ago</Badge>}
            {u.status !== 'vacant' && d >= 0 && d <= 60 && <Badge variant="warning">In {d} day{d === 1 ? '' : 's'}</Badge>}
          </div>
        );
      },
    },
    {
      id: 'size',
      header: 'Size',
      value: (u) => u.square_feet,
      cell: (u) => (
        <span className="text-sm text-muted-foreground">
          {[u.bedrooms != null && `${u.bedrooms} bd`, u.bathrooms != null && `${u.bathrooms} ba`, u.square_feet && `${u.square_feet.toLocaleString()} sf`].filter(Boolean).join(' · ') || '—'}
        </span>
      ),
    },
    { id: 'rent', header: 'Rent / mo', align: 'right', value: (u) => Number(u.market_rent) || 0, cell: (u) => <span className="font-semibold tabular-nums">{money0(u.market_rent)}</span> },
    {
      id: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      cell: (u) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit unit" onClick={() => setUnitForm(u)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete unit" onClick={() => setConfirm({ kind: 'unit', item: u })}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const newProperty = () => setPropForm(emptyProperty(selectedIds[0] || companies[0]?.id || ''));
  const newUnit = (pid?: string) => setUnitForm(emptyUnit(pid || (selectedProperty !== 'all' ? selectedProperty : properties[0]?.id || '')));

  return (
    <Layout hideTitle title="Properties">
      <div className="space-y-6">
        <PageHero
          eyebrow="Portfolio"
          title="Properties"
          subtitle="Rental properties, units, tenants and leases across your companies."
          actions={
            <>
              <button type="button" className={heroButtonPrimary} onClick={newProperty}>
                <Plus className="h-4 w-4" /> New property
              </button>
              {properties.length > 0 && (
                <button type="button" className={heroButton} onClick={() => newUnit()}>
                  <DoorOpen className="h-4 w-4" /> Add unit
                </button>
              )}
            </>
          }
          stats={[
            { label: 'Rent in place / mo', value: loading ? '…' : money0(stats.inPlace), tone: 'good' },
            { label: 'Occupancy', value: loading ? '…' : `${stats.occupancy}%`, tone: stats.occupancy < 90 && units.length ? 'warn' : undefined },
            { label: 'Annual rent', value: loading ? '…' : money0(stats.inPlace * 12) },
          ]}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <AccentStat label="Properties" value={properties.length} icon={Building2} accent="blue" loading={loading} hint={stats.invested ? `${money0(stats.invested)} invested` : 'Purchase price not set'} />
          <AccentStat label="Units" value={units.length} icon={Home} accent="indigo" loading={loading} hint={`${stats.occupied} occupied`} />
          <AccentStat label="Potential rent / mo" value={money0(stats.potential)} icon={Wallet} accent="emerald" loading={loading} hint="All units at listed rent" />
          <AccentStat
            label="Vacancy loss / mo"
            value={money0(stats.vacancyLoss)}
            icon={TrendingDown}
            accent="rose"
            tone={stats.vacancyLoss > 0 ? 'bad' : undefined}
            loading={loading}
            hint={`${units.length - stats.occupied} unit${units.length - stats.occupied === 1 ? '' : 's'} not rented`}
          />
          <AccentStat
            label="Leases ending ≤ 60 days"
            value={stats.expiring}
            icon={CalendarClock}
            accent="amber"
            tone={stats.expiring ? 'warn' : undefined}
            loading={loading}
            hint="Renew or re-list"
            className="col-span-2 lg:col-span-1"
          />
        </div>

        {!loading && properties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={selectedIds.length ? 'Add your first property' : 'Pick a company'}
            description={
              selectedIds.length
                ? 'Track each rental, its units, tenants and lease dates. You will see occupancy, rent in place and leases that are about to end.'
                : 'Choose one or more companies in the top bar to see their properties.'
            }
            action={selectedIds.length ? { label: 'New property', onClick: newProperty, icon: Plus } : undefined}
            steps={['Add the property', 'Add each unit with its rent', 'Fill in tenants and lease dates']}
          />
        ) : (
          <>
            {/* Property cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {properties.map((p) => {
                const s = propStats(p);
                const active = selectedProperty === p.id;
                return (
                  <Card
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedProperty(active ? 'all' : p.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedProperty(active ? 'all' : p.id)}
                    className={cn('cursor-pointer p-5 transition-shadow hover:shadow-md', active && 'ring-2 ring-orange-500')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{[p.address, p.city, p.state].filter(Boolean).join(', ') || 'No address'}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="outline">{label(p.property_type)}</Badge>
                          {selectedIds.length > 1 && <Badge variant="secondary">{companies.find((c) => c.id === p.company_id)?.name}</Badge>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8" aria-label="Property actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onSelect={() => newUnit(p.id)}>
                            <DoorOpen className="mr-2 h-4 w-4" /> Add unit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setPropForm(p)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit property
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirm({ kind: 'property', item: p })}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted/50 py-2">
                        <p className="text-[11px] text-muted-foreground">Units</p>
                        <p className="font-semibold tabular-nums">
                          {s.occupied}/{s.units}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 py-2">
                        <p className="text-[11px] text-muted-foreground">Rent / mo</p>
                        <p className="font-semibold tabular-nums">{money0(s.rent)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 py-2">
                        <p className="text-[11px] text-muted-foreground">Yield</p>
                        <p className="font-semibold tabular-nums">{s.yieldPct == null ? '—' : `${s.yieldPct.toFixed(1)}%`}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={cn('h-full rounded-full', s.pct >= 90 ? 'bg-emerald-500' : s.pct >= 60 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${s.pct}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{s.units ? `${s.pct.toFixed(0)}% occupied` : 'No units yet'}</p>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Units */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold">
                  {selectedProperty === 'all' ? 'All units' : `Units at ${propName(selectedProperty)}`}
                  {selectedProperty !== 'all' && (
                    <button type="button" className="ml-2 text-xs font-normal text-muted-foreground hover:text-foreground" onClick={() => setSelectedProperty('all')}>
                      Show all
                    </button>
                  )}
                </h2>
                <Button size="sm" variant="outline" onClick={() => newUnit()}>
                  <Plus className="mr-1 h-4 w-4" /> Add unit
                </Button>
              </div>
              <DataTable
                columns={columns}
                rows={visibleUnits}
                totalCount={units.length}
                getRowId={(u) => u.id}
                loading={loading}
                searchPlaceholder="Search unit, tenant, property…"
                exportFilename="units"
                initialSort={{ id: 'unit' }}
                onRowClick={(u) => setUnitForm(u)}
                filters={
                  <>
                    <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All properties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All properties</SelectItem>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="expiring">Lease ending ≤ 60 days</SelectItem>
                        {UNIT_STATUS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                }
                empty={
                  <EmptyState
                    icon={Users}
                    title="No units here yet"
                    description="Add each rentable unit with its rent. Single-family homes get one unit."
                    action={{ label: 'Add unit', onClick: () => newUnit(), icon: Plus }}
                  />
                }
              />
            </div>
          </>
        )}
      </div>

      {/* Property dialog */}
      <Dialog open={!!propForm} onOpenChange={(o) => !o && setPropForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{propForm?.id ? 'Edit property' : 'New property'}</DialogTitle>
            <DialogDescription>The building or parcel. Add its units after saving.</DialogDescription>
          </DialogHeader>
          {propForm && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name *</Label>
                <Input className="mt-1" value={propForm.name} onChange={(e) => setPropForm({ ...propForm, name: e.target.value })} placeholder="e.g. Oak Ridge Duplex" />
              </div>
              <div>
                <Label>Company</Label>
                <Select value={propForm.company_id} onValueChange={(v) => setPropForm({ ...propForm, company_id: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={propForm.property_type} onValueChange={(v) => setPropForm({ ...propForm, property_type: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {label(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Street address</Label>
                <Input className="mt-1" value={propForm.address ?? ''} onChange={(e) => setPropForm({ ...propForm, address: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input className="mt-1" value={propForm.city ?? ''} onChange={(e) => setPropForm({ ...propForm, city: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>State</Label>
                  <Input className="mt-1" value={propForm.state ?? ''} onChange={(e) => setPropForm({ ...propForm, state: e.target.value })} />
                </div>
                <div>
                  <Label>Zip</Label>
                  <Input className="mt-1" value={propForm.zip ?? ''} onChange={(e) => setPropForm({ ...propForm, zip: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Purchase price</Label>
                <Input className="mt-1" type="number" inputMode="decimal" value={propForm.purchase_price ?? ''} onChange={(e) => setPropForm({ ...propForm, purchase_price: num(e.target.value) })} />
                <p className="mt-1 text-xs text-muted-foreground">Used to show the rent yield.</p>
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea className="mt-1" rows={2} value={propForm.notes ?? ''} onChange={(e) => setPropForm({ ...propForm, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPropForm(null)}>
              Cancel
            </Button>
            <Button onClick={saveProperty} disabled={saving}>
              {propForm?.id ? 'Save changes' : 'Add property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit dialog */}
      <Dialog open={!!unitForm} onOpenChange={(o) => !o && setUnitForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{unitForm?.id ? `Edit unit ${unitForm.unit_number}` : 'New unit'}</DialogTitle>
            <DialogDescription>Rent, size, tenant and lease dates.</DialogDescription>
          </DialogHeader>
          {unitForm && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label>Property</Label>
                  <Select value={unitForm.property_id} onValueChange={(v) => setUnitForm({ ...unitForm, property_id: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit # *</Label>
                  <Input className="mt-1" value={unitForm.unit_number} onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })} placeholder="e.g. 2B" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={unitForm.status} onValueChange={(v) => setUnitForm({ ...unitForm, status: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_STATUS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {label(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Monthly rent</Label>
                  <Input className="mt-1" type="number" inputMode="decimal" value={unitForm.market_rent ?? ''} onChange={(e) => setUnitForm({ ...unitForm, market_rent: num(e.target.value) })} />
                </div>
                <div>
                  <Label>Sq ft</Label>
                  <Input className="mt-1" type="number" value={unitForm.square_feet ?? ''} onChange={(e) => setUnitForm({ ...unitForm, square_feet: num(e.target.value) })} />
                </div>
                <div>
                  <Label>Beds</Label>
                  <Input className="mt-1" type="number" step="0.5" value={unitForm.bedrooms ?? ''} onChange={(e) => setUnitForm({ ...unitForm, bedrooms: num(e.target.value) })} />
                </div>
                <div>
                  <Label>Baths</Label>
                  <Input className="mt-1" type="number" step="0.5" value={unitForm.bathrooms ?? ''} onChange={(e) => setUnitForm({ ...unitForm, bathrooms: num(e.target.value) })} />
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-semibold">Tenant & lease</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Tenant name</Label>
                    <Input className="mt-1" value={unitForm.tenant_name ?? ''} onChange={(e) => setUnitForm({ ...unitForm, tenant_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input className="mt-1" type="email" value={unitForm.tenant_email ?? ''} onChange={(e) => setUnitForm({ ...unitForm, tenant_email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input className="mt-1" value={unitForm.tenant_phone ?? ''} onChange={(e) => setUnitForm({ ...unitForm, tenant_phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Lease start</Label>
                    <Input className="mt-1" type="date" value={unitForm.lease_start ?? ''} onChange={(e) => setUnitForm({ ...unitForm, lease_start: e.target.value || null })} />
                  </div>
                  <div>
                    <Label>Lease end</Label>
                    <Input className="mt-1" type="date" value={unitForm.lease_end ?? ''} onChange={(e) => setUnitForm({ ...unitForm, lease_end: e.target.value || null })} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitForm(null)}>
              Cancel
            </Button>
            <Button onClick={saveUnit} disabled={saving}>
              {unitForm?.id ? 'Save changes' : 'Add unit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === 'property' ? 'Delete this property?' : 'Delete this unit?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'property'
                ? `"${confirm.item.name}" and its ${units.filter((u) => u.property_id === confirm.item.id).length} unit(s) will be removed.`
                : confirm
                  ? `Unit ${confirm.item.unit_number}${confirm.item.tenant_name ? ` (${confirm.item.tenant_name})` : ''} will be removed.`
                  : ''}{' '}
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={doDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
