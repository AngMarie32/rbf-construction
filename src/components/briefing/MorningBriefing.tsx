import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCompanies } from '@/contexts/CompanyContext';
import { projectProfit } from '@/utils/projectProfit';
import { supabase } from '@/integrations/supabase/client';
import { fetchReminders, type Reminder } from '@/lib/reminders';
import {
  BRIEFING_PREFS_EVENT, BRIEFING_SECTION_LABELS, type BriefingPrefs, type BriefingSection,
  loadBriefingPrefs, localDayKey, moveSection, saveBriefingPrefs, shouldAutoOpen,
} from '@/lib/briefingPrefs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

interface Item { id: string; title: string; detail: string; to: string; high?: boolean }
type Data = Record<BriefingSection, Item[]>;

const KIND_TO_SECTION: Record<Reminder['kind'], BriefingSection> = {
  invoice_overdue: 'invoices_overdue', insurance_expired: 'insurance', insurance_expiring: 'insurance',
  inspection_soon: 'inspections', permit_expiring: 'permits', cost_spike: 'cost_spikes',
};
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseDay = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };

async function loadBriefing(prefs: BriefingPrefs, companyIds: string[]): Promise<Data> {
  const data = Object.fromEntries(Object.keys(BRIEFING_SECTION_LABELS).map((k) => [k, []])) as unknown as Data;
  const today = localDayKey();
  const leaseCut = localDayKey(new Date(Date.now() + prefs.leaseWindowDays * 86_400_000));
  const [reminders, tasksRes, billsRes, unitsRes] = await Promise.all([
    fetchReminders().catch(() => [] as Reminder[]),
    supabase.from('tasks').select('id, title, status, start_date, end_date, project_id, projects(name)')
      .lte('start_date', today).gte('end_date', today).limit(50),
    supabase.from('expenses').select('id, vendor, amount, status, project_id, projects(name)')
      .like('status', 'Pending%').limit(50),
    (supabase as any).from('property_units').select('id, unit_number, tenant_name, lease_end, properties(name)')
      .not('lease_end', 'is', null).gte('lease_end', today).lte('lease_end', leaseCut).order('lease_end'),
  ]);
  reminders.forEach((r) => data[KIND_TO_SECTION[r.kind]].push({ id: r.id, title: r.title, detail: r.detail, to: r.to, high: r.severity === 'high' }));
  (tasksRes.data || []).filter((t: any) => !/complete|done/i.test(t.status || '')).forEach((t: any) =>
    data.tasks_today.push({ id: t.id, title: t.title, detail: `${t.projects?.name || 'Project'} · ${t.start_date === today ? 'starts today' : t.end_date === today ? 'due today' : 'in progress'}`, to: `/project-schedule?project=${t.project_id}`, high: t.end_date === today }));
  (billsRes.data || []).forEach((e: any) =>
    data.pending_approvals.push({ id: e.id, title: `${e.vendor || 'Vendor'} · ${money(Number(e.amount) || 0)}`, detail: `${e.status}${e.projects?.name ? ` · ${e.projects.name}` : ''}`, to: '/expenses' }));
  (unitsRes.data || []).forEach((u: any) => {
    const days = Math.round((parseDay(u.lease_end).getTime() - parseDay(today).getTime()) / 86_400_000);
    data.lease_expirations.push({ id: u.id, title: `${u.properties?.name || 'Property'} · Unit ${u.unit_number}`, detail: `${u.tenant_name || 'Tenant'} · lease ends in ${days} day${days === 1 ? '' : 's'}`, to: `/properties/units/${u.id}/lease`, high: days <= 30 });
  });
  await loadExecutive(data, today, companyIds).catch(() => undefined);
  return data;
}

