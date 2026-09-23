import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EstimateLine, GROUP_LABELS, currency, lineAmount, rollup, EstimateSettings } from '@/utils/estimateMath';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimateId: string;
  estimateName: string;
  lines: EstimateLine[];
  settings: EstimateSettings;
  areaSf: number;
  defaultProjectId?: string | null;
  onDone?: () => void;
}

type Grouping = 'line' | 'section' | 'group';
type Basis = 'sell' | 'cost';

interface DraftRow {
  key: string;
  category: string;
  subcategory: string | null;
  description: string;
  cost: number;
  lineId: string | null;
}

export function SendToSovDialog({
  open,
  onOpenChange,
  estimateId,
  estimateName,
  lines,
  settings,
  areaSf,
  defaultProjectId,
  onDone,
}: Props) {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState<string>(defaultProjectId || '');
  const [grouping, setGrouping] = useState<Grouping>('section');
  const [basis, setBasis] = useState<Basis>('sell');
  const [retainage, setRetainage] = useState('10');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [updateContract, setUpdateContract] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('projects')
      .select('id, name')
      .order('name')
      .then(({ data }) => setProjects(data || []));
  }, [open]);

  useEffect(() => {
    if (defaultProjectId) setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  const totals = useMemo(() => rollup(lines, settings, areaSf), [lines, settings, areaSf]);

  const rows: DraftRow[] = useMemo(() => {
    const priced = lines.filter((l) => lineAmount(l) !== 0);
    if (grouping === 'line') {
      return priced.map((l) => ({
        key: l.id,
        category: GROUP_LABELS[l.group_key] || l.group_name,
        subcategory: l.section_name,
        description: l.name,
        cost: lineAmount(l),
        lineId: l.id,
      }));
    }
    const map = new Map<string, DraftRow>();
    for (const l of priced) {
      const groupLabel = GROUP_LABELS[l.group_key] || l.group_name;
      const key = grouping === 'group' ? l.group_key : `${l.group_key}::${l.section_name}`;
      const existing = map.get(key);
      if (existing) {
        existing.cost += lineAmount(l);
      } else {
        map.set(key, {
          key,
          category: groupLabel,
          subcategory: grouping === 'section' ? l.section_name : null,
          description: grouping === 'group' ? groupLabel : l.section_name,
          cost: lineAmount(l),
          lineId: null,
        });
      }
    }
    return Array.from(map.values());
  }, [lines, grouping]);

  const costTotal = rows.reduce((s, r) => s + r.cost, 0);
  const contractTotal = basis === 'sell' ? totals.recommendedBid : costTotal;
  const factor = basis === 'sell' && costTotal > 0 ? totals.recommendedBid / costTotal : 1;

  const scheduledValue = (r: DraftRow) => Math.round(r.cost * factor * 100) / 100;

  const handleSend = async () => {
    if (!projectId) return toast.error('Pick the project this schedule of values belongs to.');
    if (!rows.length) return toast.error('This estimate has no priced cost lines yet.');
    setSaving(true);
    try {
      if (replaceExisting) {
        const { error } = await supabase.from('sov_items').delete().eq('project_id', projectId);
        if (error) throw error;
      }
      const { count } = await supabase
        .from('sov_items')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);
      const start = count || 0;

      const payload = rows.map((r, i) => ({
        project_id: projectId,
        item_number: String(start + i + 1).padStart(3, '0'),
        category: r.category,
        subcategory: r.subcategory,
        description: r.description,
        scheduled_value: scheduledValue(r),
        retainage_percentage: Number(retainage) || 0,
        source_estimate_id: estimateId,
        source_estimate_line_id: r.lineId,
      }));

      const { error: insErr } = await supabase.from('sov_items').insert(payload);
      if (insErr) throw insErr;

      if (updateContract) {
        await supabase
          .from('projects')
          .update({ contract_value: contractTotal, original_contract_sum: contractTotal })
          .eq('id', projectId);
      }

      await supabase
        .from('estimates')
        .update({ sov_project_id: projectId, sov_synced_at: new Date().toISOString() })
        .eq('id', estimateId);

      toast.success(`${payload.length} schedule of values lines created from ${estimateName}.`);
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Could not build the schedule of values.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Send this estimate to a schedule of values</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Level of detail</Label>
              <Select value={grouping} onValueChange={(v) => setGrouping(v as Grouping)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">One line per cost group</SelectItem>
                  <SelectItem value="section">One line per trade / section</SelectItem>
                  <SelectItem value="line">One line per estimate cost line</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Values</Label>
              <Select value={basis} onValueChange={(v) => setBasis(v as Basis)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">Billable value — markup spread to the recommended bid</SelectItem>
                  <SelectItem value="cost">Cost only — estimate amounts as they stand</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Retainage %</Label>
              <Input type="number" step="0.1" value={retainage} onChange={(e) => setRetainage(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={replaceExisting} onCheckedChange={(v) => setReplaceExisting(!!v)} />
              Replace the schedule of values already on this project
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={updateContract} onCheckedChange={(v) => setUpdateContract(!!v)} />
              Set the project contract amount to {currency(contractTotal)} so payment applications match
            </label>
          </div>

          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span>{rows.length} schedule of values lines</span>
              <span>Total {currency(contractTotal)}</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {rows.map((r) => (
                <div key={r.key} className="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0">
                  <div className="min-w-0 pr-3">
                    <div className="truncate font-medium">{r.description}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.category}</div>
                  </div>
                  <span className="tabular-nums">{currency(scheduledValue(r))}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The estimate baseline is not changed. Once these lines exist, a payment application for this project can
            import them directly.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={saving}>
            {saving ? 'Building…' : 'Create schedule of values'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
