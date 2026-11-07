import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarPlus, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { INSPECTION_RESULTS, daysUntil, type Permit, type PermitInspection } from '@/types/permits';

const COMMON_INSPECTIONS = ['Footing', 'Foundation', 'Slab / Under-slab plumbing', 'Framing', 'Rough electrical', 'Rough plumbing', 'Rough mechanical', 'Insulation', 'Drywall', 'Final electrical', 'Final plumbing', 'Final building'];

const resultTone: Record<string, 'success' | 'destructive' | 'warning' | 'info' | 'secondary'> = {
  Passed: 'success',
  Failed: 'destructive',
  Partial: 'warning',
  Scheduled: 'info',
  Cancelled: 'secondary',
};

interface Props {
  permit: Permit | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function PermitInspectionsDialog({ permit, onOpenChange, onChanged }: Props) {
  const [form, setForm] = useState({ inspection_type: '', scheduled_date: '', scheduled_time: '', inspector: '' });
  const [saving, setSaving] = useState(false);

  const inspections = [...(permit?.permit_inspections || [])].sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permit || !form.inspection_type || !form.scheduled_date) return toast.error('Pick the inspection and the date.');
    setSaving(true);
    const { error } = await supabase.from('permit_inspections').insert({
      permit_id: permit.id,
      inspection_type: form.inspection_type,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time || null,
      inspector: form.inspector || null,
    });
    setSaving(false);
    if (error) return toast.error('Could not schedule the inspection.');
    toast.success('Inspection scheduled. You will get a reminder the day before.');
    setForm({ inspection_type: '', scheduled_date: '', scheduled_time: '', inspector: '' });
    onChanged();
  };

  const setResult = async (i: PermitInspection, result: string) => {
    const { error } = await supabase.from('permit_inspections').update({ result }).eq('id', i.id);
    if (error) return toast.error('Could not update the inspection.');
    onChanged();
  };

  const remove = async (i: PermitInspection) => {
    if (!confirm(`Delete the ${i.inspection_type} inspection?`)) return;
    const { error } = await supabase.from('permit_inspections').delete().eq('id', i.id);
    if (error) return toast.error('Could not delete the inspection.');
    onChanged();
  };

  return (
    <Dialog open={!!permit} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inspections · {permit?.permit_type} permit{permit?.permit_number ? ` #${permit.permit_number}` : ''}</DialogTitle>
          <DialogDescription>{permit?.projects?.name}{permit?.issuing_authority ? ` · ${permit.issuing_authority}` : ''}</DialogDescription>
        </DialogHeader>

        <form onSubmit={add} className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-[1.4fr_1fr_0.8fr]">
          <div className="sm:col-span-3 text-sm font-medium">Schedule an inspection</div>
          <div>
            <Label>Inspection *</Label>
            <Input list="inspection-types" value={form.inspection_type} onChange={(e) => setForm({ ...form, inspection_type: e.target.value })} placeholder="e.g. Rough electrical" />
            <datalist id="inspection-types">{COMMON_INSPECTIONS.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
          <div>
            <Label>Date *</Label>
            <Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
          </div>
          <div>
            <Label>Time</Label>
            <Input value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} placeholder="AM / 9-12" />
          </div>
          <div className="sm:col-span-2">
            <Label>Inspector</Label>
            <Input value={form.inspector} onChange={(e) => setForm({ ...form, inspector: e.target.value })} placeholder="Name or phone" />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Schedule
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          {inspections.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No inspections yet.</p>
          ) : (
            inspections.map((i) => {
              const days = daysUntil(i.scheduled_date);
              const when = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : format(new Date(`${i.scheduled_date}T00:00:00`), 'EEE, MMM d, yyyy');
              return (
                <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{i.inspection_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {when}{i.scheduled_time ? ` · ${i.scheduled_time}` : ''}{i.inspector ? ` · ${i.inspector}` : ''}
                    </div>
                  </div>
                  <Select value={i.result} onValueChange={(v) => setResult(i, v)}>
                    <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden" aria-label="Result">
                      <Badge variant={resultTone[i.result] || 'secondary'} className="cursor-pointer">{i.result}</Badge>
                    </SelectTrigger>
                    <SelectContent>{INSPECTION_RESULTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(i)} aria-label="Delete inspection">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