/** Executive items: portfolio contract/cost/profit, projects eating into estimated profit, past-due billings. */
async function loadExecutive(data: Data, today: string, companyIds: string[]) {
  let q = supabase.from('projects').select('id, name, status, contract_value, estimated_profit, company_id');
  if (companyIds.length) q = q.in('company_id', companyIds);
  const { data: projects } = await q;
  const active = (projects || []).filter((p: any) => !/complete|closed|cancel/i.test(p.status || ''));
  if (!active.length) return;
  const ids = active.map((p: any) => p.id);
  const costs: Record<string, number> = {};
  const billed: Record<string, { name: string }> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const [exp, bill] = await Promise.all([
      supabase.from('expenses').select('project_id, amount').in('project_id', chunk),
      supabase.from('project_billing').select('id, project_id, billed_amount, paid_amount, due_date, invoice_number').in('project_id', chunk),
    ]);
    (exp.data || []).forEach((e: any) => { costs[e.project_id] = (costs[e.project_id] || 0) + (Number(e.amount) || 0); });
    (bill.data || []).forEach((b: any) => {
      const open = (Number(b.billed_amount) || 0) - (Number(b.paid_amount) || 0);
      if (open > 0.005 && b.due_date && b.due_date.slice(0, 10) < today) {
        const name = active.find((p: any) => p.id === b.project_id)?.name || 'Project';
        const days = Math.round((parseDay(today).getTime() - parseDay(b.due_date).getTime()) / 86_400_000);
        data.exec_receivables.push({ id: b.id, title: `${name} · ${money(open)}`, detail: `${b.invoice_number ? `Invoice ${b.invoice_number} · ` : ''}${days} day${days === 1 ? '' : 's'} past due`, to: `/projects/${b.project_id}`, high: days > 30 });
        billed[b.id] = { name };
      }
    });
  }
  let contract = 0, spent = 0, profit = 0;
  active.forEach((p: any) => {
    const c = Number(p.contract_value) || 0; const k = costs[p.id] || 0;
    const r = projectProfit(c, k, p.estimated_profit);
    contract += c; spent += k; profit += r.profit;
    if (r.hasTarget && r.overBudget > 0) data.exec_profit_erosion.push({ id: p.id, title: `${p.name} · ${money(r.overBudget)} over cost budget`, detail: `Estimated profit now ${money(r.profit)} of ${money(Number(p.estimated_profit))}`, to: `/projects/${p.id}`, high: r.profit < 0 });
  });
  const pastDue = data.exec_receivables.reduce((s, it) => s + Number(it.title.split('· $')[1]?.replace(/,/g, '') || 0), 0);
  data.exec_snapshot.push(
    { id: 'x1', title: `${active.length} active project${active.length === 1 ? '' : 's'} · ${money(contract)} under contract`, detail: `${money(spent)} spent to date`, to: '/projects' },
    { id: 'x2', title: `Projected profit ${money(profit)}`, detail: contract > 0 ? `${((profit / contract) * 100).toFixed(2)}% margin on open work` : 'No contract values entered', to: '/projects', high: profit < 0 },
    { id: 'x3', title: `Past-due receivables ${money(pastDue)}`, detail: `${data.exec_receivables.length} billing${data.exec_receivables.length === 1 ? '' : 's'} past due`, to: '/projects', high: pastDue > 0 },
  );
}

