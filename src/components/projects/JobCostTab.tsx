import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccentStat } from '@/components/ui/accent-stat';
import { cn } from '@/lib/utils';

/**
 * Job cost vs. estimate: budget (from the project's estimate, or a split you enter) against what's
 * been spent so far, by cost type. Spent = approved/pending expenses (not rejected) + time entries.
 */
export const COST_TYPES = ['Labor', 'Materials', 'Subcontractors', 'Equipment', 'General conditions', 'Other'] as const;
type CostType = (typeof COST_TYPES)[number];

const CATEGORY_TO_TYPE: Record<string, CostType> = {
  labor: 'Labor',
  materials: 'Materials',
  material: 'Materials',
  subcontractors: 'Subcontractors',
  subcontractor: 'Subcontractors',
  equipment: 'Equipment',
  fuel: 'Equipment',
  maintenance: 'Equipment',
  permits: 'General conditions',
  insurance: 'General conditions',
  utilities: 'General conditions',
  travel: 'General conditions',
  'office supplies': 'General conditions',
  'professional services': 'General conditions',
};
export const costTypeOf = (category?: string | null): CostType => CATEGORY_TO_TYPE[String(category || '').trim().toLowerCase()] || 'Other';

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

async function pagedByProject(table: string, columns: string, projectId: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await (supabase as any).from(table).select(columns).eq('project_id', projectId).order('id').range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

interface Row {
  key: string;
  label: string;
  hint?: string;
  budget: number;
  spent: number;
}

export function JobCostTab({ projectId, percentComplete }: { projectId: string; percentComplete: number }) {
  const [loading, setLoading] = useState(true);
  const [spentByType, setSpentByType] = useState<Record<CostType, number>>({} as any);
  const [timeCost, setTimeCost] = useState(0);
  const [estimate, setEstimate] = useState<{ name: string; direct: number; gc: number } | null>(null);
  const [bidTotal, setBidTotal] = useState(0);
  const [saved, setSaved] = useState<Record<string, number> | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [expenses, times, budgets] = await Promise.all([
        pagedByProject('expenses', 'id,amount,category,status', projectId),
        pagedByProject('time_entries', 'id,total_cost', projectId).catch(() => []),
        (supabase as any).from('project_cost_budgets').select('cost_type,amount').eq('project_id', projectId).then((r: any) => (r.error ? null : r.data)),
      ]);
      const sums = Object.fromEntries(COST_TYPES.map((t) => [t, 0])) as Record<CostType, number>;
      expenses.filter((e: any) => e.status !== 'Rejected').forEach((e: any) => (sums[costTypeOf(e.category)] += Number(e.amount) || 0));
      const tc = times.reduce((s: number, t: any) => s + (Number(t.total_cost) || 0), 0);
      sums.Labor += tc;
      setSpentByType(sums);
      setTimeCost(tc);
      setSaved(budgets && budgets.length ? Object.fromEntries(budgets.map((b: any) => [b.cost_type, Number(b.amount) || 0])) : null);

      // Budget source: the estimate linked to this project, otherwise its bid items.
      const { data: ests } = await (supabase as any)
        .from('estimates')
        .select('id,name,updated_at')
        .or(`project_id.eq.${projectId},sov_project_id.eq.${projectId}`)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (ests?.[0]) {
        const { data: lines } = await (supabase as any).from('estimate_lines').select('group_key,baseline_amount,override_amount').eq('estimate_id', ests[0].id);
        let direct = 0,
          gc = 0;
        (lines || []).forEach((l: any) => {
          const amt = Number(l.override_amount ?? l.baseline_amount) || 0;
          if (String(l.group_key).endsWith('_gc')) gc += amt;
          else direct += amt;
        });
        setEstimate({ name: ests[0].name, direct, gc });
      } else setEstimate(null);
      const { data: bids } = await (supabase as any).from('bid_items').select('total').eq('project_id', projectId);
      setBidTotal((bids || []).reduce((s: number, b: any) => s + (Number(b.total) || 0), 0));
    } catch (e: any) {
      toast.error(`Couldn't load job costs: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows: Row[] = useMemo(() => {
    const s = spentByType;
    if (saved) {
      return COST_TYPES.map((t) => ({
        key: t,
        label: t,
        hint: t === 'Labor' && timeCost ? `includes ${money(timeCost)} from time entries` : undefined,
        budget: saved[t] || 0,
        spent: s[t] || 0,
      }));
    }
    // No split saved yet: compare direct work as one line.
    const direct = estimate ? estimate.direct : bidTotal;
    return [
      { key: 'direct', label: 'Direct work', hint: 'labor, materials, subs and equipment', budget: direct, spent: (s.Labor || 0) + (s.Materials || 0) + (s.Subcontractors || 0) + (s.Equipment || 0) },
      { key: 'gc', label: 'General conditions', budget: estimate?.gc || 0, spent: s['General conditions'] || 0 },
      { key: 'other', label: 'Other', budget: 0, spent: s.Other || 0 },
    ];
  }, [saved, spentByType, estimate, bidTotal, timeCost]);

  const totalBudget = rows.reduce((a, r) => a + r.budget, 0);
  const totalSpent = rows.reduce((a, r) => a + r.spent, 0);
  const usedPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const ahead = totalBudget > 0 && usedPct > percentComplete + 10;
  const source = saved ? 'your budget split' : estimate ? `estimate "${estimate.name}"` : bidTotal ? 'bid items' : null;

  if (loading)
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading job costs…
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AccentStat label="Budget" value={totalBudget ? money(totalBudget) : '—'} hint={source ? `From ${source}` : 'No estimate linked'} accent="blue" />
        <AccentStat label="Spent so far" value={money(totalSpent)} accent="amber" />
        <AccentStat label="Remaining" value={totalBudget ? money(totalBudget - totalSpent) : '—'} tone={totalBudget && totalSpent > totalBudget ? 'bad' : undefined} accent="emerald" />
        <AccentStat label="Budget used vs. job complete" value={totalBudget ? `${usedPct}% / ${percentComplete}%` : '—'} tone={ahead ? 'bad' : undefined} accent="indigo" />
      </div>

      {ahead && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {usedPct}% of the budget is spent but the job is only {percentComplete}% complete. At this pace the job would finish around{' '}
            <strong>{money(percentComplete > 0 ? (totalSpent / percentComplete) * 100 : totalSpent)}</strong> against a {money(totalBudget)} budget.
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4" /> Job cost vs. estimate
            </CardTitle>
            <CardDescription>
              {saved
                ? 'Budget by cost type, compared with expenses and time entries on this job.'
                : 'Split the budget by cost type to see labor, materials, subs and equipment separately.'}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> {saved ? 'Edit budget' : 'Split budget'}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-y bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Cost type</th>
                  <th className="px-4 py-2 text-right font-medium">Budget</th>
                  <th className="px-4 py-2 text-right font-medium">Spent</th>
                  <th className="px-4 py-2 text-right font-medium">Difference</th>
                  <th className="w-40 px-4 py-2 text-left font-medium">Used</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const diff = r.budget - r.spent;
                  const pct = r.budget > 0 ? Math.round((r.spent / r.budget) * 100) : r.spent > 0 ? 100 : 0;
                  const over = r.spent > r.budget && (r.budget > 0 || r.spent > 0);
                  return (
                    <tr key={r.key} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.label}</div>
                        {r.hint && <div className="text-xs text-muted-foreground">{r.hint}</div>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.budget ? money(r.budget) : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(r.spent)}</td>
                      <td className={cn('px-4 py-3 text-right font-medium tabular-nums', over ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400')}>
                        {r.budget || r.spent ? `${diff < 0 ? '−' : ''}${money(Math.abs(diff))}${over ? ' over' : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className={cn('h-full rounded-full', over ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{r.budget ? `${pct}%` : ''}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/40 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totalBudget ? money(totalBudget) : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(totalSpent)}</td>
                  <td className={cn('px-4 py-3 text-right tabular-nums', totalSpent > totalBudget ? 'text-red-600 dark:text-red-400' : '')}>
                    {totalBudget ? `${totalBudget - totalSpent < 0 ? '−' : ''}${money(Math.abs(totalBudget - totalSpent))}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{totalBudget ? `${usedPct}% used` : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {!source && (
            <p className="border-t p-4 text-sm text-muted-foreground">
              No estimate is linked to this project yet. Send an estimate to this project from the Estimating page, or click <strong>Split budget</strong> to enter one.
            </p>
          )}
        </CardContent>
      </Card>

      <BudgetDialog
        open={editing}
        onOpenChange={setEditing}
        projectId={projectId}
        initial={saved}
        suggestedDirect={estimate ? estimate.direct : bidTotal}
        suggestedGc={estimate?.gc || 0}
        onSaved={load}
      />
    </div>
  );
}

function BudgetDialog({
  open,
  onOpenChange,
  projectId,
  initial,
  suggestedDirect,
  suggestedGc,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  initial: Record<string, number> | null;
  suggestedDirect: number;
  suggestedGc: number;
  onSaved: () => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVals(
      Object.fromEntries(
        COST_TYPES.map((t) => [t, initial ? String(initial[t] || '') : t === 'General conditions' && suggestedGc ? String(Math.round(suggestedGc)) : ''])
      )
    );
  }, [open, initial, suggestedGc]);

  const entered = COST_TYPES.reduce((s, t) => s + (Number(vals[t]) || 0), 0);
  const target = suggestedDirect + suggestedGc;
  const left = target - entered;

  const save = async () => {
    setSaving(true);
    try {
      const rows = COST_TYPES.map((t) => ({ project_id: projectId, cost_type: t, amount: Number(vals[t]) || 0, updated_at: new Date().toISOString() }));
      const { error } = await (supabase as any).from('project_cost_budgets').upsert(rows, { onConflict: 'project_id,cost_type' });
      if (error) throw error;
      toast.success('Budget saved');
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(
        /project_cost_budgets|schema cache|does not exist/i.test(e.message)
          ? 'The database needs the job cost update (SQL) before budgets can be saved.'
          : `Couldn't save the budget: ${e.message}`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Budget by cost type</DialogTitle>
          <DialogDescription>
            {target > 0
              ? `The estimate's cost (before overhead and profit) is ${money(target)}. Split it across the types below.`
              : 'Enter the budgeted cost for each type.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {COST_TYPES.map((t) => (
            <div key={t} className="grid grid-cols-[1fr_160px] items-center gap-3">
              <Label htmlFor={`b-${t}`}>{t}</Label>
              <Input id={`b-${t}`} type="number" inputMode="decimal" min={0} value={vals[t] ?? ''} onChange={(e) => setVals({ ...vals, [t]: e.target.value })} />
            </div>
          ))}
          <div className="flex justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Total entered</span>
            <span className="font-semibold tabular-nums">{money(entered)}</span>
          </div>
          {target > 0 && Math.abs(left) >= 1 && (
            <p className={cn('text-xs', left < 0 ? 'text-red-600' : 'text-muted-foreground')}>
              {left > 0 ? `${money(left)} of the estimate isn't assigned yet.` : `${money(-left)} more than the estimate.`}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
