import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Download, RotateCcw, Plus, Trash2, ListChecks } from 'lucide-react';
import { SendToSovDialog } from '@/components/estimating/SendToSovDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  EstimateLine,
  GROUP_ORDER,
  GROUP_LABELS,
  CONFIDENCE_NOTE,
  currency,
  estimateCsv,
  leveledBid,
  lineAmount,
  rollup,
  sumBaselineGroup,
  sumGroup,
} from '@/utils/estimateMath';

interface EstimateRecord {
  id: string;
  name: string;
  location: string | null;
  area_sf: number;
  scope_summary: string | null;
  assumptions: string[];
  notes: string | null;
  contingency_pct: number;
  overhead_pct: number;
  profit_pct: number;
  bond_pct: number;
}

interface Subcost {
  id: string;
  line_id: string;
  name: string;
  amount: number;
  kind: string;
  note: string | null;
}

interface Flag {
  id: string;
  severity: string;
  issue: string;
  finding: string | null;
  exposure: string | null;
  action: string | null;
}

interface BidRow {
  id: string;
  trade: string;
  company_name: string;
  raw_amount: number;
  leveling_additions: number;
  leveling_credits: number;
  inclusions: string | null;
  exclusions: string | null;
  notes: string | null;
}

const KIND_LABEL: Record<string, string> = {
  included: 'Included in parent cost',
  additive: 'Additive',
  alternate: 'Alternate',
  excluded: 'Excluded',
  allowance: 'Review allowance',
};

const confBadge = (c: string) =>
  c === 'A' ? 'default' : c === 'REVIEW' || c === 'D' ? 'destructive' : 'secondary';

