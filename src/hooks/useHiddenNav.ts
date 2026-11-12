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
  const { data, error } = await supabase.from('company_settings').select('id, hidden_nav_items').limit(1).maybeSingle();
  if (!error) publish(((data as any)?.hidden_nav_items as string[] | null) || []);
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
  const { data: row } = await supabase.from('company_settings').select('id').limit(1).maybeSingle();
  const { error } = row
    ? await supabase.from('company_settings').update({ hidden_nav_items: clean } as any).eq('id', row.id)
    : await supabase.from('company_settings').insert({ hidden_nav_items: clean } as any);
  if (error) {
    if (/hidden_nav_items|schema cache|column/i.test(error.message)) {
      throw new Error('The database needs the "menu visibility" update before this can be saved.');
    }
    throw error;
  }
  publish(clean);
}
