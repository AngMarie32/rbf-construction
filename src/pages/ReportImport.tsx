import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CostCodeRef, ProjectRef, normalize } from '@/utils/qbImport';
import {
  DEST_LABEL,
  Destination,
  KIND_LABEL,
  ParsedReport,
  ReportLine,
  overheadForPeriod,
  parseReportFile,
  reportRef,
} from '@/utils/financialReportImport';

type RefTable = 'expenses' | 'time_entries' | 'overhead_items' | 'project_billing';

interface Row extends ReportLine {
  duplicate: boolean;
  ref: string;
  existingId: string | null;
  existingTable: RefTable | null;
}

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DESTS: Destination[] = ['project_cost', 'labor', 'operating', 'revenue', 'skip'];
const needsProject = (d: Destination) => d === 'project_cost' || d === 'labor' || d === 'revenue';

export default function ReportImport() {
  const { selectedIds, companies } = useCompanies();
  const [uploadCompanyId, setUploadCompanyId] = useState<string>('');
  const companyId = uploadCompanyId || (selectedIds.length === 1 ? selectedIds[0] : null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [costCodes, setCostCodes] = useState<CostCodeRef[]>([]);
  const [report, setReport] = useState<ParsedReport | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [override, setOverride] = useState(false);
  const [lastBatch, setLastBatch] = useState<{ id: string; file_name: string | null; imported_count: number | null } | null>(null);

  const loadLastBatch = useCallback(async () => {
    const { data } = await supabase
      .from('qb_import_batches')
      .select('id, file_name, imported_count')
      .neq('status', 'undone')
      .order('created_at', { ascending: false })
      .limit(1);
    setLastBatch(data?.[0] ?? null);
  }, []);

  useEffect(() => {
    loadLastBatch();
  }, [loadLastBatch]);

  const reverseLastUpload = async () => {
    if (!lastBatch) return;
    if (!window.confirm(`Reverse the last upload${lastBatch.file_name ? ` (${lastBatch.file_name})` : ''}? Lines it added will be deleted. Lines it updated keep their latest values.`)) return;
    setBusy(true);
    try {
      await supabase.from('expenses').delete().eq('import_batch_id', lastBatch.id);
      await supabase.from('time_entries').delete().eq('import_batch_id', lastBatch.id);
      await supabase.from('overhead_items').delete().like('notes', `%[batch:${lastBatch.id}]%`);
      await supabase.from('project_billing').delete().like('notes', `%[batch:${lastBatch.id}]%`);
      await supabase.from('qb_import_batches').update({ status: 'undone', imported_count: 0 }).eq('id', lastBatch.id);
      toast.success('Last upload reversed.');
      setLastBatch(null);
    } catch (e: any) {
      toast.error(e.message || 'The upload could not be reversed.');
    } finally {
      setBusy(false);
    }
  };

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('projects').select('id, name, project_code, client, company_id, status').is('archived_at', null).order('name'),
      supabase.from('cost_codes').select('id, code, name, company_id').eq('is_active', true).order('code'),
    ]);
    const scoped = (list: any[] | null) =>
      (list || []).filter((r) => !r.company_id || selectedIds.length === 0 || selectedIds.includes(r.company_id));
    setProjects(sortProjectsOpenFirst(scoped(p.data) as ProjectRef[]));
    setCostCodes(scoped(c.data) as CostCodeRef[]);
  }, [selectedIds]);

  useEffect(() => {
    load();
  }, [load]);

  const withRefs = async (lines: ReportLine[], start: string, end: string): Promise<Row[]> => {
    const mapped = lines.map((l) => ({ ...l, ref: reportRef(l, start, end), duplicate: false, existingId: null, existingTable: null }));
    const refs = mapped.map((m) => m.ref);
    const seen = new Map<string, { table: RefTable; id: string }>();
    for (let i = 0; i < refs.length; i += 300) {
      const chunk = refs.slice(i, i + 300);
      const [e, t, o, b] = await Promise.all([
        supabase.from('expenses').select('id, external_ref').in('external_ref', chunk),
        supabase.from('time_entries').select('id, external_ref').in('external_ref', chunk),
        supabase.from('overhead_items').select('id, external_ref').in('external_ref', chunk),
        supabase.from('project_billing').select('id, external_ref').in('external_ref', chunk),
      ]);
      (e.data || []).forEach((r: any) => seen.set(r.external_ref, { table: 'expenses', id: r.id }));
      (t.data || []).forEach((r: any) => seen.set(r.external_ref, { table: 'time_entries', id: r.id }));
      (o.data || []).forEach((r: any) => seen.set(r.external_ref, { table: 'overhead_items', id: r.id }));
      (b.data || []).forEach((r: any) => seen.set(r.external_ref, { table: 'project_billing', id: r.id }));
    }
    return mapped.map((m) => {
      const hit = seen.get(m.ref);
      return hit ? { ...m, duplicate: true, existingId: hit.id, existingTable: hit.table } : m;
    });
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const parsed = await parseReportFile(file, projects, costCodes);
      if (!parsed.lines.length) return toast.error('No amounts were found in that report.');
      setReport(parsed);
      setFileName(file.name);
      setRows(await withRefs(parsed.lines, parsed.periodStart, parsed.periodEnd));
      toast.success(`Read ${parsed.lines.length} lines from a ${KIND_LABEL[parsed.kind]} report.`);
    } catch (e: any) {
      toast.error(e.message || 'That file could not be read.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const update = (i: number, patch: Partial<Row>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const applyToJob = (i: number) => {
    const row = rows[i];
    setRows((prev) => prev.map((r) => (normalize(r.job) === normalize(row.job) ? { ...r, projectId: row.projectId } : r)));
    toast.success(row.job ? `Applied to every line for ${row.job}.` : 'Applied to every line without a job.');
  };

  const totals = useMemo(() => {
    const t: Record<Destination, number> = { project_cost: 0, labor: 0, operating: 0, revenue: 0, skip: 0 };
    rows.forEach((r) => (t[r.destination] += r.amount));
    return { t, missing: rows.filter((r) => needsProject(r.destination) && !r.projectId).length, used: rows.filter((r) => r.destination !== 'skip').length };
  }, [rows]);

  const runImport = async () => {
    if (!report) return;
    const used = rows.filter((r) => r.destination !== 'skip');
    if (!used.length) return toast.error('Every line is set to Skip.');
    if (totals.missing) return toast.error(`${totals.missing} lines still need a project.`);
    setBusy(true);
    try {
      const { periodStart: start, periodEnd: end } = report;
      const { data: u } = await supabase.auth.getUser();
      const { data: batch, error: be } = await supabase
        .from('qb_import_batches')
        .insert({
          company_id: companyId,
          file_name: fileName,
          source_report: KIND_LABEL[report.kind],
          imported_by: u?.user?.id ?? null,
          imported_by_name: u?.user?.email ?? null,
          row_count: rows.length,
          imported_count: used.length,
          total_amount: used.reduce((s, r) => s + r.amount, 0),
          status: 'imported',
        })
        .select('id')
        .single();
      if (be) throw be;
      const tag = `[batch:${batch.id}]`;
      const codeName = (id: string | null) => costCodes.find((c) => c.id === id)?.name;
      const label = (r: Row) => [r.account, r.vendor, r.memo].filter(Boolean).join(' · ');

      const expenses = used.filter((r) => r.destination === 'project_cost' && !r.duplicate).map((r) => ({
        project_id: r.projectId!,
        category: codeName(r.costCodeId) || r.account || 'Other',
        description: label(r) || 'Imported cost',
        amount: r.amount,
        date: r.date || end,
        vendor: r.vendor || null,
        status: 'Approved',
        cost_code_id: r.costCodeId,
        source: 'report_import',
        import_batch_id: batch.id,
        external_ref: r.ref,
      }));
      const labor = used.filter((r) => r.destination === 'labor' && !r.duplicate).map((r) => ({
        project_id: r.projectId!,
        employee_name: r.vendor || r.account || 'Labor (from report)',
        work_date: r.date || end,
        cost_code_id: r.costCodeId,
        regular_hours: 1,
        overtime_hours: 0,
        hourly_rate: r.amount,
        burden_percent: 0,
        notes: `Lump-sum labor from ${fileName} (${start} to ${end})`,
        source: 'report_import',
        import_batch_id: batch.id,
        external_ref: r.ref,
      }));
      const overhead = used.filter((r) => r.destination === 'operating' && !r.duplicate).map((r) => {
        const o = overheadForPeriod(r.amount, start, end);
        return {
          company_id: companyId,
          name: r.account,
          category: r.section === 'other_expense' ? 'Other' : 'From P&L',
          amount: o.amount,
          frequency: o.frequency,
          start_date: start,
          end_date: end,
          is_active: true,
          created_by: u?.user?.id ?? null,
          notes: `${currency(r.amount)} for ${start} to ${end} from ${fileName} ${tag}`,
          external_ref: r.ref,
        };
      });
      const billing = used.filter((r) => r.destination === 'revenue' && !r.duplicate).map((r) => ({
        project_id: r.projectId!,
        billing_period_start: start,
        billing_period_end: end,
        invoice_date: r.date || end,
        billed_amount: r.amount,
        paid_amount: 0,
        status: 'Sent',
        notes: `${r.account} from ${fileName} ${tag}`,
        external_ref: r.ref,
      }));

      // Lines already in the books (same account/job/vendor from an earlier overlapping
      // report) are updated in place instead of inserted again.
      const updates: any[] = [];
      used.filter((r) => r.duplicate && r.existingId).forEach((r) => {
        if (r.existingTable === 'expenses') {
          updates.push(
            supabase.from('expenses').update({
              project_id: r.projectId!,
              category: codeName(r.costCodeId) || r.account || 'Other',
              description: label(r) || 'Imported cost',
              amount: r.amount,
              date: r.date || end,
              vendor: r.vendor || null,
              cost_code_id: r.costCodeId,
              import_batch_id: batch.id,
            }).eq('id', r.existingId)
          );
        } else if (r.existingTable === 'time_entries') {
          updates.push(
            supabase.from('time_entries').update({
              project_id: r.projectId!,
              work_date: r.date || end,
              cost_code_id: r.costCodeId,
              hourly_rate: r.amount,
              notes: `Lump-sum labor from ${fileName} (${start} to ${end})`,
              import_batch_id: batch.id,
            }).eq('id', r.existingId)
          );
        } else if (r.existingTable === 'overhead_items') {
          const o = overheadForPeriod(r.amount, start, end);
          updates.push(
            supabase.from('overhead_items').update({
              amount: o.amount,
              frequency: o.frequency,
              start_date: start,
              end_date: end,
              notes: `${currency(r.amount)} for ${start} to ${end} from ${fileName} ${tag}`,
            }).eq('id', r.existingId)
          );
        } else if (r.existingTable === 'project_billing') {
          updates.push(
            supabase.from('project_billing').update({
              project_id: r.projectId!,
              billing_period_start: start,
              billing_period_end: end,
              invoice_date: r.date || end,
              billed_amount: r.amount,
              notes: `${r.account} from ${fileName} ${tag}`,
            } as any).eq('id', r.existingId)
          );
        }
      });

      const inserts = [
        expenses.length && supabase.from('expenses').insert(expenses),
        labor.length && supabase.from('time_entries').insert(labor),
        overhead.length && supabase.from('overhead_items').insert(overhead as any),
        billing.length && supabase.from('project_billing').insert(billing as any),
      ].filter(Boolean) as any[];
      const results = await Promise.all([...inserts, ...updates]);
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;

      const updatedCount = updates.length;
      toast.success(
        `Imported: ${expenses.length} project costs, ${labor.length} labor, ${overhead.length} operating costs, ${billing.length} billing entries` +
          (updatedCount ? ` — and updated ${updatedCount} existing ${updatedCount === 1 ? 'line' : 'lines'} from the earlier report.` : '.')
      );
      setRows([]);
      setReport(null);
      setFileName('');
      loadLastBatch();
    } catch (e: any) {
      toast.error(e.message || 'The import could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout title="Report Import">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Report Import</h1>
          <p className="text-sm text-muted-foreground">
            Upload a QuickBooks Desktop P&L, P&L by Job, Job Profitability, Estimates vs. Actuals or job cost detail. Each
            line is sent to project costs, labor, operating costs or billing — you review before anything saves. Excel, CSV
            and PDF exports all work.
          </p>
          {lastBatch && (
            <Button variant="outline" size="sm" className="mt-3" onClick={reverseLastUpload} disabled={busy}>
              Reverse last upload{lastBatch.file_name ? ` (${lastBatch.file_name})` : ''}
            </Button>
          )}
        </div>

        <Card
          className={`p-8 text-center transition-colors ${dragging ? 'bg-muted' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <p className="text-sm text-muted-foreground">Drag an Excel, CSV or PDF export here, or</p>
          <Button className="mt-3" onClick={() => fileRef.current?.click()} disabled={busy}>
            Choose report
          </Button>
          {fileName && <p className="mt-2 text-sm">{fileName}</p>}
        </Card>

        {report && rows.length > 0 && (
          <>
            <Card className="flex flex-wrap items-end gap-6 p-6">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Report type</div>
                <div className="font-semibold">{KIND_LABEL[report.kind]}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Period from</div>
                <Input type="date" className="w-40" value={report.periodStart}
                  onChange={(e) => setReport({ ...report, periodStart: e.target.value })} />
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Period to</div>
                <Input type="date" className="w-40" value={report.periodEnd}
                  onChange={(e) => setReport({ ...report, periodEnd: e.target.value })} />
              </div>
              {(['project_cost', 'labor', 'operating', 'revenue'] as Destination[]).map((d) => (
                <div key={d}>
                  <div className="text-xs uppercase text-muted-foreground">{DEST_LABEL[d]}</div>
                  <div className="font-semibold tabular-nums">{currency(totals.t[d])}</div>
                </div>
              ))}
              <div>
                <div className="text-xs uppercase text-muted-foreground">Need a project</div>
                <div className={`font-semibold ${totals.missing ? 'text-destructive' : ''}`}>{totals.missing}</div>
              </div>
            </Card>

            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Line</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-left">Goes to</th>
                    <th className="p-3 text-left">Project</th>
                    <th className="p-3 text-left">Cost code</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const missing = needsProject(r.destination) && !r.projectId;
                    return (
                      <tr key={r.key} className={`border-t border-border ${missing ? 'bg-destructive/10' : ''} ${r.destination === 'skip' ? 'opacity-50' : ''}`}>
                        <td className="p-3">
                          <Input
                            value={r.account}
                            onChange={(e) => update(i, { account: e.target.value })}
                            className="h-8 w-56 font-medium"
                          />
                          <div className="text-xs text-muted-foreground">
                            {[r.job && `Job: ${r.job}`, r.vendor, r.memo, r.date].filter(Boolean).join(' · ')}
                          </div>
                          {r.duplicate && <Badge variant="secondary" className="mt-1">Already imported — will be updated, not duplicated</Badge>}
                          {r.reason && <div className="text-xs text-muted-foreground">{r.reason}</div>}
                        </td>
                        <td className="whitespace-nowrap p-3 text-right tabular-nums">
                          <Input
                            type="number"
                            step="0.01"
                            value={r.amount}
                            onChange={(e) => update(i, { amount: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-32 text-right"
                          />
                        </td>
                        <td className="p-3">
                          <Select value={r.destination} onValueChange={(v) => update(i, { destination: v as Destination })}>
                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DESTS.map((d) => <SelectItem key={d} value={d}>{DEST_LABEL[d]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          {needsProject(r.destination) ? (
                            <div className="flex flex-col gap-1">
                              <Select value={r.projectId ?? 'none'} onValueChange={(v) => update(i, { projectId: v === 'none' ? null : v })}>
                                <SelectTrigger className="w-52"><SelectValue placeholder="Pick a project" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Pick a project</SelectItem>
                                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <button className="text-left text-xs text-muted-foreground underline hover:text-foreground" onClick={() => applyToJob(i)}>
                                {r.job ? 'Apply to all lines for this job' : 'Apply to all lines without a job'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Company-wide</span>
                          )}
                        </td>
                        <td className="p-3">
                          {r.destination === 'project_cost' || r.destination === 'labor' ? (
                            <Select value={r.costCodeId ?? 'none'} onValueChange={(v) => update(i, { costCodeId: v === 'none' ? null : v })}>
                              <SelectTrigger className="w-48"><SelectValue placeholder="Pick a code" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {costCodes.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={() => removeRow(i)} disabled={busy}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Imports can be undone from <Link to="/cost-import" className="underline">Cost Import → History</Link>.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setRows([]); setReport(null); setFileName(''); }} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={runImport} disabled={busy || !totals.used}>
                  Import {totals.used} lines
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
