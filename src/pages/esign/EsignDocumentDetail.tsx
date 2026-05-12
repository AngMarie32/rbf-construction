import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import { useEnvelope, useGetSignedPdfUrl, useSendEnvelope, useAuditEvents, useSaveEnvelopeAsTemplate, useResendInvitation, useUpdateEnvelopeSettings, useVoidEnvelope, useBulkSendEnvelope, useRecipientGroups, useSaveRecipientGroup } from '@/hooks/useEsign';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Plus, Trash2, ArrowLeft, Copy, Download, Save, RefreshCw, FileEdit, Ban, CalendarClock, BellRing, Users, PenLine, UsersRound, Zap, Workflow } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/esign';
import { FieldEditor } from '@/components/esign/FieldEditor';
import { PdfEditor } from '@/components/esign/PdfEditor';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function EsignDocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useEnvelope(id);
  const { user } = useAuth();
  const { data: groups = [] } = useRecipientGroups();
  const saveGroup = useSaveRecipientGroup();
  const { data: pdfUrl } = useGetSignedPdfUrl(data?.envelope.original_pdf_path);
  const { data: signedPdfUrl } = useGetSignedPdfUrl(data?.envelope.signed_pdf_path);
  const { data: certificateUrl } = useGetSignedPdfUrl(data?.envelope.certificate_path);
  const { data: audit = [] } = useAuditEvents(id);
  const send = useSendEnvelope();
  const resend = useResendInvitation();
  const saveTpl = useSaveEnvelopeAsTemplate();
  const updateSettings = useUpdateEnvelopeSettings();
  const voidEnv = useVoidEnvelope();
  const bulkSend = useBulkSendEnvelope();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [signedBlobUrl, setSignedBlobUrl] = useState<string | null>(null);
  const [editingPdf, setEditingPdf] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidNotify, setVoidNotify] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expiresInput, setExpiresInput] = useState('');
  const [cadenceInput, setCadenceInput] = useState<string>('off');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [groupSaveOpen, setGroupSaveOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [wfMgmt, setWfMgmt] = useState({ name: '', email: '' });
  const [wfSub, setWfSub] = useState({ name: '', email: '' });
  const [wfGc, setWfGc] = useState({ name: '', email: '' });
  const [myPrefs, setMyPrefs] = useState<{ full_name: string | null; signature_data: string | null; signature_type: 'drawn' | 'typed' | null } | null>(null);
  const [signingAsMe, setSigningAsMe] = useState<string | null>(null);

  // Load saved signature for the current user
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prefs } = await supabase
        .from('user_esign_preferences')
        .select('full_name, signature_data, signature_type')
        .eq('user_id', user.id)
        .maybeSingle();
      if (prefs) setMyPrefs(prefs as any);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
  const isActive = ['sent', 'partially_signed'].includes(envelope.status);
  const canVoid = isDraft || isActive;

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

  // Subcontract workflow: Management → Subcontractor → General Contractor (sequential)
  const applySubcontractWorkflow = async () => {
    const roles = [
      { role: 'Management', ...wfMgmt },
      { role: 'Subcontractor', ...wfSub },
      { role: 'General Contractor', ...wfGc },
    ];
    for (const r of roles) {
      if (!r.name.trim() || !r.email.trim()) {
        return toast.error(`${r.role}: name and email required`);
      }
    }
    // Force sequential signing order on the envelope
    const { error: updErr } = await supabase
      .from('esign_envelopes')
      .update({ signing_order: 'sequential' })
      .eq('id', envelope.id);
    if (updErr) return toast.error(updErr.message);
    // Replace any existing draft signers with the 3 ordered roles
    await supabase.from('esign_signers').delete().eq('envelope_id', envelope.id);
    const rows = roles.map((r, i) => ({
      envelope_id: envelope.id,
      name: `${r.name} (${r.role})`,
      email: r.email.trim().toLowerCase(),
      order_index: i,
    }));
    const { error } = await supabase.from('esign_signers').insert(rows);
    if (error) return toast.error(error.message);
    toast.success('Subcontract workflow applied — Management signs first, then Subcontractor, then GC');
    setWorkflowOpen(false);
    setWfMgmt({ name: '', email: '' });
    setWfSub({ name: '', email: '' });
    setWfGc({ name: '', email: '' });
    qc.invalidateQueries({ queryKey: ['esign-envelope', id] });
  };

  // One-click "Sign as me now" using the user's saved signature.
  const signAsMeNow = async (signer: any) => {
    if (!myPrefs?.signature_data) {
      toast.error('Save a signature first under My Signature');
      return;
    }
    // Refuse if there are required text/checkbox fields owned by this signer.
    const blockers = (fields || []).filter(
      (f: any) =>
        f.signer_id === signer.id &&
        f.required &&
        (f.field_type === 'text' || f.field_type === 'checkbox') &&
        !f.value,
    );
    if (blockers.length > 0) {
      toast.message('This document needs other fields filled — opening full signing view.');
      window.open(`/sign/${signer.access_token}`, '_blank');
      return;
    }
    setSigningAsMe(signer.id);
    try {
      const r = await fetch(
        `https://gdrurkccaglzcicpivyy.supabase.co/functions/v1/esign-submit-signature`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            token: signer.access_token,
            fieldValues: {},
            signatureData: myPrefs.signature_data,
            signatureType: myPrefs.signature_type || 'drawn',
          }),
        },
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to sign');
      }
      toast.success('Signed with your saved signature');
      qc.invalidateQueries({ queryKey: ['esign-envelope', id] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to sign');
    } finally {
      setSigningAsMe(null);
    }
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

  const handleSaveEditedPdf = async (file: File): Promise<void> => {
    if (!envelope.original_pdf_path) { toast.error('No PDF path'); return; }
    const { error: upErr } = await supabase.storage
      .from('esign-documents')
      .upload(envelope.original_pdf_path, file, { upsert: true, contentType: 'application/pdf' });
    if (upErr) { toast.error(upErr.message); return; }
    // Edits may have changed page count/order, so clear existing field placements.
    if (fields.length > 0) {
      await supabase.from('esign_fields').delete().eq('envelope_id', envelope.id);
    }
    // Force PDF + fields refresh
    qc.invalidateQueries({ queryKey: ['esign-envelope', id] });
    qc.invalidateQueries({ queryKey: ['esign-pdf-url'] });
    toast.success('PDF updated');
    setEditingPdf(false);
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`https://portal.rbfconstruction.com/sign/${token}`);
    toast.success('Link copied');
  };

  const applyGroup = async (groupId: string) => {
    const g = groups.find(x => x.id === groupId);
    if (!g || !g.members?.length) return toast.error('Group has no members');
    const existing = new Set(signers.map(s => s.email.toLowerCase()));
    const toAdd = g.members.filter(m => m.email && !existing.has(m.email.toLowerCase()));
    if (toAdd.length === 0) return toast.info('All members are already added');
    const rows = toAdd.map((m, i) => ({
      envelope_id: envelope.id,
      name: m.name,
      email: m.email,
      order_index: signers.length + i,
    }));
    const { error } = await supabase.from('esign_signers').insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Added ${rows.length} signer${rows.length === 1 ? '' : 's'}`);
    qc.invalidateQueries({ queryKey: ['esign-envelope', id] });
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
            {fields.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  const name = prompt('Template name:', envelope.title);
                  if (!name) return;
                  saveTpl.mutate({
                    envelopeId: envelope.id,
                    name,
                    description: envelope.message || undefined,
                    document_type: (envelope as any).document_type || undefined,
                  });
                }}
                disabled={saveTpl.isPending}
              >
                <Save className="h-4 w-4 mr-2" /> Save as Template
              </Button>
            )}
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
              <Button
                variant="outline"
                onClick={() => setEditingPdf(v => !v)}
              >
                <FileEdit className="h-4 w-4 mr-2" /> {editingPdf ? 'Close Editor' : 'Edit PDF'}
              </Button>
            )}
            {isDraft && (
              <Button onClick={handleSend} disabled={send.isPending}>
                <Send className="h-4 w-4 mr-2" /> {send.isPending ? 'Sending…' : 'Send for Signature'}
              </Button>
            )}
            {!isDraft && envelope.status !== 'completed' && envelope.status !== 'declined' && envelope.status !== 'voided' && (
              <Button
                variant="outline"
                onClick={() => resend.mutate({ envelopeId: envelope.id })}
                disabled={resend.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> {resend.isPending ? 'Resending…' : 'Resend All'}
              </Button>
            )}
            {(isDraft || isActive) && (
              <Button
                variant="outline"
                onClick={() => {
                  setExpiresInput(envelope.expires_at ? envelope.expires_at.slice(0, 10) : '');
                  setCadenceInput(envelope.reminder_cadence_days ? String(envelope.reminder_cadence_days) : 'off');
                  setSettingsOpen(true);
                }}
              >
                <CalendarClock className="h-4 w-4 mr-2" /> Expiration & Reminders
              </Button>
            )}
            {!isDraft && envelope.original_pdf_path && (
              <Button
                variant="outline"
                onClick={() => { setBulkText(''); setBulkOpen(true); }}
              >
                <Users className="h-4 w-4 mr-2" /> Bulk Send
              </Button>
            )}
            {canVoid && (
              <Button
                variant="outline"
                onClick={() => { setVoidReason(''); setVoidNotify(true); setVoidOpen(true); }}
                className="text-destructive hover:text-destructive"
              >
                <Ban className="h-4 w-4 mr-2" /> Cancel
              </Button>
            )}
          </div>
        </div>

        {(envelope.expires_at || envelope.reminder_cadence_days || envelope.status === 'voided') && (
          <Card className="p-3 text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
            {envelope.expires_at && (
              <span><CalendarClock className="h-3 w-3 inline mr-1" /> Expires {format(new Date(envelope.expires_at), 'MMM d, yyyy')}</span>
            )}
            {envelope.reminder_cadence_days ? (
              <span><BellRing className="h-3 w-3 inline mr-1" /> Reminders every {envelope.reminder_cadence_days} day{envelope.reminder_cadence_days === 1 ? '' : 's'}{(envelope as any).reminder_count ? ` • ${(envelope as any).reminder_count} sent` : ''}</span>
            ) : null}
            {envelope.status === 'voided' && (
              <span className="text-destructive">Cancelled{(envelope as any).void_reason ? `: ${(envelope as any).void_reason}` : ''}</span>
            )}
          </Card>
        )}

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
                          <>
                            {s.status !== 'signed' && (
                              <>
                                {myPrefs?.signature_data && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-primary"
                                    onClick={() => signAsMeNow(s)}
                                    disabled={signingAsMe === s.id}
                                    title="Sign in-app with saved signature"
                                  >
                                    <Zap className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-primary"
                                  onClick={() => window.open(`/sign/${s.access_token}`, '_blank')}
                                  title="Sign in app"
                                >
                                  <PenLine className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyLink(s.access_token)} title="Copy link">
                              <Copy className="h-3 w-3" />
                            </Button>
                            {s.status !== 'signed' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => resend.mutate({ envelopeId: envelope.id, signerId: s.id })}
                                disabled={resend.isPending}
                                title="Resend invitation"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            )}
                          </>
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
                  {groups.length > 0 && (
                    <Select onValueChange={(v) => applyGroup(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Apply a group…" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} ({g.members.length})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button size="sm" variant="outline" className="w-full" onClick={addSigner}>
                    <Plus className="h-3 w-3 mr-1" /> Add Signer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setWorkflowOpen(true)}
                    title="Management → Subcontractor → General Contractor (sequential)"
                  >
                    <Workflow className="h-3 w-3 mr-1" /> Subcontract Workflow (3-party)
                  </Button>
                  {signers.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-xs"
                      onClick={() => { setGroupName(envelope.title); setGroupDesc(''); setGroupSaveOpen(true); }}
                    >
                      <UsersRound className="h-3 w-3 mr-1" /> Save signers as group
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => navigate('/esign/recipient-groups')}
                  >
                    Manage groups
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
            ) : isDraft && editingPdf ? (
              <PdfEditor
                pdfUrl={pdfUrl}
                hasFields={fields.length > 0}
                onCancel={() => setEditingPdf(false)}
                onSave={handleSaveEditedPdf}
              />
            ) : isDraft ? (
              <FieldEditor
                pdfUrl={pdfUrl}
                fields={fields}
                signers={signers}
                onAddField={addField}
                onDeleteField={deleteField}
                onUpdateField={updateField}
                envelopeMeta={{
                  projectId: envelope.project_id,
                  paymentAppNumber: (envelope as any).payment_app_number,
                  documentType: (envelope as any).document_type,
                }}
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

      {/* Cancel envelope dialog */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this document?</DialogTitle>
            <DialogDescription>
              The envelope will be marked as voided and signers can no longer sign it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g., Replaced by an updated version"
              />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <p className="text-sm font-medium">Notify pending signers by email</p>
                <p className="text-xs text-muted-foreground">Lets them know the document was cancelled.</p>
              </div>
              <Switch checked={voidNotify} onCheckedChange={setVoidNotify} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)}>Keep document</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await voidEnv.mutateAsync({ envelopeId: envelope.id, reason: voidReason, notify: voidNotify });
                setVoidOpen(false);
              }}
              disabled={voidEnv.isPending}
            >
              {voidEnv.isPending ? 'Cancelling…' : 'Cancel document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expiration & reminders dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expiration & Reminders</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Expires on</Label>
              <Input
                type="date"
                value={expiresInput}
                onChange={(e) => setExpiresInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank to never expire.</p>
            </div>
            <div>
              <Label>Reminder cadence</Label>
              <Select value={cadenceInput} onValueChange={setCadenceInput}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="1">Every day</SelectItem>
                  <SelectItem value="2">Every 2 days</SelectItem>
                  <SelectItem value="3">Every 3 days</SelectItem>
                  <SelectItem value="7">Weekly</SelectItem>
                  <SelectItem value="14">Every 2 weeks</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Auto-emails any signer who hasn't signed yet.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                await updateSettings.mutateAsync({
                  id: envelope.id,
                  expires_at: expiresInput ? new Date(expiresInput + 'T23:59:59').toISOString() : null,
                  reminder_cadence_days: cadenceInput === 'off' ? null : Number(cadenceInput),
                });
                setSettingsOpen(false);
              }}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk send dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk send to multiple recipients</DialogTitle>
            <DialogDescription>
              Creates a separate envelope for each recipient using this document and its field placements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Recipients</Label>
              <Textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'One per line: Name, email@domain.com, Company (optional)\nJohn Smith, john@acme.com, Acme Subs\nJane Doe, jane@buildco.com'}
              />
              <p className="text-xs text-muted-foreground mt-1">Format: Name, Email, Company (company optional).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
                const recipients = lines.map(l => {
                  const [name, email, company] = l.split(',').map(s => s?.trim() || '');
                  return { name, email, company: company || undefined };
                }).filter(r => r.name && r.email && /\S+@\S+\.\S+/.test(r.email));
                if (recipients.length === 0) {
                  toast.error('Add at least one valid recipient (Name, email)');
                  return;
                }
                await bulkSend.mutateAsync({ sourceEnvelopeId: envelope.id, recipients });
                setBulkOpen(false);
              }}
              disabled={bulkSend.isPending}
            >
              {bulkSend.isPending ? 'Sending…' : 'Send to all'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save signers as group */}
      <Dialog open={groupSaveOpen} onOpenChange={setGroupSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save signers as group</DialogTitle>
            <DialogDescription>
              Reuse this set of recipients on future envelopes with one click.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Group name</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g., PM + Owner + Architect" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">{signers.length} signer{signers.length === 1 ? '' : 's'} will be saved.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupSaveOpen(false)}>Cancel</Button>
            <Button
              disabled={saveGroup.isPending || !groupName.trim()}
              onClick={async () => {
                await saveGroup.mutateAsync({
                  name: groupName,
                  description: groupDesc,
                  members: signers.map(s => ({ name: s.name, email: s.email })),
                });
                setGroupSaveOpen(false);
              }}
            >
              {saveGroup.isPending ? 'Saving…' : 'Save group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcontract Workflow (3-party sequential) */}
      <Dialog open={workflowOpen} onOpenChange={setWorkflowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subcontract Workflow</DialogTitle>
            <DialogDescription>
              Sequential signing in this order: Management Company → Subcontractor → General Contractor.
              Each party is only notified after the previous one signs. This will replace any existing signers on this draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {[
              { label: '1. Management Company (signs first)', state: wfMgmt, set: setWfMgmt },
              { label: '2. Subcontractor (signs second)', state: wfSub, set: setWfSub },
              { label: '3. General Contractor (final sign-off)', state: wfGc, set: setWfGc },
            ].map((row) => (
              <div key={row.label} className="space-y-2 border rounded-lg p-3">
                <p className="text-sm font-medium">{row.label}</p>
                <Input
                  placeholder="Full name"
                  value={row.state.name}
                  onChange={(e) => row.set({ ...row.state, name: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={row.state.email}
                  onChange={(e) => row.set({ ...row.state, email: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkflowOpen(false)}>Cancel</Button>
            <Button onClick={applySubcontractWorkflow}>Apply Workflow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}