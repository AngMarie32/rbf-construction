import { supabase } from '@/integrations/supabase/client';

/**
 * Each payment application keeps exactly one Billing entry (project_billing), linked through
 * external_ref = "payapp:<application id>". Saving the application creates or updates it, marking it
 * paid records the payment, and deleting the application deletes the entry.
 */
export const payAppRef = (appId: string) => `payapp:${appId}`;

export interface PayAppForBilling {
  id: string;
  project_id: string;
  application_number: number;
  period_from?: string | null;
  period_to: string;
  application_date?: string | null;
  current_payment_due: number;
  payment_status?: string | null;
  paid_at?: string | null;
}

const day = (v?: string | null) => (v ? String(v).slice(0, 10) : null);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Creates or updates the linked Billing entry. Returns a note when an unlinked Billing entry for the
 * same project and period already exists (likely entered by hand), so the user can avoid counting it twice.
 */
export async function syncPayAppBilling(app: PayAppForBilling): Promise<{ ok: boolean; message?: string; duplicate?: string }> {
  const ref = payAppRef(app.id);
  const periodEnd = day(app.period_to)!;
  const periodStart = day(app.period_from) || periodEnd;
  const invoiceDate = day(app.application_date) || periodEnd;
  const billed = Math.max(0, Math.round((Number(app.current_payment_due) || 0) * 100) / 100);
  const paid = app.payment_status === 'paid';
  const row = {
    project_id: app.project_id,
    billing_period_start: periodStart,
    billing_period_end: periodEnd,
    billed_amount: billed,
    paid_amount: paid ? billed : 0,
    status: paid ? 'Paid' : 'Sent',
    invoice_number: `Pay App #${app.application_number}`,
    invoice_date: invoiceDate,
    due_date: addDays(invoiceDate, 30),
    payment_date: paid ? day(app.paid_at) || invoiceDate : null,
    external_ref: ref,
  };

  const { data: existing, error: findErr } = await supabase.from('project_billing').select('id, paid_amount, notes').eq('external_ref', ref).limit(1);
  if (findErr) return { ok: false, message: findErr.message };

  let duplicate: string | undefined;
  if (!existing?.length) {
    // Same project, overlapping period, not linked to an application: probably entered by hand.
    const { data: others } = await supabase
      .from('project_billing')
      .select('id, invoice_number, billed_amount, billing_period_start, billing_period_end, external_ref')
      .eq('project_id', app.project_id)
      .lte('billing_period_start', periodEnd)
      .gte('billing_period_end', periodStart);
    const manual = (others || []).filter((b: any) => !String(b.external_ref || '').startsWith('payapp:'));
    if (manual.length) {
      duplicate = `${manual.length} Billing entr${manual.length === 1 ? 'y' : 'ies'} for this project and period already exist${manual.length === 1 ? 's' : ''} (${manual
        .map((b: any) => b.invoice_number || `$${Number(b.billed_amount).toLocaleString()}`)
        .join(', ')}). If it's the same invoice, delete the manual one so it isn't counted twice.`;
    }
    const { error } = await supabase.from('project_billing').insert({ ...row, notes: `Created from payment application #${app.application_number}.` } as any);
    if (error) return { ok: false, message: error.message };
  } else {
    // Keep a payment recorded on the Billing page if the application itself isn't marked paid.
    const keepPaid = !paid ? Math.min(Number(existing[0].paid_amount) || 0, billed) : billed;
    const { error } = await supabase
      .from('project_billing')
      .update({ ...row, paid_amount: keepPaid, status: keepPaid >= billed && billed > 0 ? 'Paid' : row.status } as any)
      .eq('id', existing[0].id);
    if (error) return { ok: false, message: error.message };
  }
  return { ok: true, duplicate };
}

/** Deletes the Billing entry linked to a payment application (if any). */
export async function deletePayAppBilling(appId: string) {
  const { error } = await supabase.from('project_billing').delete().eq('external_ref', payAppRef(appId));
  return { ok: !error, message: error?.message };
}

/** Marks the linked Billing entry paid / unpaid to match the application. */
export async function setPayAppBillingPaid(appId: string, paid: boolean, paidAt?: string | null) {
  const { data } = await supabase.from('project_billing').select('id, billed_amount').eq('external_ref', payAppRef(appId)).limit(1);
  if (!data?.length) return { ok: false, missing: true };
  const b = data[0];
  const { error } = await supabase
    .from('project_billing')
    .update({
      paid_amount: paid ? Number(b.billed_amount) || 0 : 0,
      status: paid ? 'Paid' : 'Sent',
      payment_date: paid ? day(paidAt) || day(new Date().toISOString()) : null,
    } as any)
    .eq('id', b.id);
  return { ok: !error, message: error?.message };
}
