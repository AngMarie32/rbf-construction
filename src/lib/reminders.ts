import { supabase } from '@/integrations/supabase/client';

/**
 * Smart reminders computed from existing data. The same rules run in the
 * `send-reminders` edge function for the daily email; keep them in sync.
 */
export type ReminderKind = 'invoice_overdue' | 'insurance_expiring' | 'insurance_expired' | 'cost_spike' | 'inspection_soon' | 'permit_expiring';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  severity: 'high' | 'medium';
  title: string;
  detail: string;
  to: string;
}

export const REMINDER_RULES = {
  invoiceOverdueDays: 30,
  insuranceWarningDays: 14,
  costSpikePct: 10,
  costSpikeWindowDays: 7,
  permitWarningDays: 14,
};

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export async function fetchReminders(today = new Date()): Promise<Reminder[]> {
  const out: Reminder[] = [];
  const overdueCutoff = iso(new Date(today.getTime() - REMINDER_RULES.invoiceOverdueDays * DAY));
  const insuranceCutoff = iso(new Date(today.getTime() + REMINDER_RULES.insuranceWarningDays * DAY));
  const weekStart = iso(new Date(today.getTime() - REMINDER_RULES.costSpikeWindowDays * DAY));

  const tomorrow = iso(new Date(today.getTime() + DAY));
  const permitCutoff = iso(new Date(today.getTime() + REMINDER_RULES.permitWarningDays * DAY));
  const [billingRes, subsRes, projectsRes, expensesRes, inspectionsRes, permitsRes] = await Promise.all([
    supabase
      .from('project_billing')
      .select('id, project_id, invoice_number, billed_amount, paid_amount, due_date')
      .not('due_date', 'is', null)
      .lte('due_date', overdueCutoff),
    supabase
      .from('subcontractors')
      .select('id, name, company, insurance_expiry')
      .not('insurance_expiry', 'is', null)
      .lte('insurance_expiry', insuranceCutoff),
    supabase.from('projects').select('id, name, status').is('archived_at', null),
    supabase.from('expenses').select('project_id, amount, date'),
    (supabase as any)
      .from('permit_inspections')
      .select('id, inspection_type, scheduled_date, scheduled_time, result, permits(permit_type, permit_number, project_id)')
      .eq('result', 'Scheduled')
      .gte('scheduled_date', iso(today))
      .lte('scheduled_date', tomorrow),
    (supabase as any)
      .from('permits')
      .select('id, project_id, permit_type, permit_number, expiration_date, status')
      .not('expiration_date', 'is', null)
      .lte('expiration_date', permitCutoff)
      .gte('expiration_date', iso(today)),
  ]);

  const projectName: Record<string, string> = {};
  const openProject = new Set<string>();
  (projectsRes.data || []).forEach((p) => {
    projectName[p.id] = p.name;
    if (p.status !== 'Completed' && p.status !== 'Closed') openProject.add(p.id);
  });

  // 1) Invoices unpaid 30+ days past due
  (billingRes.data || []).forEach((b) => {
    if (!projectName[b.project_id]) return; // archived or deleted job
    const owed = (b.billed_amount || 0) - (b.paid_amount || 0);
    if (owed <= 0.005 || !b.due_date) return;
    const days = Math.floor((today.getTime() - new Date(b.due_date).getTime()) / DAY);
    if (days < REMINDER_RULES.invoiceOverdueDays) return;
    out.push({
      id: `inv-${b.id}`,
      kind: 'invoice_overdue',
      severity: 'high',
      title: `${money(owed)} overdue ${days} days`,
      detail: `${b.invoice_number ? `Invoice ${b.invoice_number} · ` : ''}${projectName[b.project_id] || 'Unknown project'}`,
      to: `/billing?project=${b.project_id}`,
    });
  });

  // 2) Subcontractor insurance expired or expiring within 2 weeks
  (subsRes.data || []).forEach((s) => {
    if (!s.insurance_expiry) return;
    const days = Math.ceil((new Date(s.insurance_expiry).getTime() - today.getTime()) / DAY);
    if (days > REMINDER_RULES.insuranceWarningDays) return;
    const who = s.company || s.name;
    out.push(
      days < 0
        ? { id: `ins-${s.id}`, kind: 'insurance_expired', severity: 'high', title: `${who}: insurance expired`, detail: `Expired ${-days} day${days === -1 ? '' : 's'} ago. Get a new certificate before they work.`, to: '/subcontractors' }
        : { id: `ins-${s.id}`, kind: 'insurance_expiring', severity: 'medium', title: `${who}: insurance expires in ${days} day${days === 1 ? '' : 's'}`, detail: 'Ask for an updated certificate of insurance.', to: '/subcontractors' }
    );
  });

  // 3) Permit inspections today or tomorrow
  (inspectionsRes.data || []).forEach((i) => {
    const pj = (i.permits as unknown as { project_id?: string } | null)?.project_id;
    if (!pj || !projectName[pj]) return; // archived or deleted job
    const pm = i.permits as unknown as { permit_type: string; permit_number: string | null; project_id: string } | null;
    const isToday = i.scheduled_date === iso(today);
    out.push({
      id: `insp-${i.id}`,
      kind: 'inspection_soon',
      severity: isToday ? 'high' : 'medium',
      title: `${i.inspection_type} inspection ${isToday ? 'today' : 'tomorrow'}${i.scheduled_time ? ` (${i.scheduled_time})` : ''}`,
      detail: `${pm ? projectName[pm.project_id] || 'Unknown job' : 'Unknown job'}${pm ? ` · ${pm.permit_type} permit${pm.permit_number ? ` #${pm.permit_number}` : ''}` : ''}`,
      to: pm ? `/permits?project=${pm.project_id}` : '/permits',
    });
  });

  // 4) Permits expiring within 2 weeks
  (permitsRes.data || []).forEach((p) => {
    if (!projectName[p.project_id]) return; // archived or deleted job
    if (!p.expiration_date || ['Expired', 'Rejected'].includes(p.status)) return;
    const days = Math.ceil((new Date(p.expiration_date).getTime() - today.getTime()) / DAY);
    if (days < 0 || days > REMINDER_RULES.permitWarningDays) return;
    out.push({
      id: `permit-${p.id}`,
      kind: 'permit_expiring',
      severity: days <= 3 ? 'high' : 'medium',
      title: `${p.permit_type} permit expires in ${days} day${days === 1 ? '' : 's'}`,
      detail: `${projectName[p.project_id] || 'Unknown job'}${p.permit_number ? ` · #${p.permit_number}` : ''}. Renew or request an extension.`,
      to: `/permits?project=${p.project_id}`,
    });
  });

  // 5) Job costs jumped more than 10% in the last 7 days
  const before: Record<string, number> = {};
  const week: Record<string, number> = {};
  (expensesRes.data || []).forEach((e) => {
    if (!openProject.has(e.project_id)) return;
    if (e.date >= weekStart) week[e.project_id] = (week[e.project_id] || 0) + (e.amount || 0);
    else before[e.project_id] = (before[e.project_id] || 0) + (e.amount || 0);
  });
  Object.keys(week).forEach((pid) => {
    const prior = before[pid] || 0;
    if (prior <= 0) return;
    const pct = (week[pid] / prior) * 100;
    if (pct > REMINDER_RULES.costSpikePct) {
      out.push({
        id: `cost-${pid}`,
        kind: 'cost_spike',
        severity: pct > 25 ? 'high' : 'medium',
        title: `${projectName[pid] || 'A job'}: costs up ${pct.toFixed(0)}% this week`,
        detail: `${money(week[pid])} added in the last 7 days on top of ${money(prior)}.`,
        to: `/projects/${pid}?tab=expenses`,
      });
    }
  });

  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1));
}
