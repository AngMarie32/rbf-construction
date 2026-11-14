import { writeSkippingGenerated } from '@/lib/generatedColumns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSignature, Loader2, Lock, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHero } from '@/components/ui/page-hero';
import { ExportMenu } from '@/components/ui/export-menu';
import { SignaturePad } from '@/components/esign/SignaturePad';
import { LienWaiverDialog } from '@/components/payment-applications/LienWaiverDialog';
import { cn } from '@/lib/utils';
import { localDateISO } from '@/utils/dates';
import {
  lineBalance,
  lineCompleted,
  lineContract,
  lineOverbilled,
  linePercent,
  payAppTotals,
  type PayAppLine,
} from '@/utils/paymentAppMath';
import { fmtISO, generateG702, generateG703, generatePayAppPackage, type PayAppDoc } from '@/utils/aiaPdf';

const money = (n: number) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const money0 = (n: number) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const num = (v: string) => {
  const n = parseFloat(v.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/**
 * What each line carries out of an earlier application: previous + this period, and stored materials.
 * Lines are matched by id, then item number, then description, so a rebuilt Schedule of Values still lines up.
 */
function carryFrom(prior: PayAppLine[] | null, line: { id: string; itemNumber?: string; description?: string }) {
  if (!prior?.length) return null;
  const hit =
    prior.find((p) => p.id === line.id) ||
    (line.itemNumber ? prior.find((p) => norm(p.itemNumber) === norm(line.itemNumber) && norm(p.description) === norm(line.description)) : undefined) ||
    (line.itemNumber ? prior.find((p) => norm(p.itemNumber) === norm(line.itemNumber)) : undefined) ||
    prior.find((p) => norm(p.description) && norm(p.description) === norm(line.description));
  return hit ? { previous: r2((Number(hit.previous) || 0) + (Number(hit.thisPeriod) || 0)), stored: Number(hit.stored) || 0 } : null;
}
/** Work billed before this application, from the saved totals or (if blank) from the certificates paid. */
function earlierBilledOf(prior: any, certified: number, retainPct: number) {
  const fromLines = Array.isArray(prior?.line_items)
    ? (prior.line_items as PayAppLine[]).reduce((a, l) => a + (Number(l.previous) || 0) + (Number(l.thisPeriod) || 0) + (Number(l.stored) || 0), 0)
    : 0;
  const fromTotal = Number(prior?.total_completed_and_stored) || 0;
  const fromCerts = certified > 0 ? certified / Math.max(0.01, 1 - (Number(retainPct) || 0) / 100) : 0;
  return Math.max(fromLines, fromTotal, fromCerts);
}
const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return localDateISO(new Date(y, m - 1, d + days));
};

interface Form {
  applicationNumber: number;
  periodFrom: string;
  periodTo: string;
  applicationDate: string;
  contractDate: string;
  projectNumber: string;
  ownerName: string;
  architectName: string;
  architectProjectNo: string;
  contractorName: string;
  contractorAddress: string;
  signatory: string;
  signatoryTitle: string;
  signature: string | null;
  retainageWorkPct: number;
  retainageStoredPct: number;
}

// Columns added by 20261113120000_payment_app_details.sql; saved only when the database has them.
const DETAIL_COLUMNS = [
  'period_from',
  'application_date',
  'contract_date',
  'owner_name',
  'architect_name',
  'architect_project_no',
  'contractor_signatory',
  'contractor_title',
  'retainage_percentage',
  'retainage_stored_percentage',
  'line_items',
];

const isMissingColumn = (e: any) => e && (e.code === 'PGRST204' || /column/i.test(e.message || '') || /schema cache/i.test(e.message || ''));

/** Money input that keeps what you type and commits on blur/Enter. */
function MoneyCell({ value, onCommit, disabled, invalid }: { value: number; onCommit: (n: number) => void; disabled?: boolean; invalid?: boolean }) {
  const [text, setText] = useState(value ? String(r2(value)) : '');
  useEffect(() => setText(value ? String(r2(value)) : ''), [value]);
  return (
    <Input
      inputMode="decimal"
      disabled={disabled}
      value={text}
      placeholder="0.00"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(r2(num(text)))}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={cn('h-8 w-28 text-right tabular-nums', invalid && 'border-rose-500 focus-visible:ring-rose-500')}
    />
  );
}

