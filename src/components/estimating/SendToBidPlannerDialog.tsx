import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompanies } from '@/contexts/CompanyContext';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { EstimateLine, EstimateSettings, GROUP_LABELS, currency, lineAmount, rollup } from '@/utils/estimateMath';

export type BidPlannerMode = 'existing' | 'new';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BidPlannerMode;
  estimateId: string;
  estimateName: string;
  location: string | null;
  lines: EstimateLine[];
  settings: EstimateSettings;
  areaSf: number;
  defaultProjectId?: string | null;
  onDone?: () => void;
}

const DIVISION_BY_GROUP: Record<string, string> = {
  building: 'Building',
  site: 'Site Work',
  building_gc: 'General Conditions',
  site_gc: 'General Conditions',
  other: 'Other',
};

export function SendToBidPlannerDialog({
  open,
  onOpenChange,
  mode,
  estimateId,
  estimateName,
  location,
  lines,
  settings,
  areaSf,
  defaultProjectId,
  onDone,
}: Props) {
  const navigate = useNavigate();
  const { selectedIds, companies } = useCompanies();
  const [projects, setProjects] = useState<{ id: string; name: string; status: string | null }[]>([]);
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [name, setName] = useState(estimateName);
  const [client, setClient] = useState('');
  const [markupMode, setMarkupMode] = useState<'match' | 'custom'>('match');
  const [customMarkup, setCustomMarkup] = useState('10');
  const [replace, setReplace] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(estimateName);
    setProjectId(defaultProjectId || '');
    if (mode === 'existing') {
      supabase
        .from('projects')
        .select('id, name, status')
        .order('name')
        .then(({ data }) => setProjects(sortProjectsOpenFirst(data || [])));
    }
  }, [open, mode, estimateName, defaultProjectId]);

  const priced = useMemo(() => lines.filter((l) => lineAmount(l) !== 0), [lines]);
  const cost = priced.reduce((s, l) => s + lineAmount(l), 0);
  const totals = useMemo(() => rollup(lines, settings, areaSf), [lines, settings, areaSf]);
  const matchMarkup = cost > 0 ? (totals.recommendedBid / cost - 1) * 100 : 0;
  const markupPct = markupMode === 'match' ? matchMarkup : Number(customMarkup) || 0;
  const sell = cost * (1 + markupPct / 100);

  const buildItems = (pid: string) =>
    priced.map((l) => {
      const amount = lineAmount(l);
      const qty = l.quantity && l.quantity > 0 ? Number(l.quantity) : 1;
      return {
        project_id: pid,
        division: DIVISION_BY_GROUP[l.group_key] || 'Other',
        category: l.section_name || GROUP_LABELS[l.group_key] || 'General',
        subcategory: GROUP_LABELS[l.group_key] || l.group_name || null,
        description: l.name,
        quantity: qty,
        unit: l.unit || (qty === 1 ? 'LS' : 'each'),
        unit_cost: amount / qty,
        markup_pct: Math.round(markupPct * 1000) / 1000,
        source_estimate_id: estimateId,
        source_estimate_line_id: l.id,
      };
    });

  const handleSubmit = async () => {
    if (!priced.length) return toast.error('This estimate has no priced cost lines yet.');
    setSaving(true);
    try {
      let pid = projectId;
      if (mode === 'new') {
        if (!name.trim()) throw new Error('Give the new project a name.');
        const companyId = selectedIds[0] ?? companies[0]?.id ?? null;
        const { data: proj, error } = await supabase
          .from('projects')
          .insert({
            name: name.trim(),
            client: client.trim() || null,
            address: location || null,
            type: 'General',
            status: 'Planning',
            contract_value: Math.round(sell * 100) / 100,
            company_id: companyId,
          })
          .select('id')
          .single();
        if (error) throw error;
        pid = proj.id;
      } else {
        if (!pid) throw new Error('Pick the project to send these lines to.');
        if (replace) {
          const { error } = await supabase.from('bid_items').delete().eq('project_id', pid);
          if (error) throw error;
        }
      }

      const { error: insErr } = await supabase.from('bid_items').insert(buildItems(pid));
      if (insErr) throw insErr;
      await supabase.from('estimates').update({ project_id: pid }).eq('id', estimateId);

      toast.success(`${priced.length} lines added to the Bid Planner.`);
      onOpenChange(false);
      onDone?.();
      navigate(`/bid-planner?project=${pid}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Could not send to the Bid Planner.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'new' ? 'New project from estimate' : 'Send to Bid Planner'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'new' ? (
            <>
              <div>
                <Label>Project name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Client</Label>
                <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Optional" />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Project</Label>
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
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={replace} onCheckedChange={(v) => setReplace(!!v)} />
                Replace the project's current bid lines
              </label>
            </>
          )}

          <div>
            <Label>Markup on each line</Label>
            <Select value={markupMode} onValueChange={(v) => setMarkupMode(v as 'match' | 'custom')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Match recommended bid ({matchMarkup.toFixed(2)}%)</SelectItem>
                <SelectItem value="custom">Set my own %</SelectItem>
              </SelectContent>
            </Select>
            {markupMode === 'custom' && (
              <Input
                className="mt-2"
                type="number"
                step="0.001"
                value={customMarkup}
                onChange={(e) => setCustomMarkup(e.target.value)}
              />
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Each line keeps its own cost and markup — you can change either in the Bid Planner.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-md bg-muted p-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Lines</div>
              <div className="font-semibold">{priced.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Cost</div>
              <div className="font-semibold">{currency(cost)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">With markup</div>
              <div className="font-semibold">{currency(sell)}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Working…' : mode === 'new' ? 'Create project' : 'Send lines'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