export function MorningBriefing() {
  const navigate = useNavigate();
  const { selectedIds } = useCompanies();
  const [prefs, setPrefs] = useState<BriefingPrefs>(() => loadBriefingPrefs());
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [data, setData] = useState<Data | null>(null);

  const update = (p: BriefingPrefs) => { setPrefs(p); saveBriefingPrefs(p); };
  const refresh = useCallback(() => { setData(null); loadBriefing(loadBriefingPrefs(), selectedIds || []).then(setData).catch(() => setData(null)); }, [selectedIds]);

  useEffect(() => {
    const sync = () => setPrefs(loadBriefingPrefs());
    window.addEventListener(BRIEFING_PREFS_EVENT, sync);
    return () => window.removeEventListener(BRIEFING_PREFS_EVENT, sync);
  }, []);
  useEffect(() => { if (shouldAutoOpen(prefs)) setOpen(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) refresh(); }, [open, prefs.leaseWindowDays, refresh]);

  const markReviewed = () => { update({ ...prefs, reviewedOn: localDayKey() }); setOpen(false); };
  const visible = prefs.order.filter((s) => !prefs.hidden.includes(s));
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (!prefs.enabled) return null;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="hidden sm:inline-flex">Briefing</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Morning Briefing</DialogTitle>
            <DialogDescription>{dateLabel}</DialogDescription>
          </DialogHeader>

          {customizing ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Choose what shows and the order it appears in.</p>
              <div className="divide-y divide-border/60 rounded-md bg-muted/30">
                {prefs.order.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 px-3 py-2">
                    <Switch checked={!prefs.hidden.includes(s)} aria-label={`Show ${BRIEFING_SECTION_LABELS[s]}`}
                      onCheckedChange={(on) => update({ ...prefs, hidden: on ? prefs.hidden.filter((h) => h !== s) : [...prefs.hidden, s] })} />
                    <span className="flex-1 text-sm">{BRIEFING_SECTION_LABELS[s]}</span>
                    <Button variant="ghost" size="sm" disabled={i === 0} aria-label="Move up" onClick={() => update({ ...prefs, order: moveSection(prefs.order, s, -1) })}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" disabled={i === prefs.order.length - 1} aria-label="Move down" onClick={() => update({ ...prefs, order: moveSection(prefs.order, s, 1) })}><ChevronDown className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Show leases ending within (days)</span>
                <Input type="number" min={1} max={365} className="w-24" value={prefs.leaseWindowDays}
                  onChange={(e) => update({ ...prefs, leaseWindowDays: Math.max(1, Math.min(365, Number(e.target.value) || 1)) })} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Pop up automatically on first visit each day</span>
                <Switch checked={prefs.autoOpen} onCheckedChange={(v) => update({ ...prefs, autoOpen: v })} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Turn Morning Briefing off (turn back on in Settings)</span>
                <Button variant="ghost" size="sm" onClick={() => { update({ ...prefs, enabled: false }); setOpen(false); }}>Turn off</Button>
              </div>
              <div className="flex justify-end"><Button onClick={() => setCustomizing(false)}>Done</Button></div>
            </div>
          ) : (
            <div className="space-y-5">
              {!data ? <p className="text-sm text-muted-foreground">Loading…</p>
                : visible.length === 0 ? <p className="text-sm text-muted-foreground">All sections are turned off. Use Customize to choose what to see.</p>
                : visible.map((s) => (
                  <section key={s}>
                    <h3 className="text-sm font-semibold mb-1.5">{BRIEFING_SECTION_LABELS[s]} <span className="text-muted-foreground font-normal">({data[s].length})</span></h3>
                    {data[s].length === 0 ? <p className="text-sm text-muted-foreground">Nothing today.</p> : (
                      <ul className="divide-y divide-border/50 rounded-md bg-muted/30">
                        {data[s].slice(0, 8).map((it) => (
                          <li key={it.id}>
                            <button className="w-full text-left px-3 py-2 hover:bg-muted/60" onClick={() => { setOpen(false); navigate(it.to); }}>
                              <div className={`text-sm ${it.high ? 'text-destructive font-medium' : ''}`}>{it.title}</div>
                              <div className="text-xs text-muted-foreground">{it.detail}</div>
                            </button>
                          </li>
                        ))}
                        {data[s].length > 8 && <li className="px-3 py-1.5 text-xs text-muted-foreground">+{data[s].length - 8} more</li>}
                      </ul>
                    )}
                  </section>
                ))}
              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={() => setCustomizing(true)}>Customize</Button>
                <Button onClick={markReviewed}>Mark as reviewed for today</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
