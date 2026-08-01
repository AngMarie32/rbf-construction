import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

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

const money = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusTone = (s: string) =>
  s === 'occupied' ? 'bg-green-500/15 text-green-500'
  : s === 'vacant' ? 'bg-blue-500/15 text-blue-500'
  : 'bg-yellow-500/15 text-yellow-500';

function emptyProperty(companyId: string): Property & { id: string } {
  return {
    id: '', company_id: companyId, name: '', address: '', city: '', state: '', zip: '',
    property_type: 'residential', purchase_price: null, notes: '',
  };
}

function emptyUnit(propertyId: string): Unit {
  return {
    id: '', property_id: propertyId, unit_number: '', bedrooms: null, bathrooms: null,
    square_feet: null, market_rent: null, status: 'vacant', tenant_name: '', tenant_email: '',
    tenant_phone: '', lease_start: null, lease_end: null,
  };
}

export default function Properties() {
  const { companies, selectedIds } = useCompanies();
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [propForm, setPropForm] = useState<Property | null>(null);
  const [unitForm, setUnitForm] = useState<Unit | null>(null);

  const load = useCallback(async () => {
    if (selectedIds.length === 0) {
      setProperties([]); setUnits([]); setLoading(false); return;
    }
    setLoading(true);
    const { data: props } = await supabase
      .from('properties').select('*').in('company_id', selectedIds).order('name');
    const list = ((props as any) || []) as Property[];
    setProperties(list);
    if (list.length) {
      const { data: u } = await supabase
        .from('property_units').select('*').in('property_id', list.map((p) => p.id)).order('unit_number');
      setUnits(((u as any) || []) as Unit[]);
    } else {
      setUnits([]);
    }
    setLoading(false);
  }, [selectedIds]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const occupied = units.filter((u) => u.status === 'occupied');
    const potential = units.reduce((s, u) => s + (Number(u.market_rent) || 0), 0);
    const actual = occupied.reduce((s, u) => s + (Number(u.market_rent) || 0), 0);
    return {
      properties: properties.length,
      units: units.length,
      occupied: occupied.length,
      occupancy: units.length ? Math.round((occupied.length / units.length) * 100) : 0,
      potential, actual,
    };
  }, [properties, units]);

  const saveProperty = async () => {
    if (!propForm) return;
    if (!propForm.name.trim()) return toast.error('Property name required');
    if (!propForm.company_id) return toast.error('Select a company');
    const { id, ...rest } = propForm;
    const payload = { ...rest, purchase_price: propForm.purchase_price ?? null };
    const { error } = id
      ? await supabase.from('properties').update(payload).eq('id', id)
      : await supabase.from('properties').insert(payload);
    if (error) return toast.error(error.message);
    toast.success(id ? 'Property updated' : 'Property added');
    setPropForm(null);
    load();
  };

  const saveUnit = async () => {
    if (!unitForm) return;
    if (!unitForm.unit_number.trim()) return toast.error('Unit number required');
    const { id, ...rest } = unitForm;
    const { error } = id
      ? await supabase.from('property_units').update(rest).eq('id', id)
      : await supabase.from('property_units').insert(rest);
    if (error) return toast.error(error.message);
    toast.success(id ? 'Unit updated' : 'Unit added');
    setUnitForm(null);
    load();
  };

  const removeProperty = async (id: string) => {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Property deleted');
    load();
  };

  const removeUnit = async (id: string) => {
    const { error } = await supabase.from('property_units').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const num = (v: string) => (v === '' ? null : Number(v));

  return (
    <Layout title="Properties" subtitle="Rental properties, units, and tenants by company">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Properties', value: String(stats.properties) },
          { label: 'Units', value: String(stats.units) },
          { label: 'Occupancy', value: `${stats.occupancy}%` },
          { label: 'Rent in place', value: money(stats.actual) },
          { label: 'Potential rent', value: money(stats.potential) },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="text-xl font-display font-bold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={() => setPropForm(emptyProperty(selectedIds[0] || ''))}>
          <Plus className="h-4 w-4 mr-1" /> New Property
        </Button>
      </div>

      {propForm && (
        <Card className="p-6 space-y-4 mt-3">
          <h2 className="font-display text-lg">{propForm.id ? 'Edit property' : 'New property'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Company</Label>
              <Select value={propForm.company_id} onValueChange={(v) => setPropForm({ ...propForm, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={propForm.name} onChange={(e) => setPropForm({ ...propForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={propForm.property_type} onValueChange={(v) => setPropForm({ ...propForm, property_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={propForm.address ?? ''} onChange={(e) => setPropForm({ ...propForm, address: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={propForm.city ?? ''} onChange={(e) => setPropForm({ ...propForm, city: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>State</Label>
                <Input value={propForm.state ?? ''} onChange={(e) => setPropForm({ ...propForm, state: e.target.value })} />
              </div>
              <div>
                <Label>Zip</Label>
                <Input value={propForm.zip ?? ''} onChange={(e) => setPropForm({ ...propForm, zip: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Purchase price</Label>
              <Input
                type="number" step="0.001"
                value={propForm.purchase_price ?? ''}
                onChange={(e) => setPropForm({ ...propForm, purchase_price: num(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Input value={propForm.notes ?? ''} onChange={(e) => setPropForm({ ...propForm, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPropForm(null)}>Cancel</Button>
            <Button onClick={saveProperty}>{propForm.id ? 'Save' : 'Create'}</Button>
          </div>
        </Card>
      )}

      {unitForm && (
        <Card className="p-6 space-y-4 mt-3">
          <h2 className="font-display text-lg">{unitForm.id ? 'Edit unit' : 'New unit'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Unit #</Label>
              <Input value={unitForm.unit_number} onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={unitForm.status} onValueChange={(v) => setUnitForm({ ...unitForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monthly rent</Label>
              <Input type="number" step="0.001" value={unitForm.market_rent ?? ''}
                onChange={(e) => setUnitForm({ ...unitForm, market_rent: num(e.target.value) })} />
            </div>
            <div>
              <Label>Sq ft</Label>
              <Input type="number" value={unitForm.square_feet ?? ''}
                onChange={(e) => setUnitForm({ ...unitForm, square_feet: num(e.target.value) })} />
            </div>
            <div>
              <Label>Beds</Label>
              <Input type="number" step="0.5" value={unitForm.bedrooms ?? ''}
                onChange={(e) => setUnitForm({ ...unitForm, bedrooms: num(e.target.value) })} />
            </div>
            <div>
              <Label>Baths</Label>
              <Input type="number" step="0.5" value={unitForm.bathrooms ?? ''}
                onChange={(e) => setUnitForm({ ...unitForm, bathrooms: num(e.target.value) })} />
            </div>
            <div>
              <Label>Tenant name</Label>
              <Input value={unitForm.tenant_name ?? ''} onChange={(e) => setUnitForm({ ...unitForm, tenant_name: e.target.value })} />
            </div>
            <div>
              <Label>Tenant email</Label>
              <Input value={unitForm.tenant_email ?? ''} onChange={(e) => setUnitForm({ ...unitForm, tenant_email: e.target.value })} />
            </div>
            <div>
              <Label>Tenant phone</Label>
              <Input value={unitForm.tenant_phone ?? ''} onChange={(e) => setUnitForm({ ...unitForm, tenant_phone: e.target.value })} />
            </div>
            <div>
              <Label>Lease start</Label>
              <Input type="date" value={unitForm.lease_start ?? ''} onChange={(e) => setUnitForm({ ...unitForm, lease_start: e.target.value || null })} />
            </div>
            <div>
              <Label>Lease end</Label>
              <Input type="date" value={unitForm.lease_end ?? ''} onChange={(e) => setUnitForm({ ...unitForm, lease_end: e.target.value || null })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUnitForm(null)}>Cancel</Button>
            <Button onClick={saveUnit}>{unitForm.id ? 'Save' : 'Create'}</Button>
          </div>
        </Card>
      )}

      <div className="space-y-2 mt-4">
        {loading ? <p className="text-muted-foreground">Loading...</p>
         : properties.length === 0 ? <p className="text-muted-foreground">No properties for the selected companies.</p>
         : properties.map((p) => {
            const pUnits = units.filter((u) => u.property_id === p.id);
            const open = expanded[p.id];
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <button
                    className="flex items-center gap-2 min-w-0 text-left"
                    onClick={() => setExpanded({ ...expanded, [p.id]: !open })}
                  >
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold truncate">{p.name}</h3>
                        <Badge variant="outline">{p.property_type.replace('_', ' ')}</Badge>
                        <Badge variant="secondary">{companies.find((c) => c.id === p.company_id)?.name}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[p.address, p.city, p.state, p.zip].filter(Boolean).join(', ') || 'No address'} · {pUnits.length} unit(s)
                        {' · '}{money(pUnits.filter((u) => u.status === 'occupied').reduce((s, u) => s + (Number(u.market_rent) || 0), 0))}/mo in place
                      </p>
                    </div>
                  </button>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setUnitForm(emptyUnit(p.id))}>
                      <Plus className="h-3 w-3 mr-1" />Unit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPropForm(p)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => removeProperty(p.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>

                {open && (
                  <div className="mt-3 border-t border-border pt-3">
                    {pUnits.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No units yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="py-1">Unit</th>
                            <th className="py-1">Status</th>
                            <th className="py-1">Tenant</th>
                            <th className="py-1">Lease</th>
                            <th className="py-1 text-right">Rent</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {pUnits.map((u) => (
                            <tr key={u.id} className="border-t border-border/50">
                              <td className="py-2">{u.unit_number}</td>
                              <td className="py-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${statusTone(u.status)}`}>{u.status}</span>
                              </td>
                              <td className="py-2">{u.tenant_name || '—'}</td>
                              <td className="py-2 text-xs text-muted-foreground">
                                {u.lease_start || '—'} → {u.lease_end || '—'}
                              </td>
                              <td className="py-2 text-right">{money(u.market_rent)}</td>
                              <td className="py-2 text-right whitespace-nowrap">
                                <Button size="sm" variant="ghost" onClick={() => setUnitForm(u)}><Pencil className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => removeUnit(u.id)}><Trash2 className="h-3 w-3" /></Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
      </div>
    </Layout>
  );
}