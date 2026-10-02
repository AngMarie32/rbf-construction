import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, FileText, X, Trash2, Search, CloudUpload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { currency, rollup, EstimateLine } from '@/utils/estimateMath';
import { toast } from 'sonner';

interface EstimateRow {
  id: string;
  name: string;
  location: string | null;
  area_sf: number;
  status: string;
  created_at: string;
  contingency_pct: number;
  overhead_pct: number;
  profit_pct: number;
  bond_pct: number;
}

const FILE_LIMIT = 12 * 1024 * 1024; // edge function per-file cap
const PART_LIMIT = 10 * 1024 * 1024; // files are grouped into ~10 MB analysis parts

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function Estimating() {
  const navigate = useNavigate();
  const { selectedIds } = useCompanies();
  const companyId = selectedIds.length === 1 ? selectedIds[0] : null;
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<EstimateRow[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [areaSf, setAreaSf] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    let q = supabase.from('estimates').select('*').order('created_at', { ascending: false }).limit(50);
    if (companyId) q = q.eq('company_id', companyId);
    const { data } = await q;
    const list = (data || []) as EstimateRow[];
    setRows(list);

    if (list.length) {
      const { data: lines } = await supabase
        .from('estimate_lines')
        .select('*')
        .in('estimate_id', list.map((r) => r.id));
      const byEstimate: Record<string, number> = {};
      for (const est of list) {
        const own = ((lines || []) as unknown as EstimateLine[]).filter((l: any) => l.estimate_id === est.id);
        byEstimate[est.id] = rollup(
          own,
          {
            contingency_pct: est.contingency_pct,
            overhead_pct: est.overhead_pct,
            profit_pct: est.profit_pct,
            bond_pct: est.bond_pct,
          },
          est.area_sf
        ).recommendedBid;
      }
      setTotals(byEstimate);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const tooBig = incoming.filter((f) => f.size > FILE_LIMIT);
    const ok = incoming.filter((f) => f.size <= FILE_LIMIT);
    if (tooBig.length) {
      toast.error(
        `${tooBig.map((f) => f.name).join(', ')} ${tooBig.length === 1 ? 'is' : 'are'} over the 12 MB per-file limit. Split or compress ${tooBig.length === 1 ? 'it' : 'them'} first.`
      );
    }
    if (ok.length) setFiles((prev) => [...prev, ...ok]);
  };

  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  const partCount = useMemo(() => {
    if (!files.length) return 0;
    let parts = 1;
    let cur = 0;
    for (const f of files) {
      if (cur && cur + f.size > PART_LIMIT) {
        parts += 1;
        cur = 0;
      }
      cur += f.size;
    }
    return parts;
  }, [files]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.name, r.location].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, search]);

  const run = async () => {
    if (!files.length) return toast.error('Add at least one plan file first.');
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      setStage('Uploading plans…');
      const uploaded = await Promise.all(
        files.map(async (f) => {
          const ext = f.name.split('.').pop() || 'pdf';
          const path = `estimates/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from('plan_documents').upload(path, f, { contentType: f.type });
          if (error) throw error;
          const { data: pub } = supabase.storage.from('plan_documents').getPublicUrl(path);
          return { url: pub.publicUrl, name: f.name, fileType: f.type };
        })
      );

      // Split the plan set into parts that each fit comfortably in one analysis pass
      const parts: { file: File; up: typeof uploaded[number] }[][] = [];
      let cur: { file: File; up: typeof uploaded[number] }[] = [];
      let curBytes = 0;
      files.forEach((f, i) => {
        if (cur.length && curBytes + f.size > PART_LIMIT) { parts.push(cur); cur = []; curBytes = 0; }
        cur.push({ file: f, up: uploaded[i] });
        curBytes += f.size;
      });
      if (cur.length) parts.push(cur);

      const { data: session } = await supabase.auth.getSession();
      const runPart = async (part: typeof parts[number], idx: number) => {
        const label = parts.length > 1 ? `Part ${idx + 1} of ${parts.length}: ` : '';
        setStage(`${label}Reading the drawings and building the baseline… this can take a few minutes.`);
        const partNote = parts.length > 1
          ? `\n\nThis is part ${idx + 1} of ${parts.length} of the plan set (files in this part: ${part.map((p) => p.file.name).join(', ')}; other parts: ${parts.filter((_, j) => j !== idx).flat().map((p) => p.file.name).join(', ')}). Estimate the scope shown in these sheets. Do not duplicate scope that is clearly documented in the other parts; project-wide items (general conditions, contingency settings) belong only to part 1.`
          : '';
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-estimate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
            Authorization: `Bearer ${session?.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            files: part.map((p) => p.up),
            projectName: name,
            location,
            areaSf: Number(areaSf) || 0,
            notes: (notes || '') + partNote,
          }),
        });
        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => '');
          throw new Error(detail || `The estimating service returned ${res.status}.`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let out: any = null;
        let failure: string | null = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const frames = buf.split('\n\n');
          buf = frames.pop() ?? '';
          for (const frame of frames) {
            const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            let payload: any;
            try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
            if (frame.includes('event: result')) out = payload;
            else if (frame.includes('event: error')) failure = payload?.error || 'Estimate generation failed.';
            else if (payload?.message) setStage(`${label}${payload.message}…`);
          }
        }
        if (failure) throw new Error(parts.length > 1 ? `${label}${failure}` : failure);
        if (!out) throw new Error(`${label}The estimate did not finish. Try again with smaller files.`);
        return out;
      };

      const results: any[] = [];
      for (let i = 0; i < parts.length; i++) results.push(await runPart(parts[i], i));

      // Merge parts: same cost line in the same group is kept once (larger amount wins, never summed)
      const merged = new Map<string, any>();
      results.flatMap((r) => r.lines || []).forEach((l: any) => {
        const key = `${l.group_key}|${String(l.name).trim().toLowerCase()}`;
        const prev = merged.get(key);
        if (!prev || Number(l.baseline_amount) > Number(prev.baseline_amount)) merged.set(key, l);
      });
      const result = {
        project: results[0].project,
        settings: results[0].settings,
        scope_summary: results.map((r) => r.scope_summary).filter(Boolean).join('\n\n'),
        assumptions: Array.from(new Set(results.flatMap((r) => r.assumptions || []))),
        flags: results.flatMap((r) => r.flags || []),
        lines: Array.from(merged.values()).map((l, i) => ({ ...l, sort_order: i })),
      };

      setStage('Saving the estimate…');
      const { data: est, error: estErr } = await supabase
        .from('estimates')
        .insert({
          company_id: companyId,
          name: name || result.project?.name || 'Untitled estimate',
          location: location || result.project?.location || null,
          area_sf: Number(areaSf) || result.project?.area_sf || 0,
          scope_summary: result.scope_summary || null,
          assumptions: result.assumptions || [],
          source_files: uploaded,
          notes: notes || null,
          contingency_pct: result.settings?.contingency_pct ?? 5,
          overhead_pct: result.settings?.overhead_pct ?? 4,
          profit_pct: result.settings?.profit_pct ?? 6,
          bond_pct: result.settings?.bond_pct ?? 1,
          created_by: userId ?? null,
        })
        .select('id')
        .single();
      if (estErr) throw estErr;

      const { data: insertedLines, error: lineErr } = await supabase
        .from('estimate_lines')
        .insert(
          result.lines.map((l: any) => ({
            estimate_id: est.id,
            group_key: l.group_key,
            group_name: l.group_name,
            section_name: l.section_name,
            name: l.name,
            baseline_amount: l.baseline_amount,
            quantity: l.quantity,
            unit: l.unit,
            unit_cost: l.unit_cost,
            confidence: l.confidence,
            status: l.status,
            basis: l.basis,
            source: l.source,
            sort_order: l.sort_order,
          }))
        )
        .select('id, sort_order');
      if (lineErr) throw lineErr;

      const idBySort = new Map((insertedLines || []).map((l: any) => [l.sort_order, l.id]));
      const subs = result.lines.flatMap((l: any) =>
        (l.subcosts || []).map((s: any) => ({
          line_id: idBySort.get(l.sort_order),
          name: s.name,
          amount: s.amount,
          kind: s.kind,
          note: s.note,
          sort_order: s.sort_order,
        }))
      ).filter((s: any) => s.line_id);
      if (subs.length) await supabase.from('estimate_subcosts').insert(subs);

      if (result.flags?.length)
        await supabase.from('estimate_flags').insert(
          result.flags.map((f: any) => ({ estimate_id: est.id, ...f }))
        );

      toast.success('Estimate built from the plans.');
      navigate(`/estimating/${est.id}`);
    } catch (e: any) {
      toast.error(e.message || 'The estimate could not be generated.');
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  const remove = async (id: string) => {
    await supabase.from('estimates').delete().eq('id', id);
    load();
  };

  return (
    <Layout title="Bid Estimator">
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Start from the plans</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload the permit or construction set (PDF or images), plus any specifications and schedules. The estimate is
            built as an independent should-cost baseline before any subcontractor bid is considered.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>Project name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Read from the drawings if blank" />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
            </div>
            <div>
              <Label>Building area (SF)</Label>
              <Input value={areaSf} onChange={(e) => setAreaSf(e.target.value)} type="number" placeholder="0" />
            </div>
          </div>

          <div className="mt-4">
            <Label>Estimator notes / context</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Known scope, owner-supplied items, schedule constraints, what the set is missing…"
            />
          </div>

          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`mt-4 flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            } ${busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <CloudUpload className="h-8 w-8 text-muted-foreground" />
            <span className="mt-2 text-sm font-medium">
              {dragging ? 'Drop the plan files here' : 'Drag plan files here, or click to browse'}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              PDF or images · up to 12 MB per file · large sets are analyzed in parts automatically
            </span>
          </button>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <Badge key={i} variant="secondary" className="gap-2">
                    <FileText className="h-3 w-3" />
                    {f.name}
                    <span className="text-muted-foreground">{fmtSize(f.size)}</span>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))} disabled={busy}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {files.length} file{files.length === 1 ? '' : 's'} · {fmtSize(totalBytes)} total
                {partCount > 1 ? ` · will be analyzed in ${partCount} parts and merged` : ''}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={run} disabled={busy || !files.length}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Build estimate
            </Button>
            {stage && <span className="text-sm text-muted-foreground">{stage}</span>}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Estimates</h2>
            {rows.length > 0 && (
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by name or location…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>
          {!rows.length && <p className="mt-2 text-sm text-muted-foreground">Nothing yet — upload a plan set above.</p>}
          {rows.length > 0 && !filteredRows.length && (
            <p className="mt-2 text-sm text-muted-foreground">No estimates match “{search}”.</p>
          )}
          <div className="mt-4 space-y-2">
            {filteredRows.map((r) => (
              <div key={r.id} className="flex items-center gap-4 rounded-md border p-3">
                <button className="flex-1 text-left" onClick={() => navigate(`/estimating/${r.id}`)}>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[r.location, r.area_sf ? `${r.area_sf.toLocaleString()} SF` : null, new Date(r.created_at).toLocaleDateString()]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </button>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Recommended bid</div>
                  <div className="font-semibold tabular-nums">{currency(totals[r.id] ?? 0)}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
