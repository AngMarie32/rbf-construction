import { localDateISO } from '@/utils/dates';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateLienWaiverPdf, WAIVER_LABELS, type WaiverType } from '@/utils/lienWaiverPdf';
import { useCreateEnvelope, useUploadEnvelopePdf, useSendEnvelope } from '@/hooks/useEsign';
import { FileSignature, Download, Send } from 'lucide-react';

interface Sub { id: string; name: string; email: string | null; company: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paymentApp?: {
    id: string;
    application_number: number;
    project_id: string | null;
    period_to: string;
    current_payment_due: number;
    project_name?: string;
    project_address?: string;
    client?: string;
  };
  /** Send a waiver for an expense (vendor or sub payment) instead of a payment application. */
  expense?: {
    id: string;
    project_id: string | null;
    project_name?: string;
    project_address?: string;
    amount: number;
    date: string;
    vendor?: string | null;
    description?: string | null;
    paid?: boolean;
  };
}

export function LienWaiverDialog({ open, onOpenChange, paymentApp, expense }: Props) {
  // One shape for both sources.
  const src = paymentApp
    ? { id: paymentApp.id, project_id: paymentApp.project_id, project_name: paymentApp.project_name, project_address: paymentApp.project_address, amount: paymentApp.current_payment_due, date: paymentApp.period_to, ref: `Payment App #${paymentApp.application_number}`, file: `App${paymentApp.application_number}` }
    : { id: expense!.id, project_id: expense!.project_id, project_name: expense!.project_name, project_address: expense!.project_address, amount: expense!.amount, date: expense!.date, ref: `Expense${expense!.description ? `: ${expense!.description}` : ''}`, file: 'Expense' };
  const [type, setType] = useState<WaiverType>(expense?.paid ? 'unconditional_progress' : 'conditional_progress');
  const [amount, setAmount] = useState<string>(String(src.amount ?? 0));
  const [throughDate, setThroughDate] = useState<string>(src.date?.slice(0, 10) || localDateISO());
  const [exceptions, setExceptions] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [subs, setSubs] = useState<Sub[]>([]);
  const [subId, setSubId] = useState<string>('');
  const [overrideName, setOverrideName] = useState('');
  const [overrideEmail, setOverrideEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const createEnv = useCreateEnvelope();
  const upload = useUploadEnvelopePdf();
  const send = useSendEnvelope();

  useEffect(() => {
    if (!open) return;
    setAmount(String(src.amount ?? 0));
    setThroughDate(src.date?.slice(0, 10) || localDateISO());
    if (expense) setType(expense.paid ? 'unconditional_progress' : 'conditional_progress');
    (async () => {
      const { data } = await supabase
        .from('subcontractors')
        .select('id, name, email, company')
        .order('name');
      const list = ((data as any) || []) as Sub[];
      setSubs(list);
      // Match the expense vendor to a subcontractor; otherwise use the vendor name as typed.
      if (expense?.vendor) {
        const v = expense.vendor.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const hit = list.find((x) => [x.company, x.name].some((n) => n && n.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === v));
        if (hit) {
          setSubId(hit.id);
          setOverrideName('');
        } else {
          setSubId('');
          setOverrideName(expense.vendor);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paymentApp?.id, expense?.id]);

  const selectedSub = subs.find(s => s.id === subId);
  const recipientName = overrideName.trim() || selectedSub?.company || selectedSub?.name || '';
  const recipientEmail = overrideEmail.trim() || selectedSub?.email || '';

  const buildPdf = async () => {
    return await generateLienWaiverPdf({
      type,
      projectName: src.project_name || 'Project',
      projectAddress: src.project_address,
      contractorName: recipientName || '[Subcontractor]',
      customerName: 'RBF Construction',
      amountPaid: Number(amount) || 0,
      throughDate,
      checkNumber: checkNumber.trim() || undefined,
      exceptions: exceptions.trim() || undefined,
    });
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await buildPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lien_Waiver_${src.file}_${recipientName || 'Sub'}.pdf`.replace(/\s+/g, '_');
      a.click();
      URL.revokeObjectURL(url);
      // Track this waiver as pending
      if (paymentApp) await supabase.from('payment_app_lien_waivers').insert({
        payment_app_id: paymentApp.id,
        project_id: paymentApp.project_id,
        subcontractor_id: subId || null,
        recipient_name: recipientName || '[Subcontractor]',
        recipient_email: recipientEmail || null,
        waiver_type: type,
        amount: Number(amount) || 0,
        through_date: throughDate,
        status: 'pending',
        notes: exceptions || null,
      });
      toast.success('Waiver downloaded');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate PDF');
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!recipientName) return toast.error('Pick a subcontractor or enter a name');
    if (!recipientEmail) return toast.error('Recipient email is required');
    setBusy(true);
    try {
      const blob = await buildPdf();
      const file = new File([blob], `Lien_Waiver_${src.file}.pdf`, { type: 'application/pdf' });
      const env = await createEnv.mutateAsync({
        title: `${WAIVER_LABELS[type]} — ${paymentApp ? src.ref : `${recipientName}${src.project_name ? ` · ${src.project_name}` : ''}`}`,
        message: paymentApp
          ? `Please review and sign this lien waiver for Payment Application #${paymentApp.application_number}.`
          : `Please review and sign this lien waiver for payment of ${(Number(amount) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}${src.project_name ? ` on ${src.project_name}` : ''}.`,
        signing_order: 'parallel',
        source_type: paymentApp ? 'invoice' : 'expense',
        source_id: src.id,
        project_id: src.project_id || undefined,
        document_type: 'Lien Waiver',
        company: recipientName,
        payment_app_number: paymentApp ? String(paymentApp.application_number) : undefined,
      });
      await upload.mutateAsync({ envelopeId: env.id, file });

      // Add the sub as the signer
      const { error: sErr } = await supabase.from('esign_signers').insert({
        envelope_id: env.id,
        name: recipientName,
        email: recipientEmail,
        order_index: 1,
        access_token: crypto.randomUUID(),
      });
      if (sErr) throw sErr;

      // Auto-place a signature + date field on page 1 at the bottom
      const { data: signer } = await supabase
        .from('esign_signers').select('id').eq('envelope_id', env.id).single();
      if (signer) {
        await supabase.from('esign_fields').insert([
          { envelope_id: env.id, signer_id: signer.id, field_type: 'signature', page_number: 1, x_pct: 12, y_pct: 70, width_pct: 35, height_pct: 5, required: true },
          { envelope_id: env.id, signer_id: signer.id, field_type: 'date', page_number: 1, x_pct: 60, y_pct: 70, width_pct: 18, height_pct: 4, required: true },
          { envelope_id: env.id, signer_id: signer.id, field_type: 'name', page_number: 1, x_pct: 12, y_pct: 78, width_pct: 35, height_pct: 4, required: true },
          { envelope_id: env.id, signer_id: signer.id, field_type: 'text', page_number: 1, x_pct: 60, y_pct: 78, width_pct: 25, height_pct: 4, required: false },
        ]);
      }

      await send.mutateAsync(env.id);
      // Track waiver as requested
      if (paymentApp) await supabase.from('payment_app_lien_waivers').insert({
        payment_app_id: paymentApp.id,
        project_id: paymentApp.project_id,
        subcontractor_id: subId || null,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        waiver_type: type,
        amount: Number(amount) || 0,
        through_date: throughDate,
        status: 'requested',
        envelope_id: env.id,
        notes: exceptions || null,
      });
      toast.success('Waiver sent for signature');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" /> Lien waiver — {paymentApp ? `App #${paymentApp.application_number}` : src.project_name || 'Expense'}
          </DialogTitle>
          <DialogDescription>
            {paymentApp
              ? 'Auto-fills from the payment application. Choose a waiver type, pick a subcontractor, then download or send for signature.'
              : 'Auto-fills from the expense. Choose a waiver type, confirm who signs it, then download or send for signature. The signed copy appears in E-Sign.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Waiver Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(WAIVER_LABELS) as WaiverType[]).map(t => (
                    <SelectItem key={t} value={t}>{WAIVER_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Through Date</Label>
              <Input type="date" value={throughDate} onChange={e => setThroughDate(e.target.value)} />
            </div>
            <div>
              <Label>Amount of Payment ($)</Label>
              <Input type="number" step="0.001" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Check / Reference # (optional)</Label>
              <Input value={checkNumber} onChange={e => setCheckNumber(e.target.value)} />
            </div>
          </div>

          <Card className="p-3">
            <Label className="text-xs uppercase tracking-wide">Who signs it (subcontractor or vendor)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="md:col-span-2">
                <Select value={subId} onValueChange={setSubId}>
                  <SelectTrigger><SelectValue placeholder="Select a subcontractor…" /></SelectTrigger>
                  <SelectContent>
                    {subs.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.company || s.name}{s.email ? ` — ${s.email}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Override Name</Label>
                <Input value={overrideName} onChange={e => setOverrideName(e.target.value)} placeholder={selectedSub?.company || selectedSub?.name || 'Company or person signing'} />
              </div>
              <div>
                <Label className="text-xs">Override Email</Label>
                <Input value={overrideEmail} onChange={e => setOverrideEmail(e.target.value)} placeholder={selectedSub?.email || 'Their email'} />
              </div>
            </div>
          </Card>

          <div>
            <Label>Exceptions (optional)</Label>
            <Textarea value={exceptions} onChange={e => setExceptions(e.target.value)} placeholder="List any disputed amounts or retention…" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={busy}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
          <Button onClick={handleSend} disabled={busy}>
            <Send className="h-4 w-4 mr-2" /> Send for Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}