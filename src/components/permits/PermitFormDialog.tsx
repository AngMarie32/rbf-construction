import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PERMIT_STATUSES, PERMIT_TYPES, type Permit } from '@/types/permits';

interface PermitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[];
  /** Permit to edit; omit to create a new one. */
  permit?: Permit | null;
  defaultProjectId?: string;
  onSaved: () => void;
}

const blank = (projectId = '') => ({
  project_id: projectId,
  permit_type: 'Building',
  permit_number: '',
  description: '',
  issuing_authority: '',
  status: 'Not Applied',
  application_date: '',
  issued_date: '',
  expiration_date: '',
  fee_amount: '',
  fee_paid: false,
  notes: '',
});

export function PermitFormDialog({ open, onOpenChange, projects, permit, defaultProjectId, onSaved }: PermitFormDialogProps) {
  const [form, setForm] = useState(blank(defaultProjectId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      permit
        ? {
            project_id: permit.project_id,
            permit_type: permit.permit_type,
            permit_number: permit.permit_number || '',
            description: permit.description,
            issuing_authority: permit.issuing_authority,
            status: permit.status,
            application_date: permit.application_date || '',
            issued_date: permit.issued_date || '',
            expiration_date: permit.expiration_date || '',
            fee_amount: permit.fee_amount != null ? String(permit.fee_amount) : '',
            fee_paid: permit.fee_paid,
            notes: permit.notes || '',
          }
        : blank(defaultProjectId)
    );
  }, [open, permit, defaultProjectId]);

  const set = <K extends keyof ReturnType<typeof blank>>(k: K, v: ReturnType<typeof blank>[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) return toast.error('Choose the job this permit is for.');
    setSaving(true);
    const row = {
      project_id: form.project_id,
      permit_type: form.permit_type,
      permit_number: form.permit_number || null,
      description: form.description,
      issuing_authority: form.issuing_authority,
      status: form.status,
      application_date: form.application_date || null,
      issued_date: form.issued_date || null,
      expiration_date: form.expiration_date || null,
      fee_amount: form.fee_amount ? parseFloat(form.fee_amount) : null,
      fee_paid: form.fee_paid,
      notes: form.notes || null,
    };
    const { error } = permit
      ? await supabase.from('permits').update(row).eq('id', permit.id)
      : await supabase.from('permits').insert(row);
    setSaving(false);
    if (error) {
      console.error(error);
      return toast.error('Could not save the permit.');
    }
    toast.success(permit ? 'Permit updated.' : 'Permit added.');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{permit ? 'Edit permit' : 'Add a permit'}</DialogTitle>
          <DialogDescription>Track the permit number, dates and fee. Add inspections after saving.</DialogDescription>
        </DialogHeader>

        <form id="permit-form" onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Job *</Label>
              <Select value={form.project_id} onValueChange={(v) => set('project_id', v)}>
                <SelectTrigger><SelectValue placeholder="Which job is this permit for?" /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Permit type *</Label>
              <Select value={form.permit_type} onValueChange={(v) => set('permit_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERMIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERMIT_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Permit number</Label>
              <Input value={form.permit_number} onChange={(e) => set('permit_number', e.target.value)} placeholder="e.g. BP-2026-01482" />
            </div>
            <div>
              <Label>Issuing authority</Label>
              <Input value={form.issuing_authority} onChange={(e) => set('issuing_authority', e.target.value)} placeholder="e.g. City of Austin DSD" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Kitchen and primary bath remodel" />
            </div>
            <div>
              <Label>Applied</Label>
              <Input type="date" value={form.application_date} onChange={(e) => set('application_date', e.target.value)} />
            </div>
            <div>
              <Label>Issued</Label>
              <Input type="date" value={form.issued_date} onChange={(e) => set('issued_date', e.target.value)} />
            </div>
            <div>
              <Label>Expires</Label>
              <Input type="date" value={form.expiration_date} onChange={(e) => set('expiration_date', e.target.value)} />
            </div>
            <div>
              <Label>Fee</Label>
              <Input type="number" step="0.01" inputMode="decimal" value={form.fee_amount} onChange={(e) => set('fee_amount', e.target.value)} />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <Checkbox checked={form.fee_paid} onCheckedChange={(v) => set('fee_paid', v === true)} /> Fee paid
              </label>
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="permit-form" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {permit ? 'Save changes' : 'Add permit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
