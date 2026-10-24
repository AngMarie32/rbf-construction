import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { tth } from '@/integrations/supabase/tradertax';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Download, FileSignature, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TthClient, TthEngagement, TthFiling, TthFirmProfile } from '@/types/tradertax';
import {
  DEFAULT_EXCLUSIONS,
  buildScopeFromFilings,
  generateEngagementLetter,
} from '@/utils/traderTax/engagementLetter';
import { money, shortDate } from '@/utils/traderTax/labels';

interface EnvelopeRow {
  id: string;
  status: string;
  sent_at: string | null;
  completed_at: string | null;
  title: string;
}

interface EngagementLetterCardProps {
  client: TthClient;
  engagement: TthEngagement;
  filings: TthFiling[];
  onRefresh: () => Promise<void> | void;
}

/**
 * Engagement letters ride on the app's existing e-sign module rather than a
 * parallel system: the envelope is tagged with source_type 'tth_engagement'
 * so it shows up in the e-sign dashboard alongside everything else.
 */
export function EngagementLetterCard({
  client,
  engagement,
  filings,
  onRefresh,
}: EngagementLetterCardProps) {
  const { user } = useAuth();
  const [envelope, setEnvelope] = useState<EnvelopeRow | null>(null);
  const [firm, setFirm] = useState<TthFirmProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState('');
  const [exclusions, setExclusions] = useState(DEFAULT_EXCLUSIONS.join('\n'));
  const [fee, setFee] = useState(engagement.fee ? String(engagement.fee) : '');
  const [signerEmail, setSignerEmail] = useState(client.email ?? '');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: env }, { data: profile }] = await Promise.all([
      supabase
        .from('esign_envelopes')
        .select('id, status, sent_at, completed_at, title')
        .eq('source_type', 'tth_engagement')
        .eq('source_id', engagement.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      tth.from('tth_firm_profile').select('*').limit(1).maybeSingle(),
    ]);
    setEnvelope((env as EnvelopeRow) ?? null);
    setFirm((profile as TthFirmProfile) ?? null);
    setLoading(false);
  }, [engagement.id]);

  useEffect(() => {
    load();
  }, [load]);

  // A completed envelope is the authoritative signal that the letter is signed.
  useEffect(() => {
    if (envelope?.status === 'completed' && !engagement.engagement_letter_signed_at) {
      tth
        .from('tth_engagements')
        .update({ engagement_letter_signed_at: envelope.completed_at ?? new Date().toISOString() })
        .eq('id', engagement.id)
        .then(() => onRefresh());
    }
  }, [envelope, engagement.id, engagement.engagement_letter_signed_at, onRefresh]);

  const buildPdf = () => {
    const scopeItems = scope.trim()
      ? scope.split('\n').map((s) => s.trim()).filter(Boolean)
      : buildScopeFromFilings(filings);
    return generateEngagementLetter({
      client,
      engagement: { ...engagement, fee: fee ? Number(fee) : engagement.fee },
      firm,
      scopeItems,
      exclusions: exclusions.split('\n').map((s) => s.trim()).filter(Boolean),
    });
  };

  const downloadDraft = () => {
    const { pdf } = buildPdf();
    pdf.save(
      `Engagement_Letter_${client.display_name.replace(/[^a-z0-9]+/gi, '_')}_${engagement.tax_year}.pdf`
    );
  };

  const sendForSignature = async () => {
    if (!signerEmail.trim()) {
      toast.error('A signer email is required');
      return;
    }
    setBusy('send');
    try {
      const { pdf, anchors } = buildPdf();
      const blob = pdf.output('blob') as Blob;
      const path = `tth-engagement-letters/${engagement.id}/${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('esign-documents')
        .upload(path, blob, { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: env, error: envError } = await supabase
        .from('esign_envelopes')
        .insert({
          title: `Engagement letter — ${client.display_name} — ${engagement.tax_year}`,
          message:
            'Please review and sign your engagement letter. It sets out the scope, the fee, and the section 7216 consent. Reply here with any questions before signing.',
          status: 'draft',
          signing_order: 'parallel',
          source_type: 'tth_engagement',
          source_id: engagement.id,
          original_pdf_path: path,
          created_by: user?.id ?? null,
        })
        .select('id')
        .single();
      if (envError || !env) throw new Error(envError?.message ?? 'Could not create the envelope');

      const { data: signer, error: signerError } = await supabase
        .from('esign_signers')
        .insert({
          envelope_id: env.id,
          name: client.legal_name ?? client.display_name,
          email: signerEmail.trim(),
          order_index: 0,
        })
        .select('id')
        .single();
      if (signerError || !signer) throw new Error(signerError?.message ?? 'Could not add the signer');

      const fields = anchors.map((f) => ({
        ...f,
        envelope_id: env.id,
        signer_id: signer.id,
        required: true,
      }));
      const { error: fieldsError } = await supabase.from('esign_fields').insert(fields);
      if (fieldsError) throw new Error(fieldsError.message);

      const { error: sendError } = await supabase.functions.invoke('esign-send-invitations', {
        body: { envelopeId: env.id, appUrl: window.location.origin },
      });
      if (sendError) throw new Error(sendError.message);

      await tth.from('tth_activity').insert({
        client_id: client.id,
        engagement_id: engagement.id,
        kind: 'engagement_letter_sent',
        message: `Engagement letter sent to ${signerEmail.trim()} for signature.`,
        meta: { envelope_id: env.id },
        actor: user?.id ?? null,
      });

      toast.success('Engagement letter sent', {
        description: 'It appears in the e-sign dashboard with everything else.',
      });
      setOpen(false);
      await load();
      await onRefresh();
    } catch (e) {
      toast.error('Could not send the letter', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const statusBadge = () => {
    if (engagement.engagement_letter_signed_at) {
      return <Badge variant="success">signed {shortDate(engagement.engagement_letter_signed_at)}</Badge>;
    }
    if (!envelope) return <Badge variant="warning">not sent</Badge>;
    const tone =
      envelope.status === 'completed'
        ? 'success'
        : envelope.status === 'declined' || envelope.status === 'voided'
        ? 'destructive'
        : 'info';
    return <Badge variant={tone as never}>{envelope.status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Engagement letter</h3>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : statusBadge()}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Scope, exclusions, fee, and the section 7216 consent. Signed through the app’s e-sign module —
              no separate system, and the audit trail lands with every other envelope.
            </p>
            {engagement.fee && (
              <p className="mt-1 text-sm">
                Fee on this engagement: <span className="font-medium">{money(Number(engagement.fee))}</span>
              </p>
            )}
            {envelope?.sent_at && !engagement.engagement_letter_signed_at && (
              <p className="mt-1 text-xs text-muted-foreground">Sent {shortDate(envelope.sent_at)}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadDraft}>
              <Download className="mr-2 h-4 w-4" />
              Preview PDF
            </Button>
            <Button size="sm" onClick={() => setOpen(true)} disabled={Boolean(engagement.engagement_letter_signed_at)}>
              <Send className="mr-2 h-4 w-4" />
              {envelope ? 'Send again' : 'Send for signature'}
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send the engagement letter</DialogTitle>
            <DialogDescription>
              Scope defaults to the filing checklist. Anything not listed is out of scope — that is what
              prevents the fee argument in April.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Signer email</Label>
              <Input value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fee</Label>
              <Input
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="Leave blank to say the fee will be confirmed in writing"
              />
            </div>
            <div className="space-y-2">
              <Label>Scope — one item per line</Label>
              <Textarea
                rows={5}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder={buildScopeFromFilings(filings).join('\n') || 'Preparation of the 2026 federal return…'}
              />
              <p className="text-xs text-muted-foreground">
                Blank uses the filing checklist: {filings.length} form{filings.length === 1 ? '' : 's'} on
                record.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Exclusions — one per line</Label>
              <Textarea rows={5} value={exclusions} onChange={(e) => setExclusions(e.target.value)} />
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This is a template. Have counsel review the terms once, then treat that reviewed version as
              the firm’s standard.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={downloadDraft}>
              Preview
            </Button>
            <Button onClick={sendForSignature} disabled={busy === 'send'}>
              {busy === 'send' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send for signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
