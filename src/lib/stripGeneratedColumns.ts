import { supabase } from '@/integrations/supabase/client';

/**
 * Columns the database calculates itself (GENERATED ALWAYS). Writing one fails with
 * `column "x" can only be updated to DEFAULT`, so they are removed from every insert,
 * update and upsert before the request is sent. Source: information_schema.columns
 * where is_generated = 'ALWAYS' in the live database.
 */
export const GENERATED_COLUMNS: Record<string, string[]> = {
  sov_items: ['total_completed_and_stored'],
  project_billing: ['remaining_amount'],
  bid_items: ['total'],
  billing_line_items: ['total_amount'],
  budget_variances: ['variance_amount', 'variance_percentage'],
  payment_applications: ['contract_sum_to_date', 'total_earned_less_retainage', 'current_payment_due', 'balance_to_finish'],
  time_entries: ['total_cost'],
};

const strip = (cols: string[], v: unknown): unknown => {
  if (Array.isArray(v)) return v.map((r) => strip(cols, r));
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = { ...(v as Record<string, unknown>) };
    cols.forEach((c) => delete out[c]);
    return out;
  }
  return v;
};

let installed = false;
/** Wraps supabase.from() once so every write to the tables above skips their calculated columns. */
export function installGeneratedColumnGuard() {
  if (installed) return;
  installed = true;
  const client = supabase as any;
  const original = client.from.bind(client);
  client.from = (table: string) => {
    const qb = original(table);
    const cols = GENERATED_COLUMNS[table];
    if (!cols) return qb;
    for (const m of ['insert', 'update', 'upsert'] as const) {
      const fn = qb[m]?.bind(qb);
      if (fn) qb[m] = (values: unknown, ...rest: unknown[]) => fn(strip(cols, values), ...rest);
    }
    return qb;
  };
}

installGeneratedColumnGuard();
