import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Pages that can never be hidden, so an admin can always get back to the menu settings. */
export const LOCKED_NAV = ['/settings'];

const CACHE_KEY = 'rbf.hiddenNav';
const EVENT = 'rbf:hidden-nav';

let current: string[] = (() => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch {
    return [];
  }
})();
let loaded = false;

function publish(list: string[]) {
  current = list.filter((h) => !LOCKED_NAV.includes(h));
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

async function load() {
  // There can be more than one company_settings row; read them all and use the newest list.
  const { data, error } = await supabase.from('company_settings').select('*');
  if (error || !data) return;
  const rows = (data as any[])
    .filter((r) => Array.isArray(r.hidden_nav_items))
    .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
  const withList = rows[0];
  if (withList) publish(withList.hidden_nav_items);
}

/** Menu pages an admin has hidden for the whole company (stored on company_settings). */
export function useHiddenNav() {
  const [hidden, setHidden] = useState<string[]>(current);
  useEffect(() => {
    const on = () => setHidden(current);
    window.addEventListener(EVENT, on);
    if (!loaded) {
      loaded = true;
      load();
    }
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return hidden;
}

/** Saves the hidden list. Throws a plain-language error if the database update hasn't been run. */
export async function saveHiddenNav(list: string[]) {
  const clean = list.filter((h) => !LOCKED_NAV.includes(h));
  const { data: rows, error: readErr } = await supabase.from('company_settings').select('id');
  if (readErr) throw readErr;
  const explain = (msg: string) =>
    /hidden_nav_items|schema cache|column/i.test(msg) ? new Error('The database needs the "menu visibility" update before this can be saved.') : new Error(msg);
  let saved: any[] | null = null;
  if (rows && rows.length) {
    // Write to every settings row so whichever one a page reads has the same list.
    const { data, error } = await supabase
      .from('company_settings')
      .update({ hidden_nav_items: clean, updated_at: new Date().toISOString() } as any)
      .in('id', rows.map((r: any) => r.id))
      .select('id, hidden_nav_items');
    if (error) throw explain(error.message);
    saved = data;
  } else {
    const { data, error } = await supabase.from('company_settings').insert({ company_name: 'RBF Construction', hidden_nav_items: clean } as any).select('id, hidden_nav_items');
    if (error) throw explain(error.message);
    saved = data;
  }
  if (!saved || !saved.length) throw new Error("The menu wasn't saved. Your account may not have permission to change company settings.");
  publish(clean);
}