export default function EstimateDashboard() {
  const { id } = useParams<{ id: string }>();
  const [est, setEst] = useState<EstimateRecord | null>(null);
  const [lines, setLines] = useState<EstimateLine[]>([]);
  const [subs, setSubs] = useState<Subcost[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [newBid, setNewBid] = useState({ trade: '', company_name: '', raw_amount: '' });
  const [sovOpen, setSovOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [e, l, f, b] = await Promise.all([
      supabase.from('estimates').select('*').eq('id', id).maybeSingle(),
      supabase.from('estimate_lines').select('*').eq('estimate_id', id).order('sort_order'),
      supabase.from('estimate_flags').select('*').eq('estimate_id', id),
      supabase.from('estimate_bids').select('*').eq('estimate_id', id).order('created_at'),
    ]);
    const lineRows = (l.data || []) as unknown as EstimateLine[];
    setEst(e.data as unknown as EstimateRecord);
    setLines(lineRows);
    setFlags((f.data || []) as Flag[]);
    setBids((b.data || []) as BidRow[]);
    if (lineRows.length) {
      const { data: s } = await supabase
        .from('estimate_subcosts')
        .select('*')
        .in('line_id', lineRows.map((r) => r.id))
        .order('sort_order');
      setSubs((s || []) as Subcost[]);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const settings = est
    ? {
        contingency_pct: est.contingency_pct,
        overhead_pct: est.overhead_pct,
        profit_pct: est.profit_pct,
        bond_pct: est.bond_pct,
      }
    : { contingency_pct: 0, overhead_pct: 0, profit_pct: 0, bond_pct: 0 };

  const totals = useMemo(() => rollup(lines, settings, est?.area_sf ?? 0), [lines, settings, est]);

  const saveSetting = async (field: keyof EstimateRecord, value: number) => {
    if (!est) return;
    setEst({ ...est, [field]: value } as EstimateRecord);
    await supabase.from('estimates').update({ [field]: value }).eq('id', est.id);
  };

  const saveOverride = async (line: EstimateLine, raw: string) => {
    const value = raw.trim() === '' ? null : Number(raw);
    setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, override_amount: value } : l)));
    await supabase.from('estimate_lines').update({ override_amount: value }).eq('id', line.id);
  };

  const resetOverrides = async () => {
    if (!est) return;
    setLines((prev) => prev.map((l) => ({ ...l, override_amount: null })));
    await supabase.from('estimate_lines').update({ override_amount: null }).eq('estimate_id', est.id);
    toast.success('Back to the independent baseline.');
  };

  const download = (content: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addBid = async () => {
    if (!est || !newBid.trade || !newBid.company_name) return toast.error('Trade and company are required.');
    await supabase.from('estimate_bids').insert({
      estimate_id: est.id,
      trade: newBid.trade,
      company_name: newBid.company_name,
      raw_amount: Number(newBid.raw_amount) || 0,
    });
    setNewBid({ trade: '', company_name: '', raw_amount: '' });
    load();
  };

  const updateBid = async (bid: BidRow, patch: Partial<BidRow>) => {
    setBids((prev) => prev.map((b) => (b.id === bid.id ? { ...b, ...patch } : b)));
    await supabase.from('estimate_bids').update(patch).eq('id', bid.id);
  };

  if (!est) {
    return (
      <Layout title="Bid Estimator">
        <p className="text-sm text-muted-foreground">Loading the estimate…</p>
      </Layout>
    );
  }

  const sectionsFor = (groupKey: string) => {
    const own = lines.filter((l) => l.group_key === groupKey);
    const names = Array.from(new Set(own.map((l) => l.section_name)));
    return names.map((n) => ({ name: n, items: own.filter((l) => l.section_name === n) }));
  };

  const kpi = [
    { label: 'Recommended bid', value: currency(totals.recommendedBid) },
    { label: 'Expected cost to us', value: currency(totals.expectedCost) },
    { label: 'Building direct', value: currency(totals.building) },
    { label: 'Site / civil direct', value: currency(totals.site) },
    { label: 'Direct construction', value: currency(totals.directConstruction) },
    { label: 'Bid / SF', value: est.area_sf ? `$${totals.bidPerSf.toFixed(2)}` : '—' },
  ];

  return (
    <Layout title={est.name}>
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{est.name}</h2>
              <p className="text-sm text-muted-foreground">
                {[est.location, est.area_sf ? `${est.area_sf.toLocaleString()} SF` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setSovOpen(true)}>
                <ListChecks className="mr-2 h-4 w-4" />
                Send to schedule of values
              </Button>
              <Button variant="outline" size="sm" onClick={() => download(estimateCsv(lines), `${est.name}.csv`, 'text/csv')}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => download(JSON.stringify({ estimate: est, lines, subs, flags, bids, totals }, null, 2), `${est.name}.json`, 'application/json')}
              >
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={resetOverrides}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset overrides
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-6">
            {kpi.map((k) => (
              <div key={k.label} className="rounded-md border p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
                <div className="mt-1 text-lg font-bold tabular-nums">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              ['Building general conditions', totals.buildingGc],
              ['Site general conditions', totals.siteGc],
              ['Total general conditions', totals.totalGc],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <strong className="tabular-nums">{currency(value as number)}</strong>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              ['Low position', totals.low],
              ['Expected / recommended', totals.recommendedBid],
              ['Conservative / high', totals.high],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-md border p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="mt-1 font-semibold tabular-nums">{currency(value as number)}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Low / expected / high are scenario analysis, not guaranteed outcomes.
          </p>
        </Card>

        <Tabs defaultValue="estimate">
          <TabsList className="flex-wrap">
            <TabsTrigger value="estimate">Estimate</TabsTrigger>
            <TabsTrigger value="buildup">Cost build-up</TabsTrigger>
            <TabsTrigger value="flags">Critical flags</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="bids">Bid audit & leveling</TabsTrigger>
          </TabsList>

          <TabsContent value="estimate" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold">Adjustable assumptions</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {([
                  ['Estimating contingency %', 'contingency_pct'],
                  ['Company overhead %', 'overhead_pct'],
                  ['Profit %', 'profit_pct'],
                  ['Bond / insurance %', 'bond_pct'],
                ] as const).map(([label, field]) => (
                  <div key={field}>
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={(est as any)[field]}
                      onChange={(e) => saveSetting(field as keyof EstimateRecord, Number(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="grid gap-2 text-sm md:grid-cols-2">
                {[
                  ['Direct construction', totals.directConstruction],
                  ['Total general conditions', totals.totalGc],
                  ['Other project costs', totals.other],
                  ['Contingency', totals.contingency],
                  ['Expected cost to company', totals.expectedCost],
                  ['Company overhead', totals.overhead],
                  ['Profit', totals.profit],
                  ['Bond / insurance', totals.bond],
                  ['Recommended bid', totals.recommendedBid],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between border-b py-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium tabular-nums">{currency(value as number)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold">Full cost breakdown</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Phase 1 — independent baseline. These cost lines are the project should-cost before any submitted bid is
                compared. Overriding a line never destroys the baseline behind it.
              </p>

              <div className="mt-4 space-y-5">
                {GROUP_ORDER.filter((g) => lines.some((l) => l.group_key === g)).map((groupKey) => (
                  <div key={groupKey} className="rounded-lg border">
                    <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
                      <span className="font-bold">{GROUP_LABELS[groupKey]}</span>
                      <div className="text-right">
                        <div className="font-bold tabular-nums">{currency(sumGroup(lines, groupKey))}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Baseline {currency(sumBaselineGroup(lines, groupKey))}
                        </div>
                      </div>
                    </div>

                    {sectionsFor(groupKey).map((section) => (
                      <div key={section.name} className="border-t">
                        <div className="flex items-center justify-between bg-muted/20 px-4 py-2 text-sm font-semibold">
                          <span>{section.name}</span>
                          <span className="tabular-nums">
                            {currency(section.items.reduce((s, l) => s + lineAmount(l), 0))}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[900px] text-sm">
                            <thead>
                              <tr className="text-left text-xs text-muted-foreground">
                                <th className="p-3">Cost line</th>
                                <th className="p-3 text-right">Qty</th>
                                <th className="p-3">Unit</th>
                                <th className="p-3 text-right">Unit cost</th>
                                <th className="p-3 text-right">Baseline</th>
                                <th className="p-3 text-right">Current / override</th>
                                <th className="p-3">Conf.</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.items.map((l) => (
                                <tr key={l.id} className="border-t align-top">
                                  <td className="p-3">
                                    <div className="font-medium">{l.name}</div>
                                    {l.basis && <div className="mt-1 text-xs text-muted-foreground">{l.basis}</div>}
                                    {l.source && <div className="text-[11px] text-muted-foreground">Source: {l.source}</div>}
                                  </td>
                                  <td className="p-3 text-right tabular-nums">{l.quantity?.toLocaleString() ?? '—'}</td>
                                  <td className="p-3">{l.unit ?? '—'}</td>
                                  <td className="p-3 text-right tabular-nums">
                                    {l.unit_cost != null ? currency(l.unit_cost) : '—'}
                                  </td>
                                  <td className="p-3 text-right tabular-nums text-muted-foreground">
                                    {currency(l.baseline_amount)}
                                  </td>
                                  <td className="p-3 text-right">
                                    <Input
                                      className="w-32 text-right"
                                      type="number"
                                      value={l.override_amount ?? ''}
                                      placeholder={String(Math.round(l.baseline_amount))}
                                      onChange={(e) => saveOverride(l, e.target.value)}
                                    />
                                  </td>
                                  <td className="p-3">
                                    <Badge variant={confBadge(l.confidence) as any} title={CONFIDENCE_NOTE[l.confidence]}>
                                      {l.confidence}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-xs">{l.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="buildup">
            <Card className="p-6">
              <h3 className="font-semibold">Detailed cost build-up</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Subcosts marked "included in parent cost" are already inside the cost line above them and are shown for
                traceability only — they are not added again.
              </p>
              <div className="mt-4 space-y-4">
                {lines
                  .filter((l) => subs.some((s) => s.line_id === l.id))
                  .map((l) => {
                    const own = subs.filter((s) => s.line_id === l.id);
                    const additive = own.filter((s) => s.kind === 'additive').reduce((s, x) => s + Number(x.amount), 0);
                    return (
                      <div key={l.id} className="rounded-lg border">
                        <div className="flex items-center justify-between bg-muted/40 px-4 py-2">
                          <div>
                            <div className="font-medium">{l.name}</div>
                            <div className="text-xs text-muted-foreground">{l.group_name} · {l.section_name}</div>
                          </div>
                          <div className="text-right tabular-nums font-semibold">{currency(lineAmount(l))}</div>
                        </div>
                        <table className="w-full text-sm">
                          <tbody>
                            {own.map((s) => (
                              <tr key={s.id} className="border-t">
                                <td className="p-3">{s.name}{s.note ? <span className="block text-xs text-muted-foreground">{s.note}</span> : null}</td>
                                <td className="p-3 text-xs text-muted-foreground">{KIND_LABEL[s.kind] ?? s.kind}</td>
                                <td className="p-3 text-right tabular-nums">{currency(Number(s.amount))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {additive > 0 && (
                          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                            Additive subcosts outside the parent line: {currency(additive)}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="flags">
            <Card className="p-6">
              <h3 className="font-semibold">Critical flags</h3>
              {!flags.length && <p className="mt-2 text-sm text-muted-foreground">No flags were raised on this set.</p>}
              <div className="mt-4 space-y-3">
                {flags.map((f) => (
                  <div key={f.id} className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={f.severity === 'critical' ? 'destructive' : 'secondary'}>{f.severity}</Badge>
                      <span className="font-medium">{f.issue}</span>
                    </div>
                    {f.finding && <p className="mt-2 text-sm"><strong>Finding: </strong>{f.finding}</p>}
                    {f.exposure && <p className="text-sm"><strong>Exposure: </strong>{f.exposure}</p>}
                    {f.action && <p className="text-sm"><strong>Recommended action: </strong>{f.action}</p>}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card className="space-y-4 p-6">
              <div>
                <h3 className="font-semibold">Scope summary</h3>
                <p className="mt-1 text-sm text-muted-foreground">{est.scope_summary || 'Not provided.'}</p>
              </div>
              <div>
                <h3 className="font-semibold">Assumptions</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {(est.assumptions || []).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Key number sources</h3>
                <div className="mt-2 space-y-2 text-sm">
                  {lines.filter((l) => l.source).map((l) => (
                    <div key={l.id} className="flex justify-between gap-4 border-b py-1">
                      <span>{l.name}</span>
                      <span className="text-right text-muted-foreground">{l.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bids">
            <Card className="p-6">
              <h3 className="font-semibold">Bid audit & leveling</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Phase 2. Submitted amounts are never altered — leveling is carried as additions and credits so every bid is
                compared apples-to-apples against the independent baseline.
              </p>

              <div className="mt-4 grid gap-2 md:grid-cols-4">
                <Input placeholder="Trade / scope" value={newBid.trade} onChange={(e) => setNewBid({ ...newBid, trade: e.target.value })} />
                <Input placeholder="Company" value={newBid.company_name} onChange={(e) => setNewBid({ ...newBid, company_name: e.target.value })} />
                <Input placeholder="Raw bid amount" type="number" value={newBid.raw_amount} onChange={(e) => setNewBid({ ...newBid, raw_amount: e.target.value })} />
                <Button onClick={addBid}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add bid
                </Button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="p-3">Trade</th>
                      <th className="p-3">Company</th>
                      <th className="p-3 text-right">Raw bid</th>
                      <th className="p-3 text-right">Leveling additions</th>
                      <th className="p-3 text-right">Leveling credits</th>
                      <th className="p-3 text-right">Leveled bid</th>
                      <th className="p-3 text-right">Vs. baseline trade</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((b) => {
                      const baseline = lines
                        .filter((l) => l.section_name.toLowerCase().includes(b.trade.toLowerCase()) || l.name.toLowerCase().includes(b.trade.toLowerCase()))
                        .reduce((s, l) => s + lineAmount(l), 0);
                      const leveled = leveledBid(b);
                      return (
                        <tr key={b.id} className="border-t">
                          <td className="p-3">{b.trade}</td>
                          <td className="p-3">{b.company_name}</td>
                          <td className="p-3 text-right tabular-nums">{currency(Number(b.raw_amount))}</td>
                          <td className="p-3 text-right">
                            <Input
                              className="w-28 text-right"
                              type="number"
                              value={b.leveling_additions}
                              onChange={(e) => updateBid(b, { leveling_additions: Number(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="p-3 text-right">
                            <Input
                              className="w-28 text-right"
                              type="number"
                              value={b.leveling_credits}
                              onChange={(e) => updateBid(b, { leveling_credits: Number(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="p-3 text-right font-semibold tabular-nums">{currency(leveled)}</td>
                          <td className="p-3 text-right tabular-nums">
                            {baseline > 0 ? `${leveled > baseline ? '+' : ''}${currency(leveled - baseline)}` : '—'}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                await supabase.from('estimate_bids').delete().eq('id', b.id);
                                load();
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
