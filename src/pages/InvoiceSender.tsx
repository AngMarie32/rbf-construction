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
import {
  Upload, Send, Trash2, FileText, Search, Eye, Pencil, Archive, ArchiveRestore,
  Folder, FolderPlus, Inbox, Download, ChevronRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Progress', 'Final', 'Retainer', 'Reimbursable', 'Material', 'Service', 'Other'];

interface Project { id: string; name: string }
interface FolderRow { id: string; name: string; color: string | null; parent_id: string | null }
interface SendRow {
  id: string;
  bulk_invoice_id: string;
  sent_at: string;
  status: string;
  delivered_at: string | null;
  opened_at: string | null;
}
interface Invoice {
  id: string;
  project_id: string | null;
  folder_id: string | null;
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
  archived_at: string | null;
  created_at: string;
}

type FolderFilter = 'all' | 'unfiled' | 'archived' | string;

const emptyForm = {
  project_id: '',
  folder_id: '',
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
};

export default function InvoiceSender() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sends, setSends] = useState<SendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editFor, setEditFor] = useState<Invoice | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSchedule, setFilterSchedule] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replaceFor, setReplaceFor] = useState<Invoice | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [foldersCollapsed, setFoldersCollapsed] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: proj }, { data: fold }, { data: inv }, { data: snd }] = await Promise.all([
      supabase.from('projects').select('id, name').order('name'),
      supabase.from('bulk_invoice_folders').select('id, name, color, parent_id').order('name'),
      supabase.from('bulk_invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('bulk_invoice_sends').select('id, bulk_invoice_id, sent_at, status, delivered_at, opened_at').order('sent_at', { ascending: false }),
    ]);
    setProjects((proj as Project[]) || []);
    setFolders((fold as FolderRow[]) || []);
    setInvoices((inv as Invoice[]) || []);
    setSends((snd as SendRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const projectName = (id: string | null) => projects.find(p => p.id === id)?.name || '—';
  const folderName = (id: string | null) => folders.find(f => f.id === id)?.name || 'Unfiled';
  const latestSend = (id: string) => sends.find(s => s.bulk_invoice_id === id) || null;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, unfiled: 0, archived: 0 };
    for (const f of folders) c[f.id] = 0;
    for (const i of invoices) {
      if (i.archived_at) { c.archived++; continue; }
      c.all++;
      if (!i.folder_id) c.unfiled++;
      else c[i.folder_id] = (c[i.folder_id] || 0) + 1;
    }
    return c;
  }, [invoices, folders]);

  const filtered = useMemo(() => invoices.filter(i => {
    if (folderFilter === 'archived') { if (!i.archived_at) return false; }
    else { if (i.archived_at) return false; }
    if (folderFilter === 'unfiled' && i.folder_id) return false;
    if (folderFilter !== 'all' && folderFilter !== 'unfiled' && folderFilter !== 'archived' && i.folder_id !== folderFilter) return false;
    if (filterProject !== 'all' && i.project_id !== filterProject) return false;
    if (filterCategory !== 'all' && (i.category || '') !== filterCategory) return false;
    if (filterSchedule !== 'all' && i.schedule_type !== filterSchedule) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = `${i.invoice_number || ''} ${i.recipient_name} ${i.recipient_email} ${(i.tags || []).join(' ')} ${i.notes || ''} ${projectName(i.project_id)}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [invoices, folderFilter, filterProject, filterCategory, filterSchedule, search, projects]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
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
          folder_id: form.folder_id || null,
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
      setUploadOpen(false); setFiles([]); setForm(emptyForm); load();
    } catch (e: any) { toast.error(e.message || 'Upload failed'); }
    finally { setSubmitting(false); }
  };

  const saveEdit = async () => {
    if (!editFor) return;
    const tagsArr = (typeof editFor.tags === 'string' ? (editFor.tags as any).split(',') : (editFor.tags || []))
      .map((t: string) => t.trim()).filter(Boolean);
    const ccArr = (typeof editFor.cc_emails === 'string' ? (editFor.cc_emails as any).split(',') : (editFor.cc_emails || []))
      .map((t: string) => t.trim()).filter(Boolean);
    const { error } = await supabase.from('bulk_invoices').update({
      project_id: editFor.project_id || null,
      folder_id: editFor.folder_id || null,
      invoice_number: editFor.invoice_number,
      category: editFor.category,
      tags: tagsArr,
      amount: editFor.amount ? Number(editFor.amount) : 0,
      notes: editFor.notes,
      recipient_name: editFor.recipient_name,
      recipient_email: editFor.recipient_email,
      cc_emails: ccArr,
      subject: editFor.subject,
      message: editFor.message,
      schedule_type: editFor.schedule_type,
      next_send_date: editFor.next_send_date,
    }).eq('id', editFor.id);
    if (error) return toast.error(error.message);
    toast.success('Invoice updated');
    setEditFor(null); load();
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
      setSelected(new Set()); load();
    } catch (e: any) { toast.error(e.message || 'Send failed'); }
    finally { setSending(false); }
  };

  const remove = async (id: string, file_path: string) => {
    if (!confirm('Delete this invoice permanently?')) return;
    await supabase.storage.from('bulk-invoices').remove([file_path]);
    await supabase.from('bulk_invoices').delete().eq('id', id);
    toast.success('Deleted'); load();
  };

  const setArchived = async (id: string, archive: boolean) => {
    await supabase.from('bulk_invoices').update({ archived_at: archive ? new Date().toISOString() : null }).eq('id', id);
    toast.success(archive ? 'Archived' : 'Restored'); load();
  };

  const bulkArchive = async (archive: boolean) => {
    if (!selected.size) return;
    const ids = Array.from(selected);
    await supabase.from('bulk_invoices').update({ archived_at: archive ? new Date().toISOString() : null }).in('id', ids);
    toast.success(archive ? `Archived ${ids.length}` : `Restored ${ids.length}`);
    setSelected(new Set()); load();
  };

  const moveToFolder = async (folderId: string | null) => {
    if (!selected.size) return;
    await supabase.from('bulk_invoices').update({ folder_id: folderId }).in('id', Array.from(selected));
    toast.success('Moved'); setSelected(new Set()); load();
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
      toast.success('File replaced'); setReplaceFor(null); load();
    } catch (e: any) { toast.error(e.message || 'Replace failed'); }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from('bulk_invoice_folders').insert({
      name: newFolderName.trim(),
      created_by: u.user.id,
      parent_id: newFolderParent,
    } as any);
    if (error) return toast.error(error.message);
    toast.success('Folder created');
    if (newFolderParent) setExpandedFolders(prev => new Set(prev).add(newFolderParent));
    setNewFolderName(''); setNewFolderParent(null); setNewFolderOpen(false); load();
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Delete this folder and all its sub-folders? Invoices inside will become Unfiled.')) return;
    const descendants = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parent_id && descendants.has(f.parent_id) && !descendants.has(f.id)) {
          descendants.add(f.id); added = true;
        }
      }
    }
    const ids = Array.from(descendants);
    await supabase.from('bulk_invoices').update({ folder_id: null }).in('folder_id', ids);
    await supabase.from('bulk_invoice_folders').delete().eq('id', id);
    toast.success('Folder deleted');
    if (typeof folderFilter === 'string' && ids.includes(folderFilter)) setFolderFilter('all');
    load();
  };

  const renameFolder = async (id: string, current: string) => {
    const name = prompt('Rename folder', current);
    if (!name || name === current) return;
    await supabase.from('bulk_invoice_folders').update({ name }).eq('id', id);
    toast.success('Renamed'); load();
  };

  const downloadFile = async (path: string, name: string | null) => {
    const { data, error } = await supabase.storage.from('bulk-invoices').createSignedUrl(path, 3600, {
      download: (name || true) as any,
    });
    if (error || !data) return toast.error('Could not download');
    const a = document.createElement('a');
    a.href = data.signedUrl; a.download = name || 'invoice'; document.body.appendChild(a); a.click(); a.remove();
  };

  const openNewFolder = (parent: string | null) => {
    setNewFolderParent(parent); setNewFolderName(''); setNewFolderOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedFolders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const folderTotalCount = useMemo(() => {
    const childrenMap = new Map<string | null, FolderRow[]>();
    for (const f of folders) {
      const k = f.parent_id || null;
      if (!childrenMap.has(k)) childrenMap.set(k, []);
      childrenMap.get(k)!.push(f);
    }
    const totals = new Map<string, number>();
    const compute = (id: string): number => {
      if (totals.has(id)) return totals.get(id)!;
      let n = counts[id] || 0;
      for (const c of childrenMap.get(id) || []) n += compute(c.id);
      totals.set(id, n); return n;
    };
    for (const f of folders) compute(f.id);
    return totals;
  }, [folders, counts]);

  const renderFolderTree = (parent: string | null, depth: number): JSX.Element[] => {
    const children = folders.filter(f => (f.parent_id || null) === parent);
    return children.flatMap(f => {
      const hasKids = folders.some(x => x.parent_id === f.id);
      const expanded = expandedFolders.has(f.id);
      const total = folderTotalCount.get(f.id) || 0;
      return [
        <div key={f.id} className={cn('group flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-muted',
          folderFilter === f.id && 'bg-muted font-medium')} style={{ paddingLeft: 8 + depth * 14 }}>
          <button onClick={hasKids ? () => toggleExpand(f.id) : undefined}
            className="w-4 h-4 mr-1 flex items-center justify-center shrink-0">
            {hasKids ? (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : null}
          </button>
          <button onClick={() => setFolderFilter(f.id)} className="flex items-center gap-2 flex-1 text-left truncate">
            <Folder className="w-4 h-4" />{f.name}
          </button>
          <span className="text-xs text-muted-foreground mr-1">{total}</span>
          <div className="hidden group-hover:flex gap-0.5">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openNewFolder(f.id)} title="New sub-folder">
              <FolderPlus className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => renameFolder(f.id, f.name)}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteFolder(f.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>,
        ...(expanded ? renderFolderTree(f.id, depth + 1) : []),
      ];
    });
  };

  const renderStatusBadges = (i: Invoice) => {
    const s = latestSend(i.id);
    if (!s) return <Badge variant="outline">Not sent</Badge>;
    return (
      <div className="flex flex-wrap gap-1">
        {s.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
        {s.status === 'bounced' && <Badge variant="destructive">Bounced</Badge>}
        {s.status === 'sent' && !s.delivered_at && !s.opened_at && <Badge variant="secondary">Sent</Badge>}
        {s.delivered_at && <Badge variant="success">Delivered</Badge>}
        {s.opened_at && <Badge variant="info">Opened</Badge>}
      </div>
    );
  };

  return (
    <Layout title="Invoice Sender" subtitle="Upload invoices, organize in folders, send single or monthly.">
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Folders sidebar */}
        <aside className={cn("border-r shrink-0 transition-all duration-200 flex flex-col", foldersCollapsed ? "w-10" : "w-64")}>
          <div className="flex items-center justify-between p-2 border-b">
            {!foldersCollapsed && <h3 className="text-sm font-semibold">Folders</h3>}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setFoldersCollapsed(!foldersCollapsed)} title={foldersCollapsed ? "Expand" : "Collapse"}>
              {foldersCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            {!foldersCollapsed && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openNewFolder(null)} title="New folder">
                <FolderPlus className="w-4 h-4" />
              </Button>
            )}
          </div>
          {!foldersCollapsed && (
            <div className="p-3 overflow-y-auto flex-1 space-y-1">
              {[
                { id: 'all' as FolderFilter, name: 'All Invoices', icon: Inbox, count: counts.all },
                { id: 'unfiled' as FolderFilter, name: 'Unfiled', icon: Folder, count: counts.unfiled },
              ].map(item => (
                <button key={item.id} onClick={() => setFolderFilter(item.id)}
                  className={cn('w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-muted',
                    folderFilter === item.id && 'bg-muted font-medium')}>
                  <span className="flex items-center gap-2"><item.icon className="w-4 h-4" />{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.count}</span>
                </button>
              ))}
              {renderFolderTree(null, 0)}
              <button onClick={() => setFolderFilter('archived')}
                className={cn('w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-muted mt-2 border-t pt-3',
                  folderFilter === 'archived' && 'bg-muted font-medium')}>
                <span className="flex items-center gap-2"><Archive className="w-4 h-4" />Archived</span>
                <span className="text-xs text-muted-foreground">{counts.archived}</span>
              </button>
            </div>
          )}
        </aside>

        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold">
              {folderFilter === 'all' ? 'All Invoices'
                : folderFilter === 'unfiled' ? 'Unfiled'
                : folderFilter === 'archived' ? 'Archived'
                : folderName(folderFilter)}
            </h2>
            <div className="flex gap-2 flex-wrap">
              {selected.size > 0 && folderFilter !== 'archived' && (
                <>
                  <Select onValueChange={(v) => moveToFolder(v === '__none' ? null : v)}>
                    <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Move to folder" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Unfiled</SelectItem>
                      {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => bulkArchive(true)}><Archive className="w-4 h-4 mr-1" />Archive</Button>
                </>
              )}
              {selected.size > 0 && folderFilter === 'archived' && (
                <Button variant="outline" onClick={() => bulkArchive(false)}><ArchiveRestore className="w-4 h-4 mr-1" />Restore</Button>
              )}
              <Button variant="default" disabled={!selected.size || sending} onClick={() => sendNow(Array.from(selected))}>
                <Send className="w-4 h-4 mr-2" />Send Selected ({selected.size})
              </Button>
              <Button onClick={() => setUploadOpen(true)}><Upload className="w-4 h-4 mr-2" />Upload Invoices</Button>
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
            <CardHeader><CardTitle className="text-base">Invoices ({filtered.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center text-muted-foreground py-8">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No invoices here.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                      </TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Folder</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sent</TableHead>
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
                          {(i.tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(i.tags || []).map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{projectName(i.project_id)}</TableCell>
                        <TableCell className="text-sm">{folderName(i.folder_id)}</TableCell>
                        <TableCell>
                          <div className="text-sm">{i.recipient_name}</div>
                          <div className="text-xs text-muted-foreground">{i.recipient_email}</div>
                        </TableCell>
                        <TableCell>${Number(i.amount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={i.schedule_type === 'monthly' ? 'default' : 'outline'}>
                            {i.schedule_type === 'monthly' ? 'Monthly' : 'One-time'}
                          </Badge>
                          {i.schedule_type === 'monthly' && i.next_send_date && (
                            <div className="text-xs text-muted-foreground mt-1">Next: {i.next_send_date}</div>
                          )}
                        </TableCell>
                        <TableCell>{renderStatusBadges(i)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {i.last_sent_at ? new Date(i.last_sent_at).toLocaleString() : '—'}
                          {i.send_count > 0 && <div>Sends: {i.send_count}</div>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => preview(i.file_path)} title="Preview"><Eye className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => downloadFile(i.file_path, i.file_name)} title="Download"><Download className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setReplaceFor(i)} title="Replace file"><Upload className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditFor({ ...i })} title="Edit"><Pencil className="w-4 h-4" /></Button>
                            {!i.archived_at ? (
                              <>
                                <Button size="sm" variant="default" disabled={sending} onClick={() => sendNow([i.id])} title="Send"><Send className="w-4 h-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => setArchived(i.id, true)} title="Archive"><Archive className="w-4 h-4" /></Button>
                              </>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => setArchived(i.id, false)} title="Restore"><ArchiveRestore className="w-4 h-4" /></Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => remove(i.id, i.file_path)} title="Delete"><Trash2 className="w-4 h-4" /></Button>
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
      </div>

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{newFolderParent ? `New sub-folder in "${folderName(newFolderParent)}"` : 'New folder'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolder()} />
            <div>
              <Label className="text-xs">Parent folder</Label>
              <Select value={newFolderParent || '__root'} onValueChange={v => setNewFolderParent(v === '__root' ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root">— None (top-level) —</SelectItem>
                  {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setNewFolderOpen(false); setNewFolderParent(null); }}>Cancel</Button>
              <Button onClick={createFolder}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    <Label>Folder</Label>
                    <Select value={form.folder_id} onValueChange={v => setForm({ ...form, folder_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Unfiled" /></SelectTrigger>
                      <SelectContent>
                        {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
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
                    <Label>Invoice #</Label>
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
                  </div>
                )}
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setUploadOpen(false); setFiles([]); setForm(emptyForm); }}>Cancel</Button>
              <Button disabled={submitting} onClick={handleUpload}>{submitting ? 'Uploading…' : 'Upload'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editFor} onOpenChange={o => !o && setEditFor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit invoice</DialogTitle></DialogHeader>
          {editFor && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Project</Label>
                  <Select value={editFor.project_id || ''} onValueChange={v => setEditFor({ ...editFor, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Folder</Label>
                  <Select value={editFor.folder_id || ''} onValueChange={v => setEditFor({ ...editFor, folder_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Unfiled" /></SelectTrigger>
                    <SelectContent>
                      {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editFor.category || ''} onValueChange={v => setEditFor({ ...editFor, category: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Invoice #</Label>
                  <Input value={editFor.invoice_number || ''} onChange={e => setEditFor({ ...editFor, invoice_number: e.target.value })} />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" step="0.001" value={editFor.amount ?? 0} onChange={e => setEditFor({ ...editFor, amount: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Schedule</Label>
                  <Select value={editFor.schedule_type} onValueChange={v => setEditFor({ ...editFor, schedule_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editFor.schedule_type === 'monthly' && (
                <div>
                  <Label>Next send date</Label>
                  <Input type="date" value={editFor.next_send_date || ''} onChange={e => setEditFor({ ...editFor, next_send_date: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Tags (comma separated)</Label>
                <Input value={Array.isArray(editFor.tags) ? (editFor.tags || []).join(', ') : (editFor.tags as any) || ''}
                  onChange={e => setEditFor({ ...editFor, tags: e.target.value as any })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Recipient name</Label>
                  <Input value={editFor.recipient_name} onChange={e => setEditFor({ ...editFor, recipient_name: e.target.value })} />
                </div>
                <div>
                  <Label>Recipient email</Label>
                  <Input type="email" value={editFor.recipient_email} onChange={e => setEditFor({ ...editFor, recipient_email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>CC (comma separated)</Label>
                <Input value={Array.isArray(editFor.cc_emails) ? (editFor.cc_emails || []).join(', ') : (editFor.cc_emails as any) || ''}
                  onChange={e => setEditFor({ ...editFor, cc_emails: e.target.value as any })} />
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={editFor.subject || ''} onChange={e => setEditFor({ ...editFor, subject: e.target.value })} />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea rows={3} value={editFor.message || ''} onChange={e => setEditFor({ ...editFor, message: e.target.value })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={2} value={editFor.notes || ''} onChange={e => setEditFor({ ...editFor, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditFor(null)}>Cancel</Button>
                <Button onClick={saveEdit}>Save changes</Button>
              </div>
            </div>
          )}
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
          <DialogHeader><DialogTitle>Replace invoice PDF</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Upload a new PDF or image. The previous file will be replaced.</p>
            <Input type="file" accept="application/pdf,image/*" onChange={e => { const f = e.target.files?.[0]; if (f) replaceFile(f); }} />
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
