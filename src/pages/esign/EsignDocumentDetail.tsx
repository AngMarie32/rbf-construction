import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import { useEnvelope, useGetSignedPdfUrl, useSendEnvelope, useAuditEvents } from '@/hooks/useEsign';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Plus, Trash2, ArrowLeft, Copy, Download } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/esign';
import { FieldEditor } from '@/components/esign/FieldEditor';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function EsignDocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useEnvelope(id);
  const { data: pdfUrl } = useGetSignedPdfUrl(data?.envelope.original_pdf_path);
  const { data: signedPdfUrl } = useGetSignedPdfUrl(data?.envelope.signed_pdf_path);
  const { data: certificateUrl } = useGetSignedPdfUrl(data?.envelope.certificate_path);
  const { data: audit = [] } = useAuditEvents(id);
  const send = useSendEnvelope();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [signedBlobUrl, setSignedBlobUrl] = useState<string | null>(null);

  // Fetch the signed PDF as a blob so the browser will reliably preview it
  // in an <iframe> (signed Storage URLs sometimes set headers that browsers
  // block when embedded).
  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      if (!signedPdfUrl) { setSignedBlobUrl(null); return; }
      try {
        const res = await fetch(signedPdfUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        revoke = url;
        setSignedBlobUrl(url);
      } catch {
        setSignedBlobUrl(signedPdfUrl);
      }
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [signedPdfUrl]);

  // Realtime updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`esign-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'esign_signers', filter: `envelope_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ['esign-envelope', id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'esign_envelopes', filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ['esign-envelope', id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  if (isLoading || !data) return <Layout title="Document"><div>Loading…</div></Layout>;

  const { envelope, signers, fields } = data;
  const isDraft = envelope.status === 'draft';

  const addSigner = async () => {
    if (!name || !email) return toast.error('Name and email required');
    const { error } = await supabase.from('esign_signers').insert({
      envelope_id: envelope.id, name, email, order_index: signers.length,
    });
    if (error) return toast.error(error.message);
    setName(''); setEmail('');
    qc.invalidateQueries({ queryKey: ['esign-envelope', id] });
  };

  const removeSigner = async (sid: string) => {
    await supabase.from('esign_signers').delete().eq('id', sid);
    qc.invalidateQueries({ queryKey: ['esign-envelope', id] });
  };

  const addField = async (f: any) => {
    const { error } = await supabase.from('esign_fields').insert({ ...f, envelope_id: envelope.id });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['esign-envelope', id] });
  };

  const deleteField = async (fid: string) => {
    await supabase.from('esign_fields').delete().eq('id', fid);
    qc.invalidateQueries({ queryKey: ['esign-envelope', id] });
  };

  const updateField = async (fid: string, updates: any) => {
    await supabase.from('esign_fields').update(updates).eq('id', fid);
    qc.invalidateQueries({ queryKey: ['esign-envelope', id] });
  };

  const handleSend = async () => {
    if (signers.length === 0) return toast.error('Add at least one signer');
    if (fields.length === 0) return toast.error('Add at least one field');
    await send.mutateAsync(envelope.id);
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/sign/${token}`);
    toast.success('Link copied');
  };

  return (
    <Layout title={envelope.title} subtitle="Document details">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" onClick={() => navigate('/esign/documents')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Badge className={STATUS_COLORS[envelope.status]} variant="outline">{STATUS_LABELS[envelope.status]}</Badge>
            {envelope.status === 'completed' && signedPdfUrl && (
              <>
                <Button asChild variant="outline">
                  <a href={signedPdfUrl} target="_blank" rel="noreferrer" download>
                    <Download className="h-4 w-4 mr-2" /> Download Signed PDF
                  </a>
                </Button>
                {certificateUrl && (
                  <Button asChild variant="outline">
                    <a href={certificateUrl} target="_blank" rel="noreferrer" download>
                      <Download className="h-4 w-4 mr-2" /> Certificate
                    </a>
                  </Button>
                )}
              </>
            )}
            {isDraft && (
              <Button onClick={handleSend} disabled={send.isPending}>
                <Send className="h-4 w-4 mr-2" /> {send.isPending ? 'Sending…' : 'Send for Signature'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* Signers + audit */}
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Signers</h3>
              <div className="space-y-2">
                {signers.map((s, idx) => (
                  <div key={s.id} className="border rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{idx + 1}. {s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                        <Badge variant="outline" className="mt-1 text-[10px]">{s.status}</Badge>
                      </div>
                      <div className="flex flex-col gap-1">
                        {!isDraft && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyLink(s.access_token)} title="Copy link">
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                        {isDraft && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeSigner(s.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {isDraft && (
                <div className="space-y-2 pt-2 border-t">
                  <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button size="sm" variant="outline" className="w-full" onClick={addSigner}>
                    <Plus className="h-3 w-3 mr-1" /> Add Signer
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Audit Trail</h3>
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {audit.length === 0 && <p className="text-xs text-muted-foreground">No events yet.</p>}
                {audit.map((e: any) => (
                  <div key={e.id} className="text-xs border-l-2 border-primary/30 pl-2">
                    <p className="font-medium capitalize">{e.event_type.replace(/_/g, ' ')}</p>
                    <p className="text-muted-foreground">{e.actor_name || 'System'} • {format(new Date(e.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* PDF + fields */}
          <Card className="p-4">
            {!pdfUrl ? (
              <div className="text-center py-12 text-muted-foreground">Loading PDF…</div>
            ) : isDraft ? (
              <FieldEditor
                pdfUrl={pdfUrl}
                fields={fields}
                signers={signers}
                onAddField={addField}
                onDeleteField={deleteField}
                onUpdateField={updateField}
              />
            ) : (
              <div className="text-center py-12">
                {envelope.status === 'completed' && (signedBlobUrl || signedPdfUrl) ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">Document fully signed.</p>
                    <object data={signedBlobUrl || signedPdfUrl!} type="application/pdf" className="w-full h-[700px] border rounded">
                      <iframe src={signedBlobUrl || signedPdfUrl!} className="w-full h-[700px] border rounded" title="Signed PDF" />
                    </object>
                    <div className="flex gap-2 justify-center">
                      <Button asChild>
                        <a href={signedPdfUrl!} target="_blank" rel="noreferrer" download>
                          <Download className="h-4 w-4 mr-2" /> Download Signed PDF
                        </a>
                      </Button>
                      {certificateUrl && (
                        <Button asChild variant="outline">
                          <a href={certificateUrl} target="_blank" rel="noreferrer" download>
                            <Download className="h-4 w-4 mr-2" /> Certificate of Completion
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground mb-3">Document sent — view via signer links above.</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}