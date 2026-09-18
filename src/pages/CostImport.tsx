import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { CSI_COST_CODES } from '@/data/csiCostCodes';
import {
  ParsedLine,
  CostCodeRef,
  ProjectRef,
  MatchRule,
  parseWorkbook,
  matchLine,
  externalRef,
  confidenceLabel,
  normalize,
  payrollFields,
  looksLikePayroll,
} from '@/utils/qbImport';

interface ReviewRow extends ParsedLine {
  projectId: string | null;
  costCodeId: string | null;
  confidence: number;
  reason: string;
  include: boolean;
  duplicate: boolean;
  externalRef: string;
  employeeName: string;
  regularHours: number;
  overtimeHours: number;
  rate: number;
}

interface EmployeeRef {
  id: string;
  name: string;
  hourly_rate: number | null;
  ot_multiplier: number;
  burden_percent: number;
}

interface BatchRow {
  id: string;
  file_name: string;
  imported_count: number;
  row_count: number;
  total_amount: number;
  status: string;
  created_at: string;
  imported_by_name: string | null;
}

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CostImport() {
  const { selectedIds, companies } = useCompanies();
  const fileRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [costCodes, setCostCodes] = useState<CostCodeRef[]>([]);
  const [rules, setRules] = useState<MatchRule[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', name: '', division: '' });
  const [payroll, setPayroll] = useState(false);
  const [employees, setEmployees] = useState<EmployeeRef[]>([]);

  const companyId = selectedIds.length === 1 ? selectedIds[0] : null;

  const loadReference = useCallback(async () => {
    const [projRes, codeRes, ruleRes, batchRes, empRes] = await Promise.all([
      supabase.from('projects').select('id, name, project_code, client, company_id').is('archived_at', null).order('name'),
      supabase.from('cost_codes').select('id, code, name, division, company_id').eq('is_active', true).order('code'),
      supabase.from('qb_mapping_rules').select('match_type, match_value, project_id, cost_code_id, category'),
      supabase
        .from('qb_import_batches')
        .select('id, file_name, imported_count, row_count, total_amount, status, created_at, imported_by_name')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('employees')
        .select('id, name, hourly_rate, ot_multiplier, burden_percent, company_id')
        .eq('is_active', true),
    ]);

    const scoped = (list: any[] | null) =>
      (list || []).filter((r) => !r.company_id || selectedIds.length === 0 || selectedIds.includes(r.company_id));

    setProjects(scoped(projRes.data) as ProjectRef[]);
    setCostCodes(scoped(codeRes.data) as CostCodeRef[]);
    setRules((ruleRes.data || []) as MatchRule[]);
    setBatches((batchRes.data || []) as BatchRow[]);
    setEmployees(scoped(empRes.data) as EmployeeRef[]);
  }, [selectedIds]);

  useEffect(() => {
    loadReference();
  }, [loadReference]);

  const seedCostCodes = async () => {
    setBusy(true);
    const existing = new Set(costCodes.map((c) => c.code));
    const payload = CSI_COST_CODES.filter((c) => !existing.has(c.code)).map((c) => ({
      company_id: companyId,
      code: c.code,
      name: c.name,
      division: c.division,
    }));
    if (!payload.length) {
      toast.info('Your cost code library is already complete.');
      setBusy(false);
      return;
    }
    const { error } = await supabase.from('cost_codes').insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Added ${payload.length} cost codes.`);
    loadReference();
  };

  const addCostCode = async () => {
    if (!newCode.code.trim() || !newCode.name.trim()) return toast.error('Give the cost code a number and a name.');
    const { error } = await supabase.from('cost_codes').insert({
      company_id: companyId,
      code: newCode.code.trim(),
      name: newCode.name.trim(),
      division: newCode.division.trim() || null,
    });
    if (error) return toast.error(error.message);
    setNewCode({ code: '', name: '', division: '' });
    loadReference();
  };

  const removeCostCode = async (id: string) => {
    const { error } = await supabase.from('cost_codes').update({ is_active: false }).eq('id', id);
    if (error) return toast.error(error.message);
    loadReference();
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbook(buffer);
      if (!parsed.length) {
        toast.error('No cost rows were found in that file.');
        return;
      }
      const isPayrollFile = looksLikePayroll(parsed);
      setPayroll(isPayrollFile);

      const refs = parsed.map(externalRef);
      const table = isPayrollFile ? 'time_entries' : 'expenses';
      const { data: existing } = await supabase
        .from(table as 'expenses')
        .select('external_ref')
        .in('external_ref', refs.slice(0, 500));
      const seen = new Set((existing || []).map((e: any) => e.external_ref));

      const reviewed: ReviewRow[] = parsed.map((line) => {
        const match = matchLine(line, projects, costCodes, rules);
        const ref = externalRef(line);
        const duplicate = seen.has(ref);
        const pay = payrollFields(line);
        const person = employees.find((e) => normalize(e.name) === normalize(pay.employeeName));
        return {
          ...line,
          projectId: match.projectId,
          costCodeId: match.costCodeId,
          confidence: match.confidence,
          reason: match.reason,
          include: !duplicate,
          duplicate,
          externalRef: ref,
          employeeName: pay.employeeName,
          regularHours: pay.regularHours,
          overtimeHours: pay.overtimeHours,
          rate: pay.rate || Number(person?.hourly_rate ?? 0),
        };
      });
      setRows(reviewed);
      setFileName(file.name);
      toast.success(
        isPayrollFile
          ? `Read ${reviewed.length} payroll rows from ${file.name}.`
          : `Read ${reviewed.length} rows from ${file.name}.`
      );
    } catch (e: any) {
      toast.error(e.message || 'That file could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (index: number, patch: Partial<ReviewRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const applyToVendor = (index: number) => {
    const row = rows[index];
    if (!row.vendor) return toast.error('This row has no vendor to learn from.');
    setRows((prev) =>
      prev.map((r) =>
        normalize(r.vendor) === normalize(row.vendor)
          ? { ...r, projectId: row.projectId, costCodeId: row.costCodeId, confidence: 0.99, reason: 'Applied to every row from this vendor' }
          : r
      )
    );
    toast.success(`Applied to every row from ${row.vendor}.`);
  };

  const summary = useMemo(() => {
    const included = rows.filter((r) => r.include);
    return {
      total: rows.length,
      included: included.length,
      amount: included.reduce((s, r) => s + r.amount, 0),
      unmatched: rows.filter((r) => r.include && !r.projectId).length,
      duplicates: rows.filter((r) => r.duplicate).length,
    };
  }, [rows]);

  const runImport = async () => {
    const included = rows.filter((r) => r.include);
    if (!included.length) return toast.error('Nothing is selected to import.');
    if (included.some((r) => !r.projectId)) return toast.error('Every selected row needs a job before importing.');

    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: batch, error: batchError } = await supabase
        .from('qb_import_batches')
        .insert({
          company_id: companyId,
          file_name: fileName,
          source_report: 'QuickBooks report',
          imported_by: userData?.user?.id ?? null,
          imported_by_name: userData?.user?.email ?? null,
          row_count: rows.length,
          imported_count: included.length,
          total_amount: included.reduce((s, r) => s + r.amount, 0),
          status: 'imported',
        })
        .select('id')
        .single();
      if (batchError) throw batchError;

      const codeById = new Map(costCodes.map((c) => [c.id, c]));
      let created: { id: string }[] | null = null;

      if (payroll) {
        const payrollPayload = included.map((r) => {
          const person = employees.find((e) => normalize(e.name) === normalize(r.employeeName));
          const rate =
            r.rate ||
            Number(person?.hourly_rate ?? 0) ||
            (r.regularHours + r.overtimeHours ? r.amount / (r.regularHours + r.overtimeHours) : 0);
          return {
            project_id: r.projectId,
            employee_id: person?.id ?? null,
            employee_name: r.employeeName || r.vendor || 'Employee',
            work_date: r.date || new Date().toISOString().slice(0, 10),
            cost_code_id: r.costCodeId,
            regular_hours: r.regularHours,
            overtime_hours: r.overtimeHours,
            hourly_rate: rate,
            ot_multiplier: person?.ot_multiplier ?? 1.5,
            burden_percent: person?.burden_percent ?? 0,
            notes: r.memo || null,
            source: 'payroll_import',
            import_batch_id: batch.id,
            external_ref: r.externalRef,
          };
        });
        const { data, error: timeError } = await supabase.from('time_entries').insert(payrollPayload).select('id');
        if (timeError) throw timeError;
        created = data as { id: string }[];
      } else {
        const expensePayload = included.map((r) => ({
          project_id: r.projectId,
          category: r.costCodeId ? codeById.get(r.costCodeId)?.name || 'Other' : 'Other',
          description: r.memo || r.account || r.vendor || 'Imported cost',
          amount: r.amount,
          date: r.date || new Date().toISOString().slice(0, 10),
          vendor: r.vendor || null,
          receipt_number: r.refNumber || null,
          status: 'Approved',
          cost_code_id: r.costCodeId,
          source: 'quickbooks_import',
          import_batch_id: batch.id,
          external_ref: r.externalRef,
        }));

        const { data, error: expenseError } = await supabase.from('expenses').insert(expensePayload).select('id');
        if (expenseError) throw expenseError;
        created = data as { id: string }[];
      }

      await supabase.from('qb_import_lines').insert(
        rows.map((r, i) => ({
          batch_id: batch.id,
          row_index: i,
          raw: r.raw,
          txn_date: r.date,
          vendor: r.vendor || null,
          account: r.account || null,
          job_name: r.jobName || null,
          memo: r.memo || null,
          ref_number: r.refNumber || null,
          amount: r.amount,
          matched_project_id: r.projectId,
          matched_cost_code_id: r.costCodeId,
          confidence: r.confidence,
          match_reason: r.reason,
          status: r.include ? 'imported' : r.duplicate ? 'duplicate' : 'skipped',
        }))
      );

      // remember every mapping so the next import needs less cleanup
      const learned = new Map<string, any>();
      included.forEach((r) => {
        if (r.vendor) {
          learned.set(`vendor|${normalize(r.vendor)}`, {
            company_id: companyId,
            match_type: 'vendor',
            match_value: r.vendor,
            project_id: r.projectId,
            cost_code_id: r.costCodeId,
          });
        }
        if (r.jobName) {
          learned.set(`job|${normalize(r.jobName)}`, {
            company_id: companyId,
            match_type: 'job',
            match_value: r.jobName,
            project_id: r.projectId,
            cost_code_id: r.costCodeId,
          });
        }
      });
      const existingKeys = new Set(rules.map((r) => `${r.match_type}|${normalize(r.match_value)}`));
      const newRules = [...learned.entries()].filter(([k]) => !existingKeys.has(k)).map(([, v]) => v);
      if (newRules.length) await supabase.from('qb_mapping_rules').insert(newRules);

      toast.success(
        payroll
          ? `Imported ${created?.length ?? included.length} labor entries.`
          : `Imported ${created?.length ?? included.length} costs.`
      );
      setRows([]);
      setFileName('');
      setPayroll(false);
      if (fileRef.current) fileRef.current.value = '';
      loadReference();
    } catch (e: any) {
      toast.error(e.message || 'The import could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const undoBatch = async (batchId: string) => {
    setBusy(true);
    const { error } = await supabase.from('expenses').delete().eq('import_batch_id', batchId);
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    await supabase.from('time_entries').delete().eq('import_batch_id', batchId);
    await supabase.from('qb_import_batches').update({ status: 'undone', imported_count: 0 }).eq('id', batchId);
    setBusy(false);
    toast.success('That import was rolled back.');
    loadReference();
  };

  return (
    <Layout title="Cost Import">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cost Import</h1>
          <p className="text-sm text-muted-foreground">
            Upload a QuickBooks report and we place each cost on the right job and cost code.
          </p>
        </div>

        <Tabs defaultValue="import">
          <TabsList>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="codes">Cost Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 pt-4">
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <Button onClick={() => fileRef.current?.click()} disabled={busy}>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose report
                </Button>
                {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
                {!costCodes.length && (
                  <Button variant="outline" onClick={seedCostCodes} disabled={busy}>
                    Set up cost code library
                  </Button>
                )}
                {rows.length > 0 && (
                  <label className="ml-auto flex items-center gap-2 text-sm">
                    <Checkbox checked={payroll} onCheckedChange={(v) => setPayroll(Boolean(v))} />
                    This is a payroll report (hours become labor costs)
                  </label>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Excel or CSV. Column names are read automatically — no template required. Payroll reports with hours are
                recognized on their own and land on the Labor Costs page.
              </p>
            </Card>

            {rows.length > 0 && (
              <>
                <Card className="grid grid-cols-2 gap-4 p-6 md:grid-cols-5">
                  <Stat label="Rows read" value={String(summary.total)} />
                  <Stat label="Selected" value={String(summary.included)} />
                  <Stat label="Amount" value={currency(summary.amount)} />
                  <Stat label="Need a job" value={String(summary.unmatched)} />
                  <Stat label="Already imported" value={String(summary.duplicates)} />
                </Card>

                <Card className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="p-3 text-left">Use</th>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">{payroll ? 'Person / Memo' : 'Vendor / Memo'}</th>
                        {payroll && <th className="p-3 text-right">Hours</th>}
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-left">Job</th>
                        <th className="p-3 text-left">Cost code</th>
                        <th className="p-3 text-left">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const level = confidenceLabel(row.confidence);
                        const needsAttention = row.include && !row.projectId;
                        return (
                          <tr
                            key={i}
                            className={`border-t border-border ${needsAttention ? 'bg-destructive/10' : ''}`}
                          >
                            <td className="p-3">
                              <Checkbox
                                checked={row.include}
                                onCheckedChange={(v) => updateRow(i, { include: Boolean(v) })}
                              />
                            </td>
                            <td className="whitespace-nowrap p-3">{row.date || '—'}</td>
                            <td className="p-3">
                              <div className="font-medium">{(payroll ? row.employeeName : row.vendor) || '—'}</div>
                              <div className="text-xs text-muted-foreground">
                                {[row.jobName, row.account, row.memo].filter(Boolean).join(' · ') || '—'}
                              </div>
                            </td>
                            {payroll && (
                              <td className="whitespace-nowrap p-3 text-right tabular-nums">
                                {row.regularHours.toFixed(2)}
                                {row.overtimeHours ? ` + ${row.overtimeHours.toFixed(2)} OT` : ''}
                              </td>
                            )}
                            <td className="whitespace-nowrap p-3 text-right tabular-nums">{currency(row.amount)}</td>
                            <td className="p-3">
                              <Select
                                value={row.projectId ?? 'none'}
                                onValueChange={(v) => updateRow(i, { projectId: v === 'none' ? null : v, confidence: 0.99 })}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Pick a job" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No job</SelectItem>
                                  {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Select
                                value={row.costCodeId ?? 'none'}
                                onValueChange={(v) => updateRow(i, { costCodeId: v === 'none' ? null : v })}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Pick a code" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {costCodes.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.code} · {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                {row.duplicate ? (
                                  <Badge variant="secondary">Already imported</Badge>
                                ) : (
                                  <Badge
                                    className={
                                      level === 'high'
                                        ? 'bg-success/15 text-success'
                                        : level === 'medium'
                                        ? 'bg-warning/15 text-warning'
                                        : 'bg-destructive/15 text-destructive'
                                    }
                                  >
                                    {level === 'high' ? 'Confident' : level === 'medium' ? 'Check' : 'Needs a job'}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">{row.reason || '—'}</span>
                                <button
                                  className="text-left text-xs underline text-muted-foreground hover:text-foreground"
                                  onClick={() => applyToVendor(i)}
                                >
                                  Apply to all from this vendor
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setRows([])} disabled={busy}>
                    Cancel
                  </Button>
                  <Button onClick={runImport} disabled={busy || summary.included === 0}>
                    Import {summary.included} costs
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="pt-4">
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">File</th>
                    <th className="p-3 text-left">Imported</th>
                    <th className="p-3 text-right">Rows</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="p-3 font-medium">{b.file_name}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(b.created_at).toLocaleDateString()} {b.imported_by_name ? `· ${b.imported_by_name}` : ''}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {b.imported_count} / {b.row_count}
                      </td>
                      <td className="p-3 text-right tabular-nums">{currency(Number(b.total_amount))}</td>
                      <td className="p-3">
                        <Badge variant={b.status === 'undone' ? 'secondary' : 'default'}>{b.status}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        {b.status !== 'undone' && (
                          <Button variant="ghost" size="sm" onClick={() => undoBatch(b.id)} disabled={busy}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Undo
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!batches.length && (
                    <tr>
                      <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                        No imports yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="codes" className="space-y-4 pt-4">
            <Card className="flex flex-wrap items-end gap-3 p-6">
              <div className="w-32">
                <Input
                  placeholder="Code"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                />
              </div>
              <div className="w-56">
                <Input
                  placeholder="Name"
                  value={newCode.name}
                  onChange={(e) => setNewCode({ ...newCode, name: e.target.value })}
                />
              </div>
              <div className="w-56">
                <Input
                  placeholder="Division"
                  value={newCode.division}
                  onChange={(e) => setNewCode({ ...newCode, division: e.target.value })}
                />
              </div>
              <Button onClick={addCostCode}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
              <Button variant="outline" onClick={seedCostCodes} disabled={busy}>
                Load standard codes
              </Button>
            </Card>

            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Division</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {costCodes.map((c: any) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="p-3 tabular-nums">{c.code}</td>
                      <td className="p-3">{c.name}</td>
                      <td className="p-3 text-muted-foreground">{c.division || '—'}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeCostCode(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!costCodes.length && (
                    <tr>
                      <td className="p-6 text-center text-muted-foreground" colSpan={4}>
                        No cost codes yet — load the standard set to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
