import { useEffect, useMemo, useState } from 'react';
import { Loader2, Merge, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchAll } from '@/lib/fetchAll';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

/**
 * Finds vendor names on expenses that are probably the same company ("Sample Concrete Co",
 * "SAMPLE CONCRETE COMPANY", "Sample Concrete, Inc.") and renames them all to one name.
 */
const SUFFIXES = new Set(['co', 'company', 'inc', 'incorporated', 'llc', 'l', 'c', 'corp', 'corporation', 'ltd', 'limited', 'the', 'and', 'of', 'llp', 'pc', 'pllc', 'lp', 'enterprises', 'services', 'svc', 'svcs']);
export const vendorKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !SUFFIXES.has(w))
    .join(' ');

// Edit distance, for near-misses like "Concret" vs "Concrete".
function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

interface Name {
  name: string;
  count: number;
  total: number;
}
interface Group {
  id: string;
  names: Name[];
}

export function VendorCleanupDialog({ open, onOpenChange, onMerged }: { open: boolean; onOpenChange: (v: boolean) => void; onMerged?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<Name[]>([]);
  const [keep, setKeep] = useState<Record<string, string>>({});
  const [include, setInclude] = useState<Record<string, Record<string, boolean>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [manualPick, setManualPick] = useState<Record<string, boolean>>({});
  const [manualName, setManualName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const rows = await fetchAll<any>('expenses', 'id,vendor,amount');
      const m = new Map<string, Name>();
      rows.forEach((r) => {
        const v = String(r.vendor || '').trim();
        if (!v) return;
        const n = m.get(v) || { name: v, count: 0, total: 0 };
        n.count++;
        n.total += Number(r.amount) || 0;
        m.set(v, n);
      });
      setNames([...m.values()].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      toast.error(`Couldn't load vendors: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const groups: Group[] = useMemo(() => {
    const byKey = new Map<string, Name[]>();
    names.forEach((n) => {
      const k = vendorKey(n.name) || n.name.toLowerCase();
      byKey.set(k, [...(byKey.get(k) || []), n]);
    });
    // Join keys that differ by a typo or two (only for longer names, to avoid false matches).
    const keys = [...byKey.keys()].sort();
    const parent = new Map(keys.map((k) => [k, k]));
    const root = (k: string): string => (parent.get(k) === k ? k : root(parent.get(k)!));
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length && keys[j].slice(0, 3) === keys[i].slice(0, 3); j++)
        if (keys[i].length >= 6 && distance(keys[i], keys[j]) <= (keys[i].length >= 12 ? 2 : 1)) parent.set(root(keys[j]), root(keys[i]));
    const merged = new Map<string, Name[]>();
    keys.forEach((k) => merged.set(root(k), [...(merged.get(root(k)) || []), ...byKey.get(k)!]));
    return [...merged.entries()]
      .filter(([, ns]) => ns.length > 1)
      .map(([id, ns]) => ({ id, names: ns.sort((a, b) => b.count - a.count) }))
      .sort((a, b) => b.names.reduce((s, n) => s + n.count, 0) - a.names.reduce((s, n) => s + n.count, 0));
  }, [names]);

  const rename = async (from: string[], to: string, key: string) => {
    const targets = from.filter((f) => f !== to);
    if (!targets.length || !to.trim()) return;
    setBusy(key);
    try {
      const { data, error } = await supabase.from('expenses').update({ vendor: to.trim() }).in('vendor', targets).select('id');
      if (error) throw error;
      toast.success(`Merged ${data?.length || 0} expense${data?.length === 1 ? '' : 's'} into "${to.trim()}"`);
      await load();
      onMerged?.();
    } catch (e: any) {
      toast.error(`Couldn't merge: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const manualList = manualQuery.trim()
    ? names.filter((n) => manualQuery.toLowerCase().split(/\s+/).every((w) => n.name.toLowerCase().includes(w)))
    : [];
  const manualChosen = Object.keys(manualPick).filter((k) => manualPick[k]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" /> Clean up vendor names
          </DialogTitle>
          <DialogDescription>
            These names look like the same company spelled different ways. Pick the name to keep and merge. Every expense with the other spellings is renamed, so vendor totals and searches come out right.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Looking for duplicates…
          </div>
        ) : (
          <div className="space-y-4">
            {!groups.length && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No likely duplicates found. You can still merge names yourself below.</p>}
            {groups.map((g) => {
              const chosen = keep[g.id] ?? g.names[0].name;
              const inc = include[g.id] || {};
              const selected = g.names.filter((n) => inc[n.name] !== false).map((n) => n.name);
              return (
                <div key={g.id} className="rounded-lg border p-3">
                  <div className="space-y-1.5">
                    {g.names.map((n) => (
                      <label key={n.name} className="flex items-center gap-3 rounded px-1 py-1 text-sm hover:bg-muted/50">
                        <Checkbox
                          checked={inc[n.name] !== false}
                          onCheckedChange={(v) => setInclude({ ...include, [g.id]: { ...inc, [n.name]: !!v } })}
                          aria-label={`Include ${n.name}`}
                        />
                        <input type="radio" name={`keep-${g.id}`} checked={chosen === n.name} onChange={() => setKeep({ ...keep, [g.id]: n.name })} aria-label={`Keep ${n.name}`} />
                        <span className="flex-1 truncate font-medium">{n.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {n.count} · {money(n.total)}
                        </span>
                        {chosen === n.name && <Badge variant="secondary">Keep</Badge>}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2">
                    <Input className="h-8 max-w-xs" value={chosen} onChange={(e) => setKeep({ ...keep, [g.id]: e.target.value })} aria-label="Name to keep" />
                    <Button size="sm" disabled={busy === g.id || selected.length < 2} onClick={() => rename(selected, chosen, g.id)}>
                      {busy === g.id && <Loader2 className="h-4 w-4 animate-spin" />} Merge {selected.length} names
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-sm font-medium">Merge any names yourself</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" value={manualQuery} onChange={(e) => setManualQuery(e.target.value)} placeholder="Type part of a vendor name" />
              </div>
              {manualList.length > 0 && (
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {manualList.slice(0, 50).map((n) => (
                    <label key={n.name} className="flex items-center gap-3 rounded px-1 py-1 text-sm hover:bg-muted/50">
                      <Checkbox checked={!!manualPick[n.name]} onCheckedChange={(v) => setManualPick({ ...manualPick, [n.name]: !!v })} />
                      <span className="flex-1 truncate">{n.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {n.count} · {money(n.total)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {manualChosen.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input className="h-8 max-w-xs" value={manualName || manualChosen[0]} onChange={(e) => setManualName(e.target.value)} aria-label="Merged name" />
                  <Button
                    size="sm"
                    disabled={busy === 'manual' || manualChosen.length < 1}
                    onClick={async () => {
                      await rename(manualChosen, manualName || manualChosen[0], 'manual');
                      setManualPick({});
                      setManualName('');
                    }}
                  >
                    Rename {manualChosen.length} to this
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
