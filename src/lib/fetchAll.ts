import { supabase } from '@/integrations/supabase/client';

/**
 * Reads every row of a table. Supabase returns at most 1,000 rows per request,
 * so totals built from a single select silently undercount once a table grows
 * past that (common after QuickBooks imports).
 */
export async function fetchAll<T = any>(table: string, columns: string, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select(columns)
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    out.push(...((data || []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return out;
}