export function PaymentApplicationEditor({ projectId, applicationId }: { projectId: string; applicationId?: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [app, setApp] = useState<any>(null);
  const [otherNumbers, setOtherNumbers] = useState<number[]>([]);
  const [lines, setLines] = useState<PayAppLine[]>([]);
  const [previousCertificates, setPreviousCertificates] = useState(0);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  // Set when earlier applications billed more than the lines carry forward (older apps saved without line history).
  const [carryGap, setCarryGap] = useState(0);
  // Saved latest application whose Previous doesn't match the application before it.
  const [pullFrom, setPullFrom] = useState<{ number: number; lines: PayAppLine[] } | null>(null);
  const [mode, setMode] = useState<{ editableLines: boolean; reason?: string; legacy?: boolean }>({ editableLines: true });
  const [signOpen, setSignOpen] = useState(false);
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const autoExport = useRef<string | null>(null);
  const [form, setForm] = useState<Form>({
    applicationNumber: 1,
    periodFrom: '',
    periodTo: localDateISO(),
    applicationDate: localDateISO(),
    contractDate: '',
    projectNumber: '',
    ownerName: '',
    architectName: '',
    architectProjectNo: '',
    contractorName: '',
    contractorAddress: '',
    signatory: '',
    signatoryTitle: '',
    signature: null,
    retainageWorkPct: 10,
    retainageStoredPct: 10,
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: proj }, { data: sov }, { data: apps }, { data: cos }, { data: settings }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('sov_items').select('*').eq('project_id', projectId).order('item_number'),
      supabase.from('payment_applications_g702').select('*').eq('project_id', projectId).order('application_number'),
      supabase.from('change_orders').select('*').eq('project_id', projectId).eq('status', 'Approved').order('number'),
      supabase.from('company_settings').select('*').limit(1).maybeSingle(),
    ]);
    setProject(proj);
    setChangeOrders(cos || []);
    const all = (apps || []) as any[];
    const current = applicationId ? all.find((a) => a.id === applicationId) : null;
    // Latest application by number (don't rely on list order).
    const last = all.reduce((m: any, a: any) => (!m || Number(a.application_number) > Number(m.application_number) ? a : m), null as any);
    const fromSov = (s: any): PayAppLine => ({
      id: s.id,
      itemNumber: s.item_number,
      description: s.description,
      category: s.category,
      scheduledValue: Number(s.scheduled_value) || 0,
      changeOrders: Number(s.change_orders) || 0,
      previous: Number(s.previous_applications) || 0,
      thisPeriod: 0,
      stored: Number(s.materials_stored) || 0,
    });

    setCarryGap(0);
    setPullFrom(null);
    if (current) {
      const isLatest = current.application_number === Math.max(...all.map((a) => a.application_number));
      const snapshot = Array.isArray(current.line_items) ? (current.line_items as PayAppLine[]) : null;
      if (snapshot) {
        const known = new Set(snapshot.map((l) => l.id));
        // Lines added to the SOV after this application was saved (only matter on the latest one)
        const added = isLatest ? (sov || []).filter((s: any) => !known.has(s.id)).map(fromSov) : [];
        setLines([...snapshot.map((l) => ({ ...l })), ...added]);
      } else {
        // Saved before line history existed: the SOV already includes this application's work.
        setLines((sov || []).map(fromSov));
      }
      const paid = current.payment_status === 'paid';
      setMode(
        !snapshot
          ? { editableLines: false, legacy: true, reason: "This application was saved before line-by-line history was kept, so its lines show today's Schedule of Values and can't be changed here. Header details, signature and PDFs still work." }
          : !isLatest
            ? { editableLines: false, reason: 'A later application exists, so the billed amounts on this one are locked. Changing them would throw off every application after it.' }
            : paid
              ? { editableLines: false, reason: 'This application is marked paid, so its billed amounts are locked.' }
              : { editableLines: true }
      );
      const certified = all.filter((a) => a.application_number < current.application_number).reduce((s, a) => s + (Number(a.current_payment_due) || 0), 0);
      setPreviousCertificates(certified);
      if (snapshot && isLatest && current.payment_status !== 'paid') {
        const prior = all
          .filter((a) => a.application_number < current.application_number)
          .reduce((m: any, a: any) => (!m || a.application_number > m.application_number ? a : m), null as any);
        if (prior) {
          const priorLines = Array.isArray(prior.line_items) ? (prior.line_items as PayAppLine[]) : null;
          const prevNow = snapshot.reduce((a, l) => a + (Number(l.previous) || 0), 0);
          const fixed = snapshot.map((l) => {
            const c = carryFrom(priorLines, l);
            return c ? { ...l, previous: c.previous } : l;
          });
          const prevFixed = fixed.reduce((a, l) => a + l.previous, 0);
          if (priorLines && prevFixed > prevNow + 0.5) setPullFrom({ number: prior.application_number, lines: fixed });
          const billedBefore = earlierBilledOf(prior, certified, Number(current.retainage_percentage ?? 10));
          if (billedBefore > Math.max(prevNow, prevFixed) + 0.5) setCarryGap(billedBefore);
        }
      }
      setOtherNumbers(all.filter((a) => a.id !== current.id).map((a) => a.application_number));
      setForm({
        applicationNumber: current.application_number,
        periodFrom: current.period_from || '',
        periodTo: current.period_to?.slice(0, 10) || localDateISO(),
        applicationDate: current.application_date || current.period_to?.slice(0, 10) || localDateISO(),
        contractDate: current.contract_date || '',
        projectNumber: current.project_number || proj?.project_code || '',
        ownerName: current.owner_name || proj?.client || '',
        architectName: current.architect_name || '',
        architectProjectNo: current.architect_project_no || '',
        contractorName: current.contractor_name || settings?.company_name || '',
        contractorAddress: current.contractor_address || settings?.company_address || '',
        signatory: current.contractor_signatory || '',
        signatoryTitle: current.contractor_title || '',
        signature: current.contractor_signature || null,
        retainageWorkPct: Number(current.retainage_percentage ?? settings?.default_retainage_rate ?? 10),
        retainageStoredPct: Number(current.retainage_stored_percentage ?? current.retainage_percentage ?? settings?.default_retainage_rate ?? 10),
      });
      setApp(current);
    } else {
      // A new application starts where the last one ended. The last application's saved lines are the
      // source of truth (previous + this period, stored materials carried); the Schedule of Values is the
      // fallback for lines it doesn't cover or applications saved before line history was kept.
      const lastSnap = Array.isArray(last?.line_items) ? (last.line_items as PayAppLine[]) : null;
      const carried = (sov || []).map((s: any) => {
        const base = fromSov(s);
        const c = carryFrom(lastSnap, base);
        return c ? { ...base, previous: Math.max(base.previous, c.previous), stored: c.stored } : base;
      });
      setLines(carried);
      const certifiedAll = all.reduce((s, a) => s + (Number(a.current_payment_due) || 0), 0);
      const earlierBilled = last ? earlierBilledOf(last, certifiedAll, Number(last.retainage_percentage ?? 10)) : 0;
      const carriedTotal = carried.reduce((a, l) => a + l.previous + l.stored, 0);
      setCarryGap(!!last && earlierBilled > 0 && carriedTotal + 0.5 < earlierBilled ? earlierBilled : 0);
      setMode({ editableLines: true });
      setPreviousCertificates(all.reduce((s, a) => s + (Number(a.current_payment_due) || 0), 0));
      setOtherNumbers(all.map((a) => a.application_number));
      const retain = Number(last?.retainage_percentage ?? settings?.default_retainage_rate ?? 10);
      setForm((f) => ({
        ...f,
        applicationNumber: (last?.application_number || 0) + 1,
        periodFrom: last?.period_to ? addDays(last.period_to, 1) : '',
        // "Period to" can't be before "Period from" (e.g. the last application ended today).
        periodTo: last?.period_to && addDays(last.period_to, 1) > localDateISO() ? addDays(last.period_to, 1) : localDateISO(),
        applicationDate: localDateISO(),
        contractDate: last?.contract_date || '',
        projectNumber: last?.project_number || proj?.project_code || '',
        ownerName: last?.owner_name || proj?.client || '',
        architectName: last?.architect_name || '',
        architectProjectNo: last?.architect_project_no || '',
        contractorName: last?.contractor_name || settings?.company_name || '',
        contractorAddress: last?.contractor_address || settings?.company_address || '',
        signatory: last?.contractor_signatory || '',
        signatoryTitle: last?.contractor_title || '',
        signature: null,
        retainageWorkPct: retain,
        retainageStoredPct: Number(last?.retainage_stored_percentage ?? retain),
      }));
      setApp(null);
    }
    setDirty(false);
    setLoading(false);
  }, [projectId, applicationId]);

  useEffect(() => {
    load();
    const p = new URLSearchParams(window.location.search);
    autoExport.current = p.get('export') || (p.get('print') === '1' ? p.get('doc') || 'g702' : null);
  }, [load]);

  const settings = useMemo(
    () => ({
      retainageWorkPct: form.retainageWorkPct,
      retainageStoredPct: form.retainageStoredPct,
      originalContractSum: Number(project?.original_contract_sum || project?.contract_value) || 0,
      previousCertificates,
    }),
    [form.retainageWorkPct, form.retainageStoredPct, project, previousCertificates]
  );
  const totals = useMemo(() => payAppTotals(lines, settings), [lines, settings]);
  const overbilled = lines.filter(lineOverbilled);
  const duplicateNumber = otherNumbers.includes(form.applicationNumber);
  const missingCOs = changeOrders.filter((co) => !lines.some((l) => l.itemNumber === `CO-${co.number}`));

  const docData = (): PayAppDoc => ({
    applicationNumber: form.applicationNumber,
    periodFrom: form.periodFrom || null,
    periodTo: form.periodTo,
    applicationDate: form.applicationDate,
    contractDate: form.contractDate || null,
    projectNumber: form.projectNumber,
    architectProjectNo: form.architectProjectNo,
    project: { name: project?.name || 'Project', address: project?.address, client: project?.client },
    ownerName: form.ownerName,
    architectName: form.architectName,
    contractorName: form.contractorName,
    contractorAddress: form.contractorAddress,
    signatory: form.signatory,
    signatoryTitle: form.signatoryTitle,
    signature: form.signature,
    signedDate: form.signature ? form.applicationDate : null,
    lines,
    settings,
    contingency: (() => {
      const v = Number(project?.contingency_value) || 0;
      return project?.contingency_type === 'percentage' ? (totals.scheduled * v) / 100 : v;
    })(),
  });

  // Opened from the list with ?export=g702|g703|package: download once loaded.
  useEffect(() => {
    if (loading || !project || !autoExport.current) return;
    const kind = autoExport.current;
    autoExport.current = null;
    const run = kind === 'g703' ? generateG703 : kind === 'package' ? generatePayAppPackage : generateG702;
    run(docData()).then(() => toast.success('PDF downloaded'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, project]);

  const updateLine = (id: string, patch: Partial<PayAppLine>) => {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setDirty(true);
  };

  const billToPercent = (l: PayAppLine, pct: number) => {
    const target = (lineContract(l) * Math.max(0, Math.min(100, pct))) / 100;
    updateLine(l.id, { thisPeriod: r2(Math.max(0, target - l.previous - l.stored)) });
  };

  const addChangeOrder = (co: any) => {
    setLines((ls) => [
      ...ls,
      {
        id: `new-${co.id}`,
        itemNumber: `CO-${co.number}`,
        description: `Change Order ${co.number}: ${co.description}`,
        category: 'Change Orders',
        scheduledValue: 0,
        changeOrders: Number(co.amount) || 0,
        previous: 0,
        thisPeriod: 0,
        stored: 0,
      },
    ]);
    setDirty(true);
  };

  const save = async () => {
    if (!form.periodTo) return toast.error('Enter the "period to" date.');
    if (duplicateNumber) return toast.error(`Application #${form.applicationNumber} already exists for this project. Pick another number.`);
    if (!lines.length) return toast.error('This project has no Schedule of Values lines to bill. Set them up first.');
    setSaving(true);
    try {
      // 1) Change-order lines added here become real SOV lines first
      let saved = [...lines];
      for (const l of saved.filter((x) => x.id.startsWith('new-'))) {
        const { data, error } = await supabase
          .from('sov_items')
          .insert({
            project_id: projectId,
            item_number: l.itemNumber,
            description: l.description,
            category: l.category || 'Change Orders',
            scheduled_value: 0,
            change_orders: l.changeOrders,
            previous_applications: 0,
            this_period: 0,
            materials_stored: 0,
            retainage_percentage: form.retainageWorkPct,
          })
          .select('id')
          .single();
        if (error) throw error;
        saved = saved.map((x) => (x.id === l.id ? { ...x, id: data.id } : x));
      }
      const t = payAppTotals(saved, settings);

      // 2) The application itself
      const base: Record<string, any> = {
        project_id: projectId,
        application_number: form.applicationNumber,
        period_to: form.periodTo,
        contractor_name: form.contractorName || 'Contractor',
        contractor_address: form.contractorAddress || null,
        contractor_signature: form.signature,
        contractor_date: form.signature ? form.applicationDate : null,
        project_name: project?.name || 'Project',
        project_number: form.projectNumber || null,
        original_contract_sum: t.originalContractSum,
        net_change_by_change_orders: t.netChangeOrders,
        contract_sum_to_date: t.contractSumToDate,
        total_completed_and_stored: t.completedAndStored,
        retainage_completed_work: t.retainageWork,
        retainage_stored_materials: t.retainageStored,
        total_retainage: t.totalRetainage,
        total_earned_less_retainage: t.earnedLessRetainage,
        less_previous_certificates: t.lessPrevious,
        current_payment_due: t.currentPaymentDue,
        balance_to_finish: t.balanceToFinish,
      };
      const details: Record<string, any> = {
        period_from: form.periodFrom || null,
        application_date: form.applicationDate || null,
        contract_date: form.contractDate || null,
        owner_name: form.ownerName || null,
        architect_name: form.architectName || null,
        architect_project_no: form.architectProjectNo || null,
        contractor_signatory: form.signatory || null,
        contractor_title: form.signatoryTitle || null,
        retainage_percentage: form.retainageWorkPct,
        retainage_stored_percentage: form.retainageStoredPct,
        ...(mode.editableLines ? { line_items: saved } : {}),
      };
      const writeOnce = (row: Record<string, any>) =>
        app
          ? supabase.from('payment_applications_g702').update(row).eq('id', app.id).select('id').single()
          : supabase.from('payment_applications_g702').insert(row as any).select('id').single();
      // Columns the database calculates itself are left out automatically.
      const write = (row: Record<string, any>) => writeSkippingGenerated(row, writeOnce);
      let res = await write({ ...base, ...details });
      let detailsSkipped = false;
      if (res.error && isMissingColumn(res.error)) {
        detailsSkipped = true;
        res = await write(base);
      }
      if (res.error) throw res.error;

      // 3) Roll this period into the Schedule of Values (only when the lines could be edited)
      if (mode.editableLines) {
        for (const l of saved) {
          const previous = r2(l.previous + l.thisPeriod);
          const completed = previous + l.stored;
          const contract = lineContract(l);
          const { error } = await writeSkippingGenerated(
            {
              previous_applications: previous,
              this_period: 0,
              materials_stored: l.stored,
              total_completed_and_stored: completed,
              percent_complete: contract > 0 ? Math.min(100, (completed / contract) * 100) : 0,
            },
            (row) => supabase.from('sov_items').update(row).eq('id', l.id)
          );
          if (error) throw error;
        }
      }

      if (detailsSkipped) {
        toast.warning(
          `Application saved. Dates, retainage and line history weren't stored because the database needs the "payment app details" update (${DETAIL_COLUMNS.length} new columns).`,
          { duration: 9000 }
        );
      } else {
        toast.success(app ? `Application #${form.applicationNumber} updated` : `Application #${form.applicationNumber} saved`);
      }
      setDirty(false);
      if (!app && res.data?.id) navigate(`/payment-applications/edit/${projectId}/${res.data.id}`, { replace: true });
      else load();
    } catch (e: any) {
      console.error(e);
      toast.error(`Couldn't save the application: ${e.message || 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!project) return <p className="py-10 text-center text-muted-foreground">Project not found.</p>;

  const field = (label: string, k: keyof Form, type = 'text', placeholder = '') => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={(form[k] as any) ?? ''}
        placeholder={placeholder}
        onChange={(e) => set(k, (type === 'number' ? Number(e.target.value) : e.target.value) as any)}
        className="mt-1 h-9"
      />
    </div>
  );

  const exportOptions = [
    { label: 'G702 + G703 (one PDF)', hint: 'Application and continuation sheet, landscape', format: 'pdf' as const, onSelect: () => generatePayAppPackage(docData()) },
    { label: 'G702 Application (PDF)', hint: 'One page, landscape', format: 'pdf' as const, onSelect: () => generateG702(docData()) },
    { label: 'G703 Continuation sheet (PDF)', hint: 'All lines, landscape', format: 'pdf' as const, onSelect: () => generateG703(docData()) },
    {
      label: 'Lien waiver…',
      hint: app ? 'Conditional or unconditional, for this payment' : 'Save the application first',
      format: 'pdf' as const,
      disabled: !app,
      onSelect: () => setWaiverOpen(true),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={app ? 'Edit payment application' : 'New payment application'}
        title={`Application #${form.applicationNumber}`}
        subtitle={[project.name, project.client, form.periodTo && `Period to ${fmtISO(form.periodTo)}`].filter(Boolean).join(' · ')}
        actions={
          <>
            <Link
              to={`/payment-applications?project=${projectId}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-medium text-white ring-1 ring-inset ring-white/15 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" /> All applications
            </Link>
            <ExportMenu variant="hero" options={exportOptions} />
          </>
        }
        stats={[
          { label: 'Current payment due', value: money0(totals.currentPaymentDue), tone: totals.currentPaymentDue < 0 ? 'bad' : 'good' },
          { label: 'Completed to date', value: `${totals.percentComplete.toFixed(0)}%` },
          { label: 'Retainage held', value: money0(totals.totalRetainage) },
        ]}
      />

      {(mode.reason || carryGap > 0 || !!pullFrom || overbilled.length > 0 || totals.sovMismatch || duplicateNumber || totals.currentPaymentDue < 0) && (
        <div className="space-y-2">
          {mode.reason && (
            <Notice icon={Lock} tone="slate">
              {mode.reason}
            </Notice>
          )}
          {pullFrom && mode.editableLines && (
            <Notice tone="rose">
              <span className="flex flex-wrap items-center gap-3">
                <span className="flex-1">
                  The Previous column doesn't match what Application #{pullFrom.number} billed. Pull it over so this application continues where #{pullFrom.number} ended.
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setLines(pullFrom.lines.map((l) => ({ ...l })));
                    setPullFrom(null);
                    setCarryGap(0);
                    setDirty(true);
                  }}
                >
                  Use Application #{pullFrom.number}'s amounts
                </Button>
              </span>
            </Notice>
          )}
          {carryGap > 0 && !pullFrom && (
            <Notice tone="rose">
              Earlier applications billed about {money(carryGap)} to date, but only {money(lines.reduce((a, l) => a + l.previous + l.stored, 0))} carried into "Previous" on these lines. Those applications were saved before line-by-line history was kept. Enter each line's previous amount in the Previous column (it's editable here) so this application continues from the last one.
            </Notice>
          )}
                    {duplicateNumber && <Notice tone="rose">Application #{form.applicationNumber} already exists for this project. Change the number before saving.</Notice>}
          {overbilled.length > 0 && (
            <Notice tone="rose">
              {overbilled.length} line{overbilled.length === 1 ? ' is' : 's are'} billed past 100% ({overbilled.map((l) => l.itemNumber).join(', ')}). Lower "this period" or
              "stored" on {overbilled.length === 1 ? 'it' : 'them'}.
            </Notice>
          )}
          {totals.currentPaymentDue < 0 && <Notice tone="amber">The current payment due is negative: earlier certificates are higher than what is earned to date.</Notice>}
          {totals.sovMismatch && (
            <Notice tone="amber">
              The Schedule of Values adds up to {money(totals.scheduled)}, but the project's contract sum is {money(settings.originalContractSum)}. Line 1 uses the
              contract sum.{' '}
              <Link className="underline" to={`/schedule-of-values?project=${projectId}`}>
                Review the Schedule of Values
              </Link>
            </Notice>
          )}
        </div>
      )}

      <div className="grid gap-6 2xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* 1. Details */}
          <Section n={1} title="Application details" hint="Shown at the top of the G702 and G703.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {field('Application no.', 'applicationNumber', 'number')}
              {field('Period from', 'periodFrom', 'date')}
              {field('Period to *', 'periodTo', 'date')}
              {field('Application date', 'applicationDate', 'date')}
              {field('Contract date', 'contractDate', 'date')}
              {field('Project no.', 'projectNumber')}
              {field('Retainage on work %', 'retainageWorkPct', 'number')}
              {field('Retainage on stored %', 'retainageStoredPct', 'number')}
              {field('Owner', 'ownerName')}
              {field('Architect', 'architectName', 'text', 'Optional')}
              {field("Architect's project no.", 'architectProjectNo', 'text', 'Optional')}
              {field('Contractor', 'contractorName')}
              <div className="sm:col-span-2 lg:col-span-4">{field('Contractor address', 'contractorAddress')}</div>
            </div>
          </Section>

          {/* 2. Lines */}
          <Section
            n={2}
            title="Bill this period"
            hint="Enter the work done this period (E) and materials on site (F). Type a % to bill a line up to that point."
            actions={
              mode.editableLines && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLines((ls) => ls.map((l) => ({ ...l, thisPeriod: r2(Math.max(0, lineContract(l) - l.previous - l.stored)) })));
                      setDirty(true);
                    }}
                  >
                    Bill all remaining
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLines((ls) => ls.map((l) => ({ ...l, thisPeriod: 0 })));
                      setDirty(true);
                    }}
                  >
                    Clear this period
                  </Button>
                </div>
              )
            }
          >
            {lines.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No Schedule of Values lines yet.{' '}
                <Link className="font-medium text-foreground underline" to={`/schedule-of-values?project=${projectId}`}>
                  Set up the Schedule of Values
                </Link>{' '}
                first.
              </div>
            ) : (
              <div className="-mx-5 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Item / description</th>
                      <th className="px-3 py-2 text-right font-medium">C · Scheduled</th>
                      <th className="px-3 py-2 text-right font-medium">D · Previous</th>
                      <th className="px-3 py-2 text-right font-medium">E · This period</th>
                      <th className="px-3 py-2 text-right font-medium">F · Stored</th>
                      <th className="px-3 py-2 text-right font-medium">G · To date</th>
                      <th className="px-3 py-2 text-right font-medium">%</th>
                      <th className="px-3 py-2 text-right font-medium">H · Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lines.map((l) => {
                      const over = lineOverbilled(l);
                      const pct = linePercent(l);
                      return (
                        <tr key={l.id} className={cn('align-middle', over && 'bg-rose-500/5')}>
                          <td className="max-w-[260px] px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{l.itemNumber}</span>
                              {l.id.startsWith('new-') && (
                                <span className="rounded bg-orange-500/10 px-1.5 text-[10px] font-semibold uppercase text-orange-600 dark:text-orange-400">New</span>
                              )}
                            </div>
                            <p className="truncate font-medium">{l.description}</p>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {money(lineContract(l))}
                            {l.changeOrders ? <p className="text-[11px] text-muted-foreground">incl. {money(l.changeOrders)} CO</p> : null}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {carryGap > 0 && mode.editableLines ? (
                              <div className="flex justify-end">
                                <MoneyCell value={l.previous} onCommit={(n) => updateLine(l.id, { previous: n })} />
                              </div>
                            ) : (
                              money(l.previous)
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end">
                              <MoneyCell value={l.thisPeriod} disabled={!mode.editableLines} invalid={over} onCommit={(n) => updateLine(l.id, { thisPeriod: n })} />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end">
                              <MoneyCell value={l.stored} disabled={!mode.editableLines} invalid={over} onCommit={(n) => updateLine(l.id, { stored: n })} />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(lineCompleted(l))}</td>
                          <td className="px-3 py-2 text-right">
                            <PercentCell pct={pct} disabled={!mode.editableLines} onCommit={(p) => billToPercent(l, p)} over={over} />
                          </td>
                          <td className={cn('px-3 py-2 text-right tabular-nums', over ? 'font-semibold text-rose-600 dark:text-rose-400' : '')}>{money(lineBalance(l))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/40 font-semibold">
                      <td className="px-3 py-2">Totals</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(totals.sovTotal)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(lines.reduce((s, l) => s + l.previous, 0))}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-orange-600 dark:text-orange-400">{money(totals.thisPeriod)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(totals.stored)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(totals.completedAndStored)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{(totals.sovTotal ? (totals.completedAndStored / totals.sovTotal) * 100 : 0).toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(totals.sovTotal - totals.completedAndStored)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {mode.editableLines && missingCOs.length > 0 && (
              <div className="mt-4 rounded-lg border border-dashed p-4">
                <p className="text-sm font-medium">Approved change orders not on the Schedule of Values</p>
                <p className="text-xs text-muted-foreground">Add one as its own line so it can be billed. It's saved to the Schedule of Values with this application.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingCOs.map((co) => (
                    <Button key={co.id} variant="outline" size="sm" onClick={() => addChangeOrder(co)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> CO {co.number} · {money0(co.amount)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* 3. Signature */}
          <Section n={3} title="Contractor certification" hint="Signs the G702. You can export unsigned and sign on paper instead.">
            <div className="grid gap-4 sm:grid-cols-2">
              {field('Signed by', 'signatory', 'text', 'Full name')}
              {field('Title', 'signatoryTitle', 'text', 'e.g. President')}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {form.signature ? (
                <>
                  <div className="rounded-lg border bg-white p-2">
                    <img src={form.signature} alt="Contractor signature" className="h-14" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => set('signature', null)}>
                    <X className="mr-1 h-4 w-4" /> Remove
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setSignOpen(true)}>
                  <FileSignature className="mr-2 h-4 w-4" /> Add signature
                </Button>
              )}
              <span className="text-xs text-muted-foreground">Dated {fmtISO(form.applicationDate)} (the application date).</span>
            </div>
          </Section>
        </div>

        {/* G702 summary */}
        <div className="2xl:sticky 2xl:top-20 2xl:self-start">
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/40 px-5 py-3">
              <p className="text-sm font-semibold">G702 summary</p>
              <p className="text-xs text-muted-foreground">Updates as you type</p>
            </div>
            <dl className="divide-y text-sm">
              <SumRow n="1" label="Original contract sum" value={totals.originalContractSum} />
              <SumRow n="2" label="Net change orders" value={totals.netChangeOrders} />
              <SumRow n="3" label="Contract sum to date" value={totals.contractSumToDate} strong />
              <SumRow n="4" label="Completed & stored" value={totals.completedAndStored} strong />
              <SumRow n="5" label={`Retainage (${form.retainageWorkPct}% / ${form.retainageStoredPct}%)`} value={totals.totalRetainage} />
              <SumRow n="6" label="Earned less retainage" value={totals.earnedLessRetainage} />
              <SumRow n="7" label="Less previous certificates" value={totals.lessPrevious} />
              <div className="flex items-center justify-between bg-orange-500/10 px-5 py-3">
                <dt className="text-sm font-semibold">8 · Current payment due</dt>
                <dd className={cn('font-display text-xl font-bold tabular-nums', totals.currentPaymentDue < 0 && 'text-rose-600')}>{money(totals.currentPaymentDue)}</dd>
              </div>
              <SumRow n="9" label="Balance to finish (incl. retainage)" value={totals.balanceToFinish} />
            </dl>
          </Card>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Saving moves this period into "previous" on the Schedule of Values, so the next application starts where this one ends.
          </p>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-30 -mx-4 -mb-6 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:-mx-6 lg:-mx-8">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">
            {dirty ? 'Unsaved changes' : app ? 'All changes saved' : 'Not saved yet'} · This period{' '}
            <span className="font-semibold text-foreground">{money(totals.thisPeriod)}</span> · Due{' '}
            <span className="font-semibold text-foreground">{money(totals.currentPaymentDue)}</span>
          </p>
          <div className="flex gap-2">
            <ExportMenu options={exportOptions} />
            <Button onClick={save} disabled={saving || duplicateNumber} className="bg-orange-500 text-white hover:bg-orange-600">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {app ? 'Save changes' : 'Save application'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Sign the application</DialogTitle>
          </DialogHeader>
          <SignaturePad
            signerName={form.signatory}
            onComplete={(dataUrl) => {
              set('signature', dataUrl);
              setSignOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {app && (
        <LienWaiverDialog
          open={waiverOpen}
          onOpenChange={setWaiverOpen}
          paymentApp={{
            id: app.id,
            application_number: form.applicationNumber,
            project_id: projectId,
            period_to: form.periodTo,
            current_payment_due: Math.max(0, totals.currentPaymentDue),
            project_name: project.name,
            project_address: project.address,
            client: project.client,
          }}
        />
      )}
    </div>
  );
}

function PercentCell({ pct, onCommit, disabled, over }: { pct: number; onCommit: (p: number) => void; disabled?: boolean; over?: boolean }) {
  const [text, setText] = useState(pct.toFixed(0));
  useEffect(() => setText(pct.toFixed(0)), [pct]);
  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        inputMode="decimal"
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const p = num(text);
          if (Math.abs(p - pct) > 0.05) onCommit(p);
          else setText(pct.toFixed(0));
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={cn('h-8 w-16 text-right tabular-nums', over && 'text-rose-600')}
        title="Type a % to bill this line up to that point"
      />
      <span className="text-xs text-muted-foreground">%</span>
    </div>
  );
}

function Section({ n, title, hint, actions, children }: { n: number; title: string; hint?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
          <div>
            <h2 className="font-semibold">{title}</h2>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function SumRow({ n, label, value, strong }: { n: string; label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5">
      <dt className="text-muted-foreground">
        <span className="mr-2 font-mono text-xs">{n}</span>
        {label}
      </dt>
      <dd className={cn('tabular-nums', strong && 'font-semibold text-foreground')}>{money(value)}</dd>
    </div>
  );
}

function Notice({ children, tone, icon: Icon = AlertTriangle }: { children: React.ReactNode; tone: 'rose' | 'amber' | 'slate'; icon?: React.ElementType }) {
  const cls = {
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200',
    slate: 'border-border bg-muted/50 text-foreground',
  }[tone];
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', cls)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
