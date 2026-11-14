import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { ProposalContact } from '@/utils/proposalWorkflow';

/** Asks for the client details a proposal needs, then continues with them. */
export function ClientInfoDialog({
  open,
  onOpenChange,
  projectName,
  defaults,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  defaults?: Partial<ProposalContact>;
  onSubmit: (contact: ProposalContact) => Promise<void>;
}) {
  const [form, setForm] = useState<ProposalContact>({ client: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ client: '', email: '', phone: '', clientAddress: '', projectAddress: '', ...defaults });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: keyof ProposalContact) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client.trim()) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Who is this proposal for?</DialogTitle>
            <DialogDescription>
              {projectName} doesn't have a client yet. Add them here and the proposal is created right away. The client name and
              job address are also saved to the project.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="ci-client">Client name *</Label>
              <Input id="ci-client" autoFocus required value={form.client} onChange={set('client')} placeholder="Client or owner name" />
            </div>
            <div>
              <Label htmlFor="ci-email">Email</Label>
              <Input id="ci-email" type="email" value={form.email} onChange={set('email')} placeholder="For sending and e-signature" />
            </div>
            <div>
              <Label htmlFor="ci-phone">Phone</Label>
              <Input id="ci-phone" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ci-caddr">Client mailing address</Label>
              <Input id="ci-caddr" value={form.clientAddress} onChange={set('clientAddress')} placeholder="Optional" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ci-paddr">Job address</Label>
              <Input id="ci-paddr" value={form.projectAddress} onChange={set('projectAddress')} placeholder="Where the work is" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.client.trim()} className="bg-orange-500 text-white hover:bg-orange-600">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save and create proposal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
