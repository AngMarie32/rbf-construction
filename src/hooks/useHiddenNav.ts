import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Pages that can never be hidden, so an admin can always get back to the menu settings. */
export const LOCKED_NAV = ['/settings'];

const CACHE_KEY = 'rbf.hiddenNav';
const EVENT = 'rbf:hidden-nav';
const SETTING_KEY = 'hidden_nav_items';
const NEEDS_UPDATE = 'The database needs the "menu visibility" update before this can be saved. Ask an admin to run it in Supabase.';
const missing = (msg: string) => /app_settings|hidden_nav_items|schema cache|does not exist|column/i.test(msg);

let current: string[] = (() => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch {
    return [];
  }
})();
let loadedFor: string | null | undefined;

function publish(list: string[]) {
  current = (Array.isArray(list) ? list : []).filter((h) => typeof h === 'string' && !LOCKED_NAV.includes(h));
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Reads the company-wide list from the database (the browser copy is only a fast first paint). */
async function load() {
  // 1) Dedicated settings table.
  const { data, error } = await (supabase as any).from('app_settings').select('value').eq('key', SETTING_KEY).maybeSingle();
  if (!error && data) {
    publish(data.value as string[]);
    return;
  }
  // 2) Older location: a column on company_settings.
  const { data: rows, error: err2 } = await supabase.from('company_settings').select('*');
  if (err2 || !rows) return;
  const withList = (rows as any[])
    .filter((r) => Array.isArray(r.hidden_nav_items))
    .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))[0];
  if (withList) publish(withList.hidden_nav_items);
}

/** Menu pages an admin has hidden for the whole company. */
export function useHiddenNav() {
  const [hidden, setHidden] = useState<string[]>(current);
  useEffect(() => {
    const on = () => setHidden(current);
    window.addEventListener(EVENT, on);
    // Load once per signed-in user, and again after signing in (the first load can run before the session is ready).
    const run = (userId: string | null) => {
      if (loadedFor === userId) return;
      loadedFor = userId;
      load();
    };
    supabase.auth.getSession().then(({ data }) => run(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => run(session?.user.id ?? null));
    return () => {
      window.removeEventListener(EVENT, on);
      sub.subscription.unsubscribe();
    };
  }, []);
  return hidden;
}

/** Saves the list for everyone and confirms the database kept it. */
export async function saveHiddenNav(list: string[]) {
  const clean = list.filter((h) => !LOCKED_NAV.includes(h));
  const { data, error } = await (supabase as any)
    .from('app_settings')
    .upsert({ key: SETTING_KEY, value: clean, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select('value');
  if (error) throw new Error(missing(error.message) ? NEEDS_UPDATE : error.message);
  if (!data || !data.length) throw new Error("The menu wasn't saved. Your account may not have permission to change settings.");
  // Keep the older column in step for any page still reading it (ignore if it isn't there).
  const { data: rows } = await supabase.from('company_settings').select('id');
  if (rows?.length) {
    await supabase.from('company_settings').update({ hidden_nav_items: clean } as any).in('id', rows.map((r: any) => r.id));
  }
  publish(clean);
}
