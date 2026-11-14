import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, FileText, X, Trash2, CloudUpload, Database, ClipboardList, Calculator, Sparkles, TrendingUp, Ruler, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  const uploadRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<EstimateRow | null>(null);

  const [rows, setRows] = useState<EstimateRow[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [areaSf, setAreaSf] = useState('');
  const [notes, setNotes] = useState('');
  // What to price. A full plan set can be uploaded and only part of it estimated.
  const [scope, setScope] = useState({ building: true, site: true, utilities: true });
  const scopeNone = !scope.building && !scope.site && !scope.utilities;
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    let q = supabase.from('estimates').select('*').order('created_at', { ascending: false }).limit(50);
    if (companyId) q = q.eq('company_id', companyId);
    const { data } = await q;
    setLoading(false);
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
      // Company cost database + trade rates: the estimator prices with these first
      let cq = supabase.from('cost_database' as any).select('category,name,unit,unit_cost,notes').eq('is_active', true);
      let tq = supabase.from('trade_rates').select('trade,hourly_rate,burden_percent').eq('is_active', true);
      if (selectedIds.length) {
        cq = cq.or(`company_id.is.null,company_id.in.(${selectedIds.join(',')})`);
        tq = tq.or(`company_id.is.null,company_id.in.(${selectedIds.join(',')})`);
      }
      const [{ data: costRows }, { data: tradeRows }] = await Promise.all([cq, tq]);
      const costBook = [
        ...((costRows as any[]) || []),
        ...((tradeRows as any[]) || []).map((t) => ({
          category: 'labor', name: t.trade, unit: 'HR',
          unit_cost: Number(t.hourly_rate) * (1 + (Number(t.burden_percent) || 0) / 100),
          notes: `Trade rate incl. ${t.burden_percent || 0}% burden`,
        })),
      ];
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
            scope: { ...scope, instructions: notes || undefined },
            costBook,
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
        const streamed: any[] = [];
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
            else if (frame.includes('event: line')) streamed.push(payload);
            else if (frame.includes('event: error')) failure = payload?.error || 'Estimate generation failed.';
            else if (payload?.message) setStage(`${label}${payload.message}…`);
          }
        }
        // Lines arrive one at a time, so a run that is cut off still keeps what it wrote.
        if (out && (!out.lines || !out.lines.length) && streamed.length) out = { ...out, lines: streamed };
        if (!out && streamed.length) out = { lines: streamed, partial: true, assumptions: [], flags: [] };
        if (out?.partial) {
          out.flags = [
            ...(out.flags || []),
            {
              severity: 'high',
              issue: `${label}Analysis stopped early`,
              finding: `The plan review was cut off after ${out.lines.length} cost lines${out.timedOut ? ' (time limit)' : ''}. Scope that comes later in the set may be missing.`,
              exposure: 'Missing scope would understate the estimate.',
              action: 'Review the divisions for gaps, or run the remaining sheets as a separate estimate and add the lines.',
            },
          ];
        }
        if (!out) throw new Error(failure ? (parts.length > 1 ? `${label}${failure}` : failure) : `${label}The estimate did not finish. Try again with fewer or smaller sheets.`);
        return out;
      };

      // Keep finished parts even if a later part fails, instead of losing everything.
      const results: any[] = [];
      const failedParts: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        try {
          results.push(await runPart(parts[i], i));
        } catch (err: any) {
          if (parts.length === 1) throw err;
          failedParts.push(`${parts[i].map((p) => p.file.name).join(', ')}: ${err.message}`);
        }
      }
      if (!results.length) throw new Error(failedParts.join(' · ') || 'The estimate could not be generated.');
      if (failedParts.length) {
        results[0].flags = [
          ...(results[0].flags || []),
          ...failedParts.map((f) => ({ severity: 'critical', issue: 'Sheets not analyzed', finding: f, exposure: 'Scope on these sheets is not in the estimate.', action: 'Re-run these sheets as their own estimate and add the lines.' })),
        ];
      }

      // Merge parts: same cost line in the same group is kept once (larger amount wins, never summed)
      const merged = new Map<string, any>();
      // Keep only the groups that were asked for (site utilities live in the site groups).
      const allowed = new Set<string>([
        ...(scope.building ? ['building', 'building_gc'] : []),
        ...(scope.site || scope.utilities ? ['site', 'site_gc'] : []),
        'other',
      ]);
      results.flatMap((r) => r.lines || []).filter((l: any) => allowed.has(l.group_key)).forEach((l: any) => {
        const key = `${l.group_key}|${String(l.name).trim().toLowerCase()}`;
        const prev = merged.get(key);
        if (!prev || Number(l.baseline_amount) > Number(prev.baseline_amount)) merged.set(key, l);
      });
      const result = {
        project: results.find((r) => r.project)?.project,
        settings: results.find((r) => r.settings)?.settings,
        scope_summary: results.map((r) => r.scope_summary).filter(Boolean).join('\n\n'),
        assumptions: Array.from(new Set(results.flatMap((r) => r.assumptions || []))),
        flags: results.flatMap((r) => r.flags || []),
        lines: Array.from(merged.values()).map((l, i) => ({ ...l, sort_order: i })),
      };

      setStage('Saving the estimate…');
      const estRow: Record<string, any> = {
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
        scope,
      };
      let ins = await supabase.from('estimates').insert(estRow as any).select('id').single();
      if (ins.error && /scope|schema cache|column/i.test(ins.error.message)) {
        delete estRow.scope;
        ins = await supabase.from('estimates').insert(estRow as any).select('id').single();
      }
      const { data: est, error: estErr } = ins;
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

      const mats = result.lines.flatMap((l: any) =>
        (l.materials || []).map((m: any) => ({
          estimate_id: est.id,
          line_id: idBySort.get(l.sort_order),
          item: m.item,
          quantity: m.quantity,
          unit: m.unit,
          unit_cost: m.unit_cost,
          waste_pct: m.waste_pct ?? 0,
          ai_quantity: m.quantity,
          ai_unit_cost: m.unit_cost,
          ai_waste_pct: m.waste_pct ?? 0,
          basis: m.basis,
          sort_order: m.sort_order ?? 0,
        }))
      ).filter((m: any) => m.line_id);
      if (mats.length) {
        const { error: matErr } = await (supabase as any).from('estimate_materials').insert(mats);
        if (matErr) console.warn('Material takeoff not saved (run the estimate materials database update):', matErr.message);
      }

      if (result.flags?.length)
        await supabase.from('estimate_flags').insert(
          result.flags.map((f: any) => ({ estimate_id: est.id, ...f }))
        );

      const partial = results.some((r) => r.partial) || failedParts.length > 0;
      if (partial) toast.warning(`Estimate saved with ${result.lines.length} lines, but part of the plan review was cut off. Check the flags on the estimate.`, { duration: 10000 });
      else toast.success(`Estimate built from the plans: ${result.lines.length} cost lines.`);
      navigate(`/estimating/${est.id}`);
    } catch (e: any) {
      toast.error(e.message || 'The estimate could not be generated.');
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('estimates').delete().eq('id', id);
    if (error) return toast.error(`Couldn't delete the estimate: ${error.message}`);
    toast.success('Estimate deleted');
    load();
  };

  const stats = useMemo(() => {
    const values = rows.map((r) => totals[r.id] ?? 0);
    const pipeline = values.reduce((s, v) => s + v, 0);
    const withArea = rows.filter((r) => r.area_sf > 0 && (totals[r.id] ?? 0) > 0);
    const perSf = withArea.length
      ? withArea.reduce((s, r) => s + (totals[r.id] ?? 0), 0) / withArea.reduce((s, r) => s + r.area_sf, 0)
      : null;
    const thirty = Date.now() - 30 * 86400000;
    return {
      pipeline,
      perSf,
      recent: rows.filter((r) => new Date(r.created_at).getTime() >= thirty).length,
      largest: values.length ? Math.max(...values) : 0,
    };
  }, [rows, totals]);

  const columns: DataTableColumn<EstimateRow>[] = [
    {
      id: 'name',
      header: 'Estimate',
      value: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.name}</p>
          {r.location && <p className="truncate text-xs text-muted-foreground">{r.location}</p>}
        </div>
      ),
    },
    {
      id: 'area',
      header: 'Area',
      align: 'right',
      value: (r) => r.area_sf || 0,
      cell: (r) => (r.area_sf ? <span className="tabular-nums">{r.area_sf.toLocaleString()} SF</span> : <span className="text-muted-foreground">—</span>),
    },
    {
      id: 'persf',
      header: '$ / SF',
      align: 'right',
      value: (r) => (r.area_sf ? (totals[r.id] ?? 0) / r.area_sf : null),
      cell: (r) =>
        r.area_sf && totals[r.id] ? (
          <span className="tabular-nums text-muted-foreground">{currency((totals[r.id] ?? 0) / r.area_sf)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      value: (r) => r.status,
      cell: (r) => (
        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
          {r.status || 'draft'}
        </span>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      value: (r) => new Date(r.created_at),
      cell: (r) => <span className="whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</span>,
    },
    {
      id: 'bid',
      header: 'Recommended bid',
      align: 'right',
      value: (r) => totals[r.id] ?? 0,
      cell: (r) => <span className="font-semibold tabular-nums">{currency(totals[r.id] ?? 0)}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      cell: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate(`/estimating/${r.id}`)}>
            Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => setConfirmDelete(r)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout hideTitle title="Bid Estimator">
      <div className="space-y-6">
        <PageHero
          eyebrow="Bidding"
          title="Bid Estimator"
          subtitle="Upload the plans for a should-cost baseline priced from your cost database."
          actions={
            <>
              <button type="button" className={heroButtonPrimary} onClick={() => uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                <CloudUpload className="h-4 w-4" /> Upload plans
              </button>
              <Link to="/cost-database" className={heroButton}>
                <Database className="h-4 w-4" /> Cost database
              </Link>
              <Link to="/bid-planner" className={heroButton}>
                <ClipboardList className="h-4 w-4" /> Bid Planner
              </Link>
            </>
          }
          stats={[
            { label: 'Estimates', value: loading ? '…' : rows.length },
            { label: 'Total estimated', value: loading ? '…' : currency(stats.pipeline) },
            { label: 'Average $ / SF', value: loading ? '…' : stats.perSf == null ? '—' : currency(stats.perSf) },
          ]}
        />

        <WorkflowStepper projectId={undefined} />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AccentStat label="Estimates" value={rows.length} icon={Calculator} accent="blue" loading={loading} hint={companyId ? 'This company' : 'All selected companies'} />
          <AccentStat label="Built in last 30 days" value={stats.recent} icon={Sparkles} accent="indigo" loading={loading} hint="From uploaded plan sets" />
          <AccentStat label="Largest estimate" value={currency(stats.largest)} icon={TrendingUp} accent="orange" loading={loading} hint="Recommended bid" />
          <AccentStat
            label="Average $ / SF"
            value={stats.perSf == null ? '—' : currency(stats.perSf)}
            icon={Ruler}
            accent="emerald"
            loading={loading}
            hint="Estimates with a building area"
          />
        </div>

        <Card ref={uploadRef} className="scroll-mt-20 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-6 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold">Build an estimate from the plans</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Upload the permit or construction set (PDF or images), plus any specs and schedules. Fields left blank are read from the drawings.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-3">
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

            <div>
              <Label>What to estimate</Label>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                {([
                  ['building', 'Building', 'Building direct cost + building general conditions'],
                  ['site', 'Site / civil', 'Earthwork, paving, exterior work + site general conditions'],
                  ['utilities', 'Site utilities', 'Water, sewer, storm, gas, duct banks outside the building'],
                ] as const).map(([k, label, hint]) => (
                  <label
                    key={k}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors',
                      scope[k] ? 'border-orange-500/60 bg-orange-500/5' : 'hover:bg-muted/40'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-orange-500"
                      checked={scope[k]}
                      disabled={busy}
                      onChange={(e) => setScope((p) => ({ ...p, [k]: e.target.checked }))}
                    />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Upload the whole plan set either way. Unticked scope is used only as reference and is not priced. Building and site general conditions are always kept as separate lines.
              </p>
            </div>

            <div>
              <Label>Instructions and notes for the estimator</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Specific instructions, e.g. exclude landscaping, owner supplies the transformer, phase 1 only"
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
              className={cn(
                'flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                dragging ? 'border-orange-500 bg-orange-500/5' : 'border-muted-foreground/25 hover:border-orange-500/50 hover:bg-muted/40',
                busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <CloudUpload className="h-6 w-6 text-muted-foreground" />
              </span>
              <span className="mt-3 text-sm font-medium">{dragging ? 'Drop the plan files here' : 'Drag plan files here, or click to browse'}</span>
              <span className="mt-1 text-xs text-muted-foreground">PDF or images · up to 12 MB per file · large sets are analyzed in parts automatically</span>
            </button>

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="divide-y rounded-lg border">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{fmtSize(f.size)}</span>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        disabled={busy}
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {files.length} file{files.length === 1 ? '' : 's'} · {fmtSize(totalBytes)} total
                  {partCount > 1 ? ` · will be analyzed in ${partCount} parts and merged` : ''}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={busy || !files.length || scopeNone} className="bg-orange-500 text-white hover:bg-orange-600">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Build estimate
              </Button>
              {stage && (
                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {stage}
                </span>
              )}
            </div>
          </div>
        </Card>

        <div>
          <h2 className="mb-3 font-semibold">Estimates</h2>
          <DataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            loading={loading}
            searchPlaceholder="Search by name or location…"
            exportFilename="estimates"
            initialSort={{ id: 'created', desc: true }}
            onRowClick={(r) => navigate(`/estimating/${r.id}`)}
            empty={
              <EmptyState
                icon={Calculator}
                title="No estimates yet"
                description="Upload a plan set above. The estimator reads the drawings, prices the scope from your cost database and gives you a recommended bid."
                action={{ label: 'Upload plans', onClick: () => fileRef.current?.click(), icon: CloudUpload }}
                secondaryAction={{ label: 'Set up cost database', to: '/cost-database' }}
              />
            }
          />
        </div>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this estimate?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" and all of its cost lines will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) remove(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
