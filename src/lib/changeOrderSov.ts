import { supabase } from '@/integrations/supabase/client';

/**
 * An approved change order becomes its own Schedule of Values line ("CO-<number>"), so it shows up
 * on the next payment application to bill (and that application then creates the Billing entry).
 * If the change order is later un-approved and nothing has been billed on its line, the line is removed.
 */
export const coItemNumber = (number: string | number) => `CO-${String(number).trim()}`;
export const isApproved = (status?: string | null) => (status || '').trim().toLowerCase() === 'approved';

export interface CoForSov {
  id?: string;
  project_id: string;
  number: string | number;
  description: string;
  amount: number;
  status?: string | null;
}

export async function syncChangeOrderToSov(co: CoForSov): Promise<{ action: 'added' | 'updated' | 'removed' | 'none'; error?: string }> {
  if (!co.project_id || co.number == null || co.number === '') return { action: 'none' };
  const item = coItemNumber(co.number);
  const { data: rows, error } = await supabase
    .from('sov_items')
    .select('id, previous_applications, this_period, materials_stored, change_orders')
    .eq('project_id', co.project_id)
    .eq('item_number', item)
    .limit(1);
  if (error) return { action: 'none', error: error.message };
  const line = rows?.[0];
  const billed = line ? (Number(line.previous_applications) || 0) + (Number(line.this_period) || 0) + (Number(line.materials_stored) || 0) : 0;

  if (isApproved(co.status)) {
    const amount = Number(co.amount) || 0;
    if (!line) {
      const { error: e } = await supabase.from('sov_items').insert({
        project_id: co.project_id,
        item_number: item,
        description: `Change Order ${co.number}: ${co.description}`,
        category: 'Change Orders',
        scheduled_value: 0,
        change_orders: amount,
        previous_applications: 0,
        this_period: 0,
        materials_stored: 0,
      } as any);
      return e ? { action: 'none', error: e.message } : { action: 'added' };
    }
    if (Number(line.change_orders) !== amount) {
      const { error: e } = await supabase
        .from('sov_items')
        .update({ change_orders: amount, description: `Change Order ${co.number}: ${co.description}` } as any)
        .eq('id', line.id);
      return e ? { action: 'none', error: e.message } : { action: 'updated' };
    }
    return { action: 'none' };
  }

  // Not approved (any more): drop its line only if nothing has been billed on it.
  if (line && billed === 0) {
    const { error: e } = await supabase.from('sov_items').delete().eq('id', line.id);
    return e ? { action: 'none', error: e.message } : { action: 'removed' };
  }
  return { action: 'none' };
}

/** Friendly follow-up message after a change order is saved. */
export function coSovMessage(r: { action: string; error?: string }, number: string | number) {
  if (r.error) return { tone: 'warn' as const, text: `Change order saved, but it wasn't added to the Schedule of Values: ${r.error}` };
  if (r.action === 'added') return { tone: 'ok' as const, text: `CO ${number} added to the Schedule of Values. Bill it on the next payment application.` };
  if (r.action === 'updated') return { tone: 'ok' as const, text: `CO ${number} updated on the Schedule of Values.` };
  if (r.action === 'removed') return { tone: 'ok' as const, text: `CO ${number} removed from the Schedule of Values (not approved).` };
  return null;
}
