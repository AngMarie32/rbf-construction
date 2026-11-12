import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BOND_STATUSES, BOND_TYPES, type Bond, type BondCapacity } from '@/types/bonds';

const money0 = (n: number) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const blank = (projectId = '', surety = '') => ({
  project_id: projectId,
  bond_type: 'Performance & Payment',
  bond_number: '',
  surety,
  obligee: '',
  amount: '',
  premium: '',
  premium_paid: false,
  status: 'Requested',
  effective_date: '',
  expiration_date: '',
  notes: '',
});

export function BondFormDialog({
  open,
  onOpenChange,
  projects,
  bond,
  defaultProjectId,
  capacity,
  exposureAfter,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string; contract_value?: number | null; client?: string | null }[];
  bond?: Bond | null;
  defaultProjectId?: string;
  capacity: BondCapacity;
  /** Bonded work after saving this bond with the given amount (for the capacity check). */
  exposureAfter: (projectId: string, bondId: string | undefined, amount: number) => number;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(blank(defaultProjectId, capacity.surety || ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      bond
        ? {
            project_id: bond.project_id,
            bond_type: bond.bond_type,
            bond_number: bond.bond_number || '',
            surety: bond.surety || '',
            obligee: bond.obligee || '',
            amount: String(bond.amount ?? ''),
            premium: bond.premium != null ? String(bond.premium) : '',
            premium_paid: bond.premium_paid,
            status: bond.status,
            effective_date: bond.effective_date || '',
            expiration_date: bond.expiration_date || '',
            notes: bond.notes || '',
          }
        : blank(defaultProjectId, capacity.surety || '')
    );
  }, [open, bond, defaultProjectId, capacity.surety]);

  const set = (k: keyof ReturnType<typeof blank>, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const project = projects.find((p) => p.id === form.project_id);

  // Capacity check for bonds that use program capacity
  const check = useMemo(() => {
    const amt = Number(form.amount) || 0;
    const counts = ['Performance', 'Payment', 'Performance & Payment'].includes(form.bond_type) && ['Active', 'Requested'].includes(form.status);
    if (!counts || !amt) return null;
    const overSingle = capacity.single > 0 && amt > capacity.single;
    const after = exposureAfter(form.project_id, bond?.id, amt);
    const overAggregate = capacity.aggregate > 0 && after > capacity.aggregate;
    return { overSingle, overAggregate, after };
  }, [form.amount, form.bond_type, form.status, form.project_id, capacity, exposureAfter, bond?.id]);

  const save = async () => {
    if (!form.project_id) return toast.error('Pick the job this bond is for.');
    if (!(Number(form.amount) > 0)) return toast.error('Enter the bond amount (penal sum).');
    setSaving(true);
    const row = {
      project_id: form.project_id,
      bond_type: form.bond_type,
      bond_number: form.bond_number.trim() || null,
      surety: form.surety.trim() || null,
      obligee: form.obligee.trim() || null,
      amount: Number(form.amount) || 0,
      premium: form.premium === '' ? null : Number(form.premium),
      premium_paid: form.premium_paid,
      status: form.status,
      effective_date: form.effective_date || null,
      expiration_date: form.expiration_date || null,
      notes: form.notes.trim() || null,
    };
    const { error } = bond
      ? await (supabase as any).from('project_bonds').update(row).eq('id', bond.id)
      : await (supabase as any).from('project_bonds').insert(row);
    setSaving(false);
    if (error) {
      toast.error(
        /relation|does not exist|schema cache/i.test(error.message)
          ? 'Bonds need a database update first (bonds and capacity). Ask an admin to run it, then try again.'
          : `Could not save the bond: ${error.message}`
      );
      return;
    }
    toast.success(bond ? 'Bond updated' : 'Bond added');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{bond ? 'Edit bond' : 'Add bond'}</DialogTitle>
          <DialogDescription>Bid, performance, payment and other surety bonds for a job.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Job *</Label>
            <Select value={form.project_id} onValueChange={(v) => set('project_id', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose the job" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bond type</Label>
            <Select value={form.bond_type} onValueChange={(v) => set('bond_type', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOND_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOND_STATUSES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bond amount (penal sum) *</Label>
            <Input className="mt-1" type="number" inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" />
            {project?.contract_value ? (
              <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => set('amount', String(project.contract_value))}>
                Use contract value ({money0(Number(project.contract_value))})
              </button>
            ) : null}
          </div>
          <div>
            <Label>Bond number</Label>
            <Input className="mt-1" value={form.bond_number} onChange={(e) => set('bond_number', e.target.value)} />
          </div>
          <div>
            <Label>Surety</Label>
            <Input className="mt-1" value={form.surety} onChange={(e) => set('surety', e.target.value)} placeholder="Insurance company" />
          </div>
          <div>
            <Label>Obligee</Label>
            <Input className="mt-1" value={form.obligee} onChange={(e) => set('obligee', e.target.value)} placeholder={project?.client || 'Owner / agency protected by the bond'} />
          </div>
          <div>
            <Label>Effective date</Label>
            <Input className="mt-1" type="date" value={form.effective_date} onChange={(e) => set('effective_date', e.target.value)} />
          </div>
          <div>
            <Label>Expiration date</Label>
            <Input className="mt-1" type="date" value={form.expiration_date} onChange={(e) => set('expiration_date', e.target.value)} />
          </div>
          <div>
            <Label>Premium</Label>
            <Input className="mt-1" type="number" inputMode="decimal" value={form.premium} onChange={(e) => set('premium', e.target.value)} placeholder="0" />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <Checkbox checked={form.premium_paid} onCheckedChange={(v) => set('premium_paid', !!v)} /> Premium paid
          </label>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        {check && (check.overSingle || check.overAggregate) && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              {check.overSingle && <p>This bond is over your single-job limit of {money0(capacity.single)}.</p>}
              {check.overAggregate && (
                <p>
                  With this bond, bonded work would be {money0(check.after)}, over your aggregate capacity of {money0(capacity.aggregate)}.
                </p>
              )}
              <p className="text-xs opacity-80">You can still save it; talk to your surety agent about approval.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {bond ? 'Save changes' : 'Add bond'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
