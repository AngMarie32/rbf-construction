import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Send, Trash2, FileText, Search, Eye } from 'lucide-react';

const CATEGORIES = ['Progress', 'Final', 'Retainer', 'Reimbursable', 'Material', 'Service', 'Other'];

interface Project { id: string; name: string }
interface Invoice {
  id: string;
  project_id: string | null;
  invoice_number: string | null;
  category: string | null;
  tags: string[] | null;
  amount: number | null;
  notes: string | null;
  file_path: string;
  file_name: string | null;
  recipient_name: string;
  recipient_email: string;
  cc_emails: string[] | null;
  subject: string | null;
  message: string | null;
  schedule_type: 'one_time' | 'monthly';
  next_send_date: string | null;
  last_sent_at: string | null;
  send_count: number;
  status: string;
  created_at: string;
}

export default function InvoiceSender() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSchedule, setFilterSchedule] = useState<string>('all');
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replaceFor, setReplaceFor] = useState<Invoice | null>(null);

  // form state
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    project_id: '',
    category: '',
    tags: '',
    amount: '',
    invoice_number: '',
    recipient_name: '',
    recipient_email: '',
    cc_emails: '',
    subject: '',
    message: '',
    schedule_type: 'one_time' as 'one_time' | 'monthly',
    next_send_date: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: proj }, { data: inv }] = await Promise.all([
      supabase.from('projects').select('id, name').order('name'),
      supabase.from('bulk_invoices').select('*').order('created_at', { ascending: false }),
    ]);
    setProjects((proj as Project[]) || []);
    setInvoices((inv as Invoice[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const projectName = (id: string | null) => projects.find(p => p.id === id)?.name || '—';

  const filtered = useMemo(() => invoices.filter(i => {
    if (filterProject !== 'all' && i.project_id !== filterProject) return false;
    if (filterCategory !== 'all' && (i.category || '') !== filterCategory) return false;
    if (filterSchedule !== 'all' && i.schedule_type !== filterSchedule) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = `${i.invoice_number || ''} ${i.recipient_name} ${i.recipient_email} ${(i.tags || []).join(' ')} ${i.notes || ''} ${projectName(i.project_id)}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [invoices, filterProject, filterCategory, filterSchedule, search, projects]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  };

  const resetForm = () => {
    setFiles([]);
    setForm({
      project_id: '', category: '', tags: '', amount: '', invoice_number: '',
      recipient_name: '', recipient_email: '', cc_emails: '', subject: '', message: '',
      schedule_type: 'one_time', next_send_date: '', notes: '',
    });
  };

  const handleUpload = async () => {
    if (!files.length) return toast.error('Select at least one file');
    if (!form.recipient_email || !form.recipient_name) return toast.error('Recipient name and email required');
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Not authenticated');
      const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const ccArr = form.cc_emails.split(',').map(t => t.trim()).filter(Boolean);
      const rows: any[] = [];
      for (const file of files) {
        const path = `${u.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('bulk-invoices').upload(path, file);
        if (upErr) throw upErr;
        rows.push({
          created_by: u.user.id,
          project_id: form.project_id || null,
          invoice_number: form.invoice_number || null,
          category: form.category || null,
          tags: tagsArr,
          amount: form.amount ? Number(form.amount) : 0,
          notes: form.notes || null,
          file_path: path,
          file_name: file.name,
          recipient_name: form.recipient_name,
          recipient_email: form.recipient_email,
          cc_emails: ccArr,
          subject: form.subject || null,
          message: form.message || null,
          schedule_type: form.schedule_type,
          next_send_date: form.next_send_date || null,
          status: form.schedule_type === 'monthly' ? 'active' : 'draft',
        });
      }
      const { error } = await supabase.from('bulk_invoices').insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} invoice${rows.length > 1 ? 's' : ''} uploaded`);
      setUploadOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const sendNow = async (ids: string[]) => {
    if (!ids.length) return toast.error('Select invoices to send');
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-invoice', { body: { invoiceIds: ids } });
      if (error) throw error;
      const failed = (data?.results || []).filter((r: any) => !r.ok);
      if (failed.length) toast.error(`${failed.length} failed: ${failed[0].error || ''}`);
      else toast.success(`Sent ${ids.length} invoice${ids.length > 1 ? 's' : ''}`);
      setSelected(new Set());
      load();
    } catch (e: any) {
      toast.error(e.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string, file_path: string) => {
    if (!confirm('Delete this invoice?')) return;
    await supabase.storage.from('bulk-invoices').remove([file_path]);
    await supabase.from('bulk_invoices').delete().eq('id', id);
    toast.success('Deleted');
    load();
  };

  const preview = async (path: string) => {
    const { data, error } = await supabase.storage.from('bulk-invoices').createSignedUrl(path, 3600);
    if (error) return toast.error('Could not load file');
    setPreviewUrl(data.signedUrl);
  };

  const replaceFile = async (file: File) => {
    if (!replaceFor) return;
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const path = `${u.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('bulk-invoices').upload(path, file);
      if (upErr) throw upErr;
      await supabase.storage.from('bulk-invoices').remove([replaceFor.file_path]);
      await supabase.from('bulk_invoices').update({ file_path: path, file_name: file.name }).eq('id', replaceFor.id);
      toast.success('File replaced');
      setReplaceFor(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Replace failed');
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invoice Sender</h1>
            <p className="text-sm text-muted-foreground">Upload invoices, tag to projects, send single or monthly.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              disabled={!selected.size || sending}
              onClick={() => sendNow(Array.from(selected))}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Selected ({selected.size})
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Invoices
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger><SelectValue placeholder="All projects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSchedule} onValueChange={setFilterSchedule}>
                <SelectTrigger><SelectValue placeholder="All schedules" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All schedules</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground py-8">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No invoices yet. Upload one to get started.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Next / Last Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(i => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(i.id)} onCheckedChange={() => toggleSelect(i.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{i.invoice_number || i.file_name || 'Invoice'}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{i.file_name}</div>
                      </TableCell>
                      <TableCell>{projectName(i.project_id)}</TableCell>
                      <TableCell>{i.category || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(i.tags || []).map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{i.recipient_name}</div>
                        <div className="text-xs text-muted-foreground">{i.recipient_email}</div>
                      </TableCell>
                      <TableCell>${Number(i.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={i.schedule_type === 'monthly' ? 'default' : 'outline'}>
                          {i.schedule_type === 'monthly' ? 'Monthly' : 'One-time'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {i.schedule_type === 'monthly' && i.next_send_date && <div>Next: {i.next_send_date}</div>}
                        {i.last_sent_at && <div className="text-muted-foreground">Last: {new Date(i.last_sent_at).toLocaleDateString()}</div>}
                        {!i.last_sent_at && i.schedule_type === 'one_time' && <span className="text-muted-foreground">Not sent</span>}
                        <div className="text-muted-foreground">Sends: {i.send_count}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => preview(i.file_path)}><Eye className="w-4 h-4" /></Button>
                          {i.schedule_type === 'monthly' && (
                            <Button size="sm" variant="ghost" onClick={() => setReplaceFor(i)} title="Replace file for next send">
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="default" disabled={sending} onClick={() => sendNow([i.id])}>
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(i.id, i.file_path)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload Invoices</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Files (PDF or image) — multiple allowed</Label>
              <Input type="file" accept="application/pdf,image/*" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />
              {files.length > 0 && <div className="text-xs text-muted-foreground mt-1">{files.length} file(s) selected</div>}
            </div>
            <Tabs defaultValue="basics">
              <TabsList>
                <TabsTrigger value="basics">Basics</TabsTrigger>
                <TabsTrigger value="recipient">Recipient</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>
              <TabsContent value="basics" className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Project</Label>
                    <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Invoice # {files.length > 1 && <span className="text-xs text-muted-foreground">(applied to all)</span>}</Label>
                    <Input value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input type="number" step="0.001" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Tags (comma separated)</Label>
                  <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="retainer, monthly, urgent" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </TabsContent>
              <TabsContent value="recipient" className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Recipient name *</Label>
                    <Input value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Recipient email *</Label>
                    <Input type="email" value={form.recipient_email} onChange={e => setForm({ ...form, recipient_email: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>CC (comma separated)</Label>
                  <Input value={form.cc_emails} onChange={e => setForm({ ...form, cc_emails: e.target.value })} />
                </div>
                <div>
                  <Label>Subject (optional)</Label>
                  <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Invoice from RBF Construction" />
                </div>
                <div>
                  <Label>Message (optional)</Label>
                  <Textarea rows={3} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                </div>
              </TabsContent>
              <TabsContent value="schedule" className="space-y-3 pt-2">
                <div>
                  <Label>Schedule</Label>
                  <Select value={form.schedule_type} onValueChange={v => setForm({ ...form, schedule_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.schedule_type === 'monthly' && (
                  <div>
                    <Label>Next send date</Label>
                    <Input type="date" value={form.next_send_date} onChange={e => setForm({ ...form, next_send_date: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Each month after sending, the next date advances by 1 month. Replace the file before the next send.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setUploadOpen(false); resetForm(); }}>Cancel</Button>
              <Button disabled={submitting} onClick={handleUpload}>{submitting ? 'Uploading…' : 'Upload'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!previewUrl} onOpenChange={o => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh]">
          <DialogHeader><DialogTitle>Invoice preview</DialogTitle></DialogHeader>
          {previewUrl && <iframe src={previewUrl} className="w-full h-full" />}
        </DialogContent>
      </Dialog>

      {/* Replace file */}
      <Dialog open={!!replaceFor} onOpenChange={o => !o && setReplaceFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Replace file for next monthly send</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Upload this month's invoice. The previous file will be replaced.</p>
            <Input type="file" accept="application/pdf,image/*" onChange={e => { const f = e.target.files?.[0]; if (f) replaceFile(f); }} />
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}