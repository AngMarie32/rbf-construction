import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EstimateLine, currency, lineAmount } from '@/utils/estimateMath';
import { cn } from '@/lib/utils';

export interface Material {
  id: string;
  line_id: string;
  item: string;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  waste_pct: number;
  ai_quantity: number | null;
  ai_unit_cost: number | null;
  ai_waste_pct: number | null;
  basis: string | null;
  sort_order: number;
}

const ext = (q: number, c: number, w: number) => (Number(q) || 0) * (Number(c) || 0) * (1 + (Number(w) || 0) / 100);
/** What the AI's own numbers came to (new rows added by hand count as 0). */
const aiExt = (m: Material) => (m.ai_quantity == null ? 0 : ext(m.ai_quantity, m.ai_unit_cost ?? 0, m.ai_waste_pct ?? 0));
const isEdited = (m: Material) =>
  m.ai_quantity == null || Number(m.quantity) !== Number(m.ai_quantity) || Number(m.unit_cost) !== Number(m.ai_unit_cost) || Number(m.waste_pct) !== Number(m.ai_waste_pct ?? 0);
/**
 * Lines with no material list (labor, equipment, lump sums) still get one editable row: the line's own
 * quantity x unit cost, or 1 LS at the line amount. It is saved as a real row the first time it's edited.
 */
const lineRow = (l: EstimateLine): Material => {
  const hasQty = Number(l.quantity) > 0 && Number(l.unit_cost) > 0;
  const q = hasQty ? Number(l.quantity) : 1;
  const c = hasQty ? Number(l.unit_cost) : Number(l.baseline_amount) || 0;
  return {
    id: `virtual:${l.id}`,
    line_id: l.id,
    item: hasQty ? `${l.name} (line quantity)` : `${l.name} (lump sum)`,
    quantity: q,
    unit: hasQty ? l.unit : 'LS',
    unit_cost: c,
    waste_pct: 0,
    ai_quantity: q,
    ai_unit_cost: c,
    ai_waste_pct: 0,
    basis: hasQty ? 'Quantity and unit cost from the estimate line' : 'No quantity on this line; enter one to calculate it',
    sort_order: 0,
  };
};
const isVirtual = (m: Material) => m.id.startsWith('virtual:');

const qtyFmt = (n: number) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

interface Props {
  estimateId: string;
  lines: EstimateLine[];
  /** Sets (or clears with null) a line's override so the estimate totals recalculate. */
  onLineOverride: (line: EstimateLine, amount: number | null) => Promise<void> | void;
}

/**
 * Material quantities and prices behind each cost line. Changing a number recalculates the
 * line: new line amount = AI baseline + (materials now − materials as the AI priced them).
 */
export function EstimateMaterialsTab({ estimateId, lines, onLineOverride }: Props) {
  const [mats, setMats] = useState<Material[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState('');
  const [draft, setDraft] = useState<Record<string, { item: string; quantity: string; unit: string; unit_cost: string }>>({});

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any).from('estimate_materials').select('*').eq('estimate_id', estimateId).order('sort_order');
    if (error) {
      if (/estimate_materials|schema cache|does not exist/i.test(error.message)) setMissing(true);
      else toast.error(error.message);
      setMats([]);
      return;
    }
    setMats((data || []) as Material[]);
  }, [estimateId]);

  useEffect(() => {
    load();
  }, [load]);

  const byLine = useMemo(() => {
    const m = new Map<string, Material[]>();
    (mats || []).forEach((x) => m.set(x.line_id, [...(m.get(x.line_id) || []), x]));
    return m;
  }, [mats]);

  /** Recalculate one line from its materials and save the result as the line's override. */
  const recalcLine = async (lineId: string, list: Material[]) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const delta = list.reduce((a, m) => a + ext(m.quantity, m.unit_cost, m.waste_pct) - aiExt(m), 0);
    const next = Math.abs(delta) < 0.005 ? null : Math.max(0, Math.round((Number(line.baseline_amount) + delta) * 100) / 100);
    if ((line.override_amount ?? null) !== next) await onLineOverride(line, next);
  };

  const patch = async (m0: Material, field: 'quantity' | 'unit_cost' | 'waste_pct' | 'item' | 'unit', raw: string) => {
    const value = field === 'item' || field === 'unit' ? raw : Math.max(0, Number(raw) || 0);
    if ((m0 as any)[field] === value) return;
    let m = m0;
    if (isVirtual(m0)) {
      // First edit of a line calculation: save it as a real row, keeping the original numbers.
      const { id: _v, ...rest } = m0;
      const { data, error } = await (supabase as any).from('estimate_materials').insert({ ...rest, estimate_id: estimateId }).select('*').single();
      if (error) return toast.error(error.message);
      m = data as Material;
      setMats((p) => [...(p || []), m]);
    }
    const base = (mats || []).some((x) => x.id === m.id) ? mats || [] : [...(mats || []), m];
    const next = base.map((x) => (x.id === m.id ? { ...x, [field]: value } : x));
    setMats(next);
    const { error } = await (supabase as any).from('estimate_materials').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', m.id);
    if (error) return toast.error(error.message);
    await recalcLine(m.line_id, next.filter((x) => x.line_id === m.line_id));
  };

  const resetRow = async (m: Material) => {
    if (m.ai_quantity == null) return;
    const vals = { quantity: m.ai_quantity, unit_cost: m.ai_unit_cost ?? 0, waste_pct: m.ai_waste_pct ?? 0 };
    const next = (mats || []).map((x) => (x.id === m.id ? { ...x, ...vals } : x));
    setMats(next);
    await (supabase as any).from('estimate_materials').update(vals).eq('id', m.id);
    await recalcLine(m.line_id, next.filter((x) => x.line_id === m.line_id));
  };

  const removeRow = async (m: Material) => {
    const next = (mats || []).filter((x) => x.id !== m.id);
    setMats(next);
    await (supabase as any).from('estimate_materials').delete().eq('id', m.id);
    // Removing an AI-priced material takes its cost out of the line.
    if (m.ai_quantity != null) {
      const line = lines.find((l) => l.id === m.line_id);
      if (line) {
        const rest = next.filter((x) => x.line_id === m.line_id);
        const delta = rest.reduce((a, x) => a + ext(x.quantity, x.unit_cost, x.waste_pct) - aiExt(x), 0) - aiExt(m);
        await onLineOverride(line, Math.abs(delta) < 0.005 ? null : Math.max(0, Number(line.baseline_amount) + delta));
      }
    } else {
      await recalcLine(m.line_id, next.filter((x) => x.line_id === m.line_id));
    }
  };

  const addRow = async (line: EstimateLine) => {
    const d = draft[line.id];
    if (!d?.item?.trim()) return toast.error('Name the material first');
    const row = {
      estimate_id: estimateId,
      line_id: line.id,
      item: d.item.trim(),
      quantity: Number(d.quantity) || 0,
      unit: d.unit.trim() || null,
      unit_cost: Number(d.unit_cost) || 0,
      waste_pct: 0,
      sort_order: (byLine.get(line.id)?.length || 0) + 1,
    };
    const { data, error } = await (supabase as any).from('estimate_materials').insert(row).select('*').single();
    if (error) return toast.error(error.message);
    const next = [...(mats || []), data as Material];
    setMats(next);
    setDraft((p) => ({ ...p, [line.id]: { item: '', quantity: '', unit: '', unit_cost: '' } }));
    await recalcLine(line.id, next.filter((x) => x.line_id === line.id));
  };

  const resetAll = async () => {
    const edited = (mats || []).filter((m) => m.ai_quantity != null && isEdited(m));
    for (const m of edited) {
      await (supabase as any).from('estimate_materials').update({ quantity: m.ai_quantity, unit_cost: m.ai_unit_cost ?? 0, waste_pct: m.ai_waste_pct ?? 0 }).eq('id', m.id);
    }
    await load();
    for (const lineId of new Set(edited.map((m) => m.line_id))) {
      const line = lines.find((l) => l.id === lineId);
      if (line) await onLineOverride(line, null);
    }
    toast.success('Materials back to the original takeoff');
  };

  if (missing) {
    return (
      <Card className="p-6 text-sm">
        <p className="font-medium">The material takeoff needs a database update.</p>
        <p className="mt-1 text-muted-foreground">Run the "estimate materials" SQL in Supabase, then build a new estimate. Existing estimates were created before materials were saved.</p>
      </Card>
    );
  }
  if (!mats) return <Card className="p-6 text-sm text-muted-foreground">Loading materials…</Card>;

  const q = filter.trim().toLowerCase();
  const linesShown = lines.filter((l) => !q || l.name.toLowerCase().includes(q) || (byLine.get(l.id) || []).some((m) => m.item.toLowerCase().includes(q)));
  const withMats = linesShown.filter((l) => byLine.has(l.id));
  const without = linesShown.filter((l) => !byLine.has(l.id));
  const totalNow = (mats || []).reduce((a, m) => a + ext(m.quantity, m.unit_cost, m.waste_pct), 0);
  const totalAi = (mats || []).reduce((a, m) => a + aiExt(m), 0);
  const editedCount = (mats || []).filter(isEdited).length;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <Calculator className="h-5 w-5 text-orange-500" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Material takeoff</p>
          <p className="text-xs text-muted-foreground">
            Extended = quantity × unit cost × (1 + waste %). Change any number and the cost line (and the estimate total) recalculates by the difference. The AI's original numbers stay visible.
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="tabular-nums font-semibold">{currency(totalNow)}</p>
          <p className="text-xs text-muted-foreground">
            materials{Math.abs(totalNow - totalAi) >= 0.5 ? ` · ${totalNow >= totalAi ? '+' : '−'}${currency(Math.abs(totalNow - totalAi))} vs. takeoff` : ''}
          </p>
        </div>
        <Input className="h-9 w-56" placeholder="Find a line or material" value={filter} onChange={(e) => setFilter(e.target.value)} />
        {editedCount > 0 && (
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RotateCcw className="h-4 w-4" /> Reset {editedCount} change{editedCount === 1 ? '' : 's'}
          </Button>
        )}
      </Card>

      {!mats.length && (
        <Card className="p-6 text-sm text-muted-foreground">
          No material list came back for this estimate, so each line below shows its own calculation (quantity × unit cost, or a lump sum). Change the numbers to recalculate, or add materials to a line.
        </Card>
      )}

      {[...withMats, ...without].map((l) => {
        const saved = byLine.get(l.id) || [];
        const calcOnly = saved.length === 0 || saved.every((m) => /\((line quantity|lump sum)\)$/.test(m.item));
        const list = saved.length ? saved : [lineRow(l)];
        const now = list.reduce((a, m) => a + ext(m.quantity, m.unit_cost, m.waste_pct), 0);
        const ai = list.reduce((a, m) => a + aiExt(m), 0);
        const d = draft[l.id] || { item: '', quantity: '', unit: '', unit_cost: '' };
        return (
          <Card key={l.id} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-2">
              <div>
                <p className="font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">{l.group_name} · {l.section_name}</p>
              </div>
              <div className="text-right text-sm">
                <p className="tabular-nums font-semibold">
                  {currency(lineAmount(l))}
                  {l.override_amount != null && <Badge variant="outline" className="ml-2 text-[10px]">recalculated</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  line (AI baseline {currency(l.baseline_amount)}) · {calcOnly ? 'calculation' : 'materials'} {currency(now)}
                  {Math.abs(now - ai) >= 0.5 ? ` (${now >= ai ? '+' : '−'}${currency(Math.abs(now - ai))})` : ''}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-2">{calcOnly ? 'Line calculation' : 'Material'}</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Unit cost</th>
                    <th className="px-3 py-2 text-right">Waste %</th>
                    <th className="px-3 py-2 text-right">Extended</th>
                    <th className="w-16 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((m) => {
                    const edited = isEdited(m);
                    return (
                      <tr key={m.id} className={cn(edited && 'bg-orange-500/5')}>
                        <td className="px-3 py-2">
                          <Input className="h-8 min-w-[160px]" defaultValue={m.item} onBlur={(e) => patch(m, 'item', e.target.value)} />
                          {m.basis && <p className="mt-0.5 max-w-xs text-[11px] text-muted-foreground">{m.basis}</p>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input className="ml-auto h-8 w-24 text-right" type="number" step="any" defaultValue={m.quantity} key={`q${m.id}${m.quantity}`} onBlur={(e) => patch(m, 'quantity', e.target.value)} />
                          {m.ai_quantity != null && Number(m.quantity) !== Number(m.ai_quantity) && <p className="text-[11px] text-muted-foreground line-through">{qtyFmt(m.ai_quantity)}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <Input className="h-8 w-16" defaultValue={m.unit || ''} onBlur={(e) => patch(m, 'unit', e.target.value)} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input className="ml-auto h-8 w-24 text-right" type="number" step="any" defaultValue={m.unit_cost} key={`c${m.id}${m.unit_cost}`} onBlur={(e) => patch(m, 'unit_cost', e.target.value)} />
                          {m.ai_unit_cost != null && Number(m.unit_cost) !== Number(m.ai_unit_cost) && <p className="text-[11px] text-muted-foreground line-through">{currency(m.ai_unit_cost)}</p>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input className="ml-auto h-8 w-16 text-right" type="number" step="any" defaultValue={m.waste_pct} key={`w${m.id}${m.waste_pct}`} onBlur={(e) => patch(m, 'waste_pct', e.target.value)} />
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{currency(ext(m.quantity, m.unit_cost, m.waste_pct))}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-0.5">
                            {edited && m.ai_quantity != null && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Back to the AI takeoff" onClick={() => resetRow(m)}>
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {!isVirtual(m) && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Remove" onClick={() => removeRow(m)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AddRow d={d} onChange={(v) => setDraft((p) => ({ ...p, [l.id]: v }))} onAdd={() => addRow(l)} />
          </Card>
        );
      })}
    </div>
  );
}

function AddRow({
  d,
  onChange,
  onAdd,
}: {
  d: { item: string; quantity: string; unit: string; unit_cost: string };
  onChange: (v: { item: string; quantity: string; unit: string; unit_cost: string }) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t bg-muted/20 px-3 py-2">
      <Input className="h-8 min-w-[160px] flex-1" placeholder="Add a material" value={d.item} onChange={(e) => onChange({ ...d, item: e.target.value })} />
      <Input className="h-8 w-24 text-right" type="number" step="any" placeholder="Qty" value={d.quantity} onChange={(e) => onChange({ ...d, quantity: e.target.value })} />
      <Input className="h-8 w-16" placeholder="Unit" value={d.unit} onChange={(e) => onChange({ ...d, unit: e.target.value })} />
      <Input className="h-8 w-24 text-right" type="number" step="any" placeholder="Unit cost" value={d.unit_cost} onChange={(e) => onChange({ ...d, unit_cost: e.target.value })} />
      <Button size="sm" variant="outline" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Add
      </Button>
    </div>
  );
}
