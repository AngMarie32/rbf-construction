import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, FileCheck2, Loader2, Paperclip, Search, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DOCUMENTS_BUCKET, safeFileName } from '@/lib/documentFiles';
import { cn } from '@/lib/utils';

export interface ComplianceSub {
  id: string;
  name: string;
  company: string | null;
  w9_on_file: boolean;
  insurance_expiry: string | null;
}

interface Row {
  w9: boolean;
  coi: string; // yyyy-mm-dd or ''
  w9File?: File;
  coiFile?: File;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcontractors: ComplianceSub[];
  /** Start with only these subs checked (e.g. the ones missing paperwork). */
  initialIds?: string[];
  onSaved: () => void;
}

const today = () => format(new Date(), 'yyyy-MM-dd');
const state = (d: string) => {
  if (!d) return 'none';
  const days = Math.round((new Date(`${d}T00:00:00`).getTime() - new Date(today() + 'T00:00:00').getTime()) / 86400000);
  return days < 0 ? 'expired' : days <= 30 ? 'soon' : 'ok';
};

/** Update W-9 status, COI expiry dates and attach the PDFs for many subcontractors at once. */
export function BulkComplianceDialog({ open, onOpenChange, subcontractors, initialIds, onSaved }: Props) {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<'all' | 'missing'>('missing');
  const [applyW9, setApplyW9] = useState<'none' | 'yes' | 'no'>('none');
  const [applyCoi, setApplyCoi] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const r: Record<string, Row> = {};
    subcontractors.forEach((s) => (r[s.id] = { w9: !!s.w9_on_file, coi: (s.insurance_expiry || '').slice(0, 10) }));
    setRows(r);
    setPicked(new Set(initialIds || []));
    setApplyW9('none');
    setApplyCoi('');
    setSearch('');
  }, [open, subcontractors, initialIds]);

  const original = useMemo(() => Object.fromEntries(subcontractors.map((s) => [s.id, s])), [subcontractors]);
  const missing = (s: ComplianceSub) => !s.w9_on_file || !s.insurance_expiry || state(s.insurance_expiry.slice(0, 10)) !== 'ok';
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subcontractors
      .filter((s) => show === 'all' || missing(s) || picked.has(s.id))
      .filter((s) => !q || `${s.company || ''} ${s.name}`.toLowerCase().includes(q))
      .sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcontractors, search, show]);

  const changed = Object.entries(rows).filter(([id, r]) => {
    const o = original[id];
    return o && (r.w9 !== !!o.w9_on_file || r.coi !== (o.insurance_expiry || '').slice(0, 10) || r.w9File || r.coiFile);
  });

  const setRow = (id: string, patch: Partial<Row>) => setRows((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const applyToPicked = () => {
    if (!picked.size) return toast.error('Tick the subcontractors to update first');
    if (applyW9 === 'none' && !applyCoi) return toast.error('Choose a W-9 status or a COI date to apply');
    setRows((p) => {
      const n = { ...p };
      picked.forEach((id) => {
        n[id] = { ...n[id], ...(applyW9 !== 'none' ? { w9: applyW9 === 'yes' } : {}), ...(applyCoi ? { coi: applyCoi } : {}) };
      });
      return n;
    });
    toast.success(`Applied to ${picked.size} subcontractor${picked.size === 1 ? '' : 's'}. Review, then save.`);
  };

  const uploadDoc = async (sub: ComplianceSub, file: File, kind: 'W-9' | 'COI', expiry?: string) => {
    const path = `subcontractors/${sub.id}/${kind.toLowerCase()}-${Date.now()}-${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, { contentType: file.type || undefined });
    if (upErr) throw new Error(/bucket/i.test(upErr.message) ? 'Document storage is not set up yet (run the "project documents storage" update).' : upErr.message);
    const { data: auth } = await supabase.auth.getUser();
    const label = sub.company || sub.name;
    const { error } = await supabase.from('documents').insert({
      name: `${kind} – ${label}${kind === 'COI' && expiry ? ` (exp. ${expiry})` : ''}`,
      description: `${kind === 'W-9' ? 'W-9' : 'Certificate of insurance'} for ${label}`,
      category: kind === 'W-9' ? 'contracts' : 'insurance',
      project_id: null,
      tags: [kind.toLowerCase(), `subcontractor:${sub.id}`],
      file_path: path,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: auth?.user?.id ?? null,
      is_current_version: true,
    } as any);
    if (error) throw error;
  };

  const save = async () => {
    if (!changed.length) return onOpenChange(false);
    setSaving(true);
    let ok = 0;
    const failed: string[] = [];
    for (const [id, r] of changed) {
      const sub = original[id];
      try {
        if (r.w9File) await uploadDoc(sub, r.w9File, 'W-9');
        if (r.coiFile) await uploadDoc(sub, r.coiFile, 'COI', r.coi);
        const patch: Record<string, unknown> = {};
        if (r.w9 !== !!sub.w9_on_file || r.w9File) patch.w9_on_file = r.w9 || !!r.w9File;
        if (r.coi !== (sub.insurance_expiry || '').slice(0, 10)) patch.insurance_expiry = r.coi || null;
        if (Object.keys(patch).length) {
          const { data, error } = await supabase.from('subcontractors').update(patch as any).eq('id', id).select('id');
          if (error) throw error;
          if (!data?.length) throw new Error('not allowed to update');
        }
        ok++;
      } catch (e: any) {
        failed.push(`${sub.company || sub.name}: ${e.message}`);
      }
    }
    setSaving(false);
    if (ok) toast.success(`Updated ${ok} subcontractor${ok === 1 ? '' : 's'}`);
    if (failed.length) toast.error(`Not saved: ${failed.slice(0, 3).join('; ')}${failed.length > 3 ? ` and ${failed.length - 3} more` : ''}`);
    onSaved();
    if (!failed.length) onOpenChange(false);
  };

  const allPicked = list.length > 0 && list.every((s) => picked.has(s.id));

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Update W-9s and insurance (COI)
          </DialogTitle>
          <DialogDescription>Edit each row, or tick several and apply one value to all of them. Attached PDFs are saved to Documents.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-muted/30 p-3">
          <div className="text-sm font-medium">For the {picked.size} ticked:</div>
          <div>
            <Label className="text-xs">W-9</Label>
            <Select value={applyW9} onValueChange={(v) => setApplyW9(v as any)}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Leave as is</SelectItem>
                <SelectItem value="yes">On file</SelectItem>
                <SelectItem value="no">Missing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs" htmlFor="apply-coi">COI expires</Label>
            <Input id="apply-coi" type="date" className="h-9 w-40" value={applyCoi} onChange={(e) => setApplyCoi(e.target.value)} />
          </div>
          <Button size="sm" variant="secondary" onClick={applyToPicked}>Apply to ticked</Button>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 w-48 pl-8" placeholder="Find a subcontractor" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={show} onValueChange={(v) => setShow(v as any)}>
              <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="missing">Missing or expiring</SelectItem>
                <SelectItem value="all">All subcontractors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={allPicked}
                    onCheckedChange={(v) => setPicked((p) => { const n = new Set(p); list.forEach((s) => (v ? n.add(s.id) : n.delete(s.id))); return n; })}
                    aria-label="Tick all shown"
                  />
                </th>
                <th className="px-3 py-2">Subcontractor</th>
                <th className="px-3 py-2">W-9 on file</th>
                <th className="px-3 py-2">W-9 PDF</th>
                <th className="px-3 py-2">COI expires</th>
                <th className="px-3 py-2">COI PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    {show === 'missing' ? 'Every subcontractor has a W-9 and current insurance.' : 'No subcontractors match.'}
                  </td>
                </tr>
              )}
              {list.map((s) => {
                const r = rows[s.id] || { w9: false, coi: '' };
                const st = state(r.coi);
                const dirty = r.w9 !== !!s.w9_on_file || r.coi !== (s.insurance_expiry || '').slice(0, 10) || r.w9File || r.coiFile;
                return (
                  <tr key={s.id} className={cn(dirty && 'bg-primary/5')}>
                    <td className="px-3 py-2">
                      <Checkbox checked={picked.has(s.id)} onCheckedChange={(v) => setPicked((p) => { const n = new Set(p); v ? n.add(s.id) : n.delete(s.id); return n; })} aria-label={`Tick ${s.company || s.name}`} />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{s.company || s.name}</p>
                      {s.company && <p className="text-xs text-muted-foreground">{s.name}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2">
                        <Checkbox checked={r.w9} onCheckedChange={(v) => setRow(s.id, { w9: !!v })} />
                        {r.w9 ? <Badge variant="success">On file</Badge> : <Badge variant="warning">Missing</Badge>}
                      </label>
                    </td>
                    <td className="px-3 py-2">
                      <FilePick file={r.w9File} onPick={(f) => setRow(s.id, { w9File: f, ...(f ? { w9: true } : {}) })} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Input type="date" className="h-8 w-36" value={r.coi} onChange={(e) => setRow(s.id, { coi: e.target.value })} />
                        {st === 'expired' && <Badge variant="destructive">Expired</Badge>}
                        {st === 'soon' && <Badge variant="warning">≤ 30 days</Badge>}
                        {st === 'none' && <Badge variant="outline">None</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <FilePick file={r.coiFile} onPick={(f) => setRow(s.id, { coiFile: f })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-sm text-muted-foreground">{changed.length ? `${changed.length} subcontractor${changed.length === 1 ? '' : 's'} changed` : 'No changes yet'}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving || !changed.length}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilePick({ file, onPick }: { file?: File; onPick: (f?: File) => void }) {
  if (file) {
    return (
      <span className="inline-flex max-w-[160px] items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400">
        <FileCheck2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{file.name}</span>
        <button type="button" aria-label="Remove file" onClick={() => onPick(undefined)}>
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  }
  return (
    <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
      <Paperclip className="h-3.5 w-3.5" /> Attach
      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] || undefined)} />
    </label>
  );
}
