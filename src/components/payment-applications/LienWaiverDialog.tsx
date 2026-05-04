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

interface Sub { id: string; name: string; email: string | null; company_name: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paymentApp: {
    id: string;
    application_number: number;
    project_id: string | null;
    period_to: string;
    current_payment_due: number;
    project_name?: string;
    project_address?: string;
    client?: string;
  };
}

export function LienWaiverDialog({ open, onOpenChange, paymentApp }: Props) {
  const [type, setType] = useState<WaiverType>('conditional_progress');
  const [amount, setAmount] = useState<string>(String(paymentApp.current_payment_due ?? 0));
  const [throughDate, setThroughDate] = useState<string>(paymentApp.period_to?.slice(0, 10) || new Date().toISOString().slice(0, 10));
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
    setAmount(String(paymentApp.current_payment_due ?? 0));
    setThroughDate(paymentApp.period_to?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    (async () => {
      const { data } = await supabase
        .from('subcontractors')
        .select('id, name, email, company_name')
        .order('name');
      setSubs((data as any) || []);
    })();
  }, [open, paymentApp]);

  const selectedSub = subs.find(s => s.id === subId);
  const recipientName = overrideName.trim() || selectedSub?.company_name || selectedSub?.name || '';
  const recipientEmail = overrideEmail.trim() || selectedSub?.email || '';

  const buildPdf = async () => {
    return await generateLienWaiverPdf({
      type,
      projectName: paymentApp.project_name || 'Project',
      projectAddress: paymentApp.project_address,
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
      a.download = `Lien_Waiver_${paymentApp.application_number}_${recipientName || 'Sub'}.pdf`.replace(/\s+/g, '_');
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Waiver downloaded');
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
      const file = new File([blob], `Lien_Waiver_${paymentApp.application_number}.pdf`, { type: 'application/pdf' });
      const env = await createEnv.mutateAsync({
        title: `${WAIVER_LABELS[type]} — Payment App #${paymentApp.application_number}`,
        message: `Please review and sign this lien waiver for Payment Application #${paymentApp.application_number}.`,
        signing_order: 'parallel',
        source_type: 'invoice',
        source_id: paymentApp.id,
        project_id: paymentApp.project_id || undefined,
        document_type: 'Lien Waiver',
        company: recipientName,
        payment_app_number: String(paymentApp.application_number),
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
            <FileSignature className="h-5 w-5" /> Lien Waiver — App #{paymentApp.application_number}
          </DialogTitle>
          <DialogDescription>
            Auto-fills from the payment application. Choose a waiver type, pick a subcontractor, then download or send for signature.
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
            <Label className="text-xs uppercase tracking-wide">Recipient (Subcontractor)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="md:col-span-2">
                <Select value={subId} onValueChange={setSubId}>
                  <SelectTrigger><SelectValue placeholder="Select a subcontractor…" /></SelectTrigger>
                  <SelectContent>
                    {subs.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.company_name || s.name}{s.email ? ` — ${s.email}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Override Name</Label>
                <Input value={overrideName} onChange={e => setOverrideName(e.target.value)} placeholder={selectedSub?.company_name || selectedSub?.name || ''} />
              </div>
              <div>
                <Label className="text-xs">Override Email</Label>
                <Input value={overrideEmail} onChange={e => setOverrideEmail(e.target.value)} placeholder={selectedSub?.email || ''} />
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