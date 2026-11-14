import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Mail, Paperclip, Send, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ProjectCombobox } from '@/components/ui/project-combobox';
import { DOCUMENTS_BUCKET, bucketFor, safeFileName } from '@/lib/documentFiles';
import { cn } from '@/lib/utils';

export interface BidRecipient {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  specialties?: string[] | null;
}

interface ProjectDoc {
  id: string;
  name: string;
  file_path: string | null;
  source_type: string | null;
  category: string | null;
  file_size: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: BidRecipient[];
  onRemoveRecipient: (id: string) => void;
}

const size = (b?: number | null) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Email bid documents (as secure download links) to the selected subcontractors. */
export function SendBidFilesDialog({ open, onOpenChange, recipients, onRemoveRecipient }: Props) {
  const [projects, setProjects] = useState<{ id: string; name: string; client?: string | null; status?: string | null }[]>([]);
  const [projectId, setProjectId] = useState('');
  const [docs, setDocs] = useState<ProjectDoc[]>([]);
  const [pickedDocs, setPickedDocs] = useState<Set<string>>(new Set());
  const [uploads, setUploads] = useState<File[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('projects')
      .select('id, name, client, status')
      .is('archived_at', null)
      .order('name')
      .then(({ data }) => setProjects((data as any) || []));
  }, [open]);

  useEffect(() => {
    setPickedDocs(new Set());
    if (!projectId) return setDocs([]);
    supabase
      .from('documents')
      .select('id, name, file_path, source_type, category, file_size')
      .eq('project_id', projectId)
      .not('file_path', 'is', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => setDocs(((data as any) || []) as ProjectDoc[]));
  }, [projectId]);

  const project = projects.find((p) => p.id === projectId);
  useEffect(() => {
    if (project) setSubject((s) => s || `Invitation to bid: ${project.name}`);
  }, [project]);

  const noEmail = recipients.filter((r) => !r.email);
  const sendable = recipients.filter((r) => r.email);
  const fileCount = pickedDocs.size + uploads.length;
  const totalUpload = useMemo(() => uploads.reduce((a, f) => a + f.size, 0), [uploads]);

  const send = async () => {
    if (!sendable.length) return toast.error('None of the selected subcontractors has an email address');
    if (!fileCount) return toast.error('Pick or upload at least one bid file');
    setSending(true);
    try {
      const files: { bucket: string; path: string; name: string }[] = [];
      // Save new uploads to the job's documents so they're kept with the project.
      const { data: auth } = await supabase.auth.getUser();
      for (const f of uploads) {
        const path = `${projectId || 'general'}/bid-files/${Date.now()}-${safeFileName(f.name)}`;
        const { error: upErr } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, f, { contentType: f.type || undefined });
        if (upErr) throw new Error(/bucket/i.test(upErr.message) ? 'Document storage is not set up yet (run the "project documents storage" update).' : upErr.message);
        await supabase.from('documents').insert({
          name: f.name,
          description: 'Bid file sent to subcontractors',
          category: 'plans',
          project_id: projectId || null,
          tags: ['bid-files'],
          file_path: path,
          file_size: f.size,
          mime_type: f.type || null,
          uploaded_by: auth?.user?.id ?? null,
          is_current_version: true,
        } as any);
        files.push({ bucket: DOCUMENTS_BUCKET, path, name: f.name });
      }
      docs
        .filter((d) => pickedDocs.has(d.id) && d.file_path)
        .forEach((d) => files.push({ bucket: bucketFor({ sourceType: d.source_type, filePath: d.file_path }), path: d.file_path!, name: d.name }));

      const { data, error } = await supabase.functions.invoke('send-bid-files', {
        body: {
          subject: subject.trim() || undefined,
          message: message.trim() || undefined,
          projectName: project?.name,
          dueDate: dueDate || undefined,
          recipients: sendable.map((r) => ({ name: r.name || r.company, email: r.email })),
          files,
        },
      });
      if (error) {
        const msg = /not found|404|Failed to send a request/i.test(error.message)
          ? 'The "send-bid-files" email function isn\'t deployed yet. Deploy it in Supabase, then try again.'
          : error.message;
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      const failed = (data?.results || []).filter((r: any) => !r.ok);
      const ok = (data?.results || []).length - failed.length;
      if (ok) toast.success(`Bid files sent to ${ok} subcontractor${ok === 1 ? '' : 's'}`);
      if (failed.length) toast.error(`Not sent to ${failed.map((f: any) => f.email).join(', ')}: ${failed[0].error || ''}`);
      if (!failed.length) {
        setUploads([]);
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e.message || 'Sending failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Send bid files
          </DialogTitle>
          <DialogDescription>Each subcontractor gets their own email with download links to the files. Replies come back to you.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <Label>Send to ({sendable.length})</Label>
            <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2">
              {recipients.length === 0 && <p className="p-1 text-sm text-muted-foreground">Tick subcontractors in the list first.</p>}
              {recipients.map((r) => (
                <Badge key={r.id} variant={r.email ? 'secondary' : 'warning'} className="gap-1 pr-1" title={r.email || 'No email on file'}>
                  {r.company || r.name}
                  {!r.email && <span className="text-[10px]">(no email)</span>}
                  <button type="button" aria-label={`Remove ${r.company || r.name}`} onClick={() => onRemoveRecipient(r.id)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {noEmail.length > 0 && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{noEmail.length} without an email will be skipped. Add their email on the subcontractor to include them.</p>}
          </section>

          <section className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <Label htmlFor="bf-project">Job</Label>
              <ProjectCombobox id="bf-project" projects={projects} value={projectId} onChange={setProjectId} placeholder="Type to search jobs" clearable />
            </div>
            <div>
              <Label htmlFor="bf-due">Bids due</Label>
              <Input id="bf-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </section>

          <section>
            <Label>Files</Label>
            {projectId && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border">
                {docs.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No files saved on this job yet. Upload them below.</p>
                ) : (
                  <ul className="divide-y">
                    {docs.map((d) => (
                      <li key={d.id}>
                        <label className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50', pickedDocs.has(d.id) && 'bg-primary/5')}>
                          <Checkbox
                            checked={pickedDocs.has(d.id)}
                            onCheckedChange={(v) => setPickedDocs((p) => { const n = new Set(p); v ? n.add(d.id) : n.delete(d.id); return n; })}
                          />
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{d.name}</span>
                          <span className="text-xs text-muted-foreground">{[d.category, size(d.file_size)].filter(Boolean).join(' · ')}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm text-muted-foreground hover:bg-muted/40">
              <Upload className="h-4 w-4" /> Upload plans, specs or bid forms
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const fs = Array.from(e.target.files || []);
                  setUploads((u) => [...u, ...fs]);
                  e.target.value = '';
                }}
              />
            </label>
            {uploads.length > 0 && (
              <ul className="mt-2 space-y-1">
                {uploads.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1 text-sm">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{size(f.size)}</span>
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setUploads((u) => u.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {uploads.length > 0 && <p className="mt-1 text-xs text-muted-foreground">New uploads ({size(totalUpload)}) are also saved to the job's Documents.</p>}
          </section>

          <section className="space-y-3">
            <div>
              <Label htmlFor="bf-subject">Email subject</Label>
              <Input id="bf-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
            </div>
            <div>
              <Label htmlFor="bf-msg">Message</Label>
              <Textarea id="bf-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Scope, walkthrough details, or anything subs should know" />
            </div>
          </section>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <Mail className="mr-1 inline h-4 w-4" />
            {sendable.length} recipient{sendable.length === 1 ? '' : 's'} · {fileCount} file{fileCount === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
            <Button onClick={send} disabled={sending || !sendable.length || !fileCount}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
