import { useState } from 'react';
import { tth } from '@/integrations/supabase/tradertax';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { PositionCategory, RiskLevel, TthEngagement, TthPosition } from '@/types/tradertax';
import { money, positionStatusTone, riskTone, shortDate } from '@/utils/traderTax/labels';

interface ActionPlanPanelProps {
  engagement: TthEngagement;
  positions: TthPosition[];
  onRefresh: () => Promise<void> | void;
}

const CATEGORIES: PositionCategory[] = [
  'tts',
  'election',
  'entity',
  'retirement',
  'deductions',
  'compliance',
  'state',
  'estimated_tax',
  'general',
];

const STATUSES = ['proposed', 'accepted', 'declined', 'deferred', 'implemented'] as const;

const emptyForm = {
  title: '',
  category: 'general' as PositionCategory,
  recommendation: '',
  rationale: '',
  authority: '',
  risk_level: 'medium' as RiskLevel,
  impact_estimate: '',
  due_date: '',
  owner: '',
};

export function ActionPlanPanel({ engagement, positions, onRefresh }: ActionPlanPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await tth.from('tth_positions').update(patch).eq('id', id);
    if (error) {
      toast.error('Could not update', { description: error.message });
      return;
    }
    await onRefresh();
  };

  const remove = async (id: string) => {
    const { error } = await tth.from('tth_positions').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete', { description: error.message });
      return;
    }
    await onRefresh();
  };

  const create = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    const { error } = await tth.from('tth_positions').insert({
      engagement_id: engagement.id,
      code: `CUSTOM_${Date.now()}`,
      title: form.title.trim(),
      category: form.category,
      recommendation: form.recommendation.trim() || null,
      rationale: form.rationale.trim() || null,
      authority: form.authority.trim() || null,
      risk_level: form.risk_level,
      impact_estimate: form.impact_estimate ? Number(form.impact_estimate) : null,
      due_date: form.due_date || null,
      owner: form.owner.trim() || null,
      status: 'proposed',
      sort_order: positions.length,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not add the position', { description: error.message });
      return;
    }
    toast.success('Position added');
    setForm({ ...emptyForm });
    setDialogOpen(false);
    await onRefresh();
  };

  const totalImpact = positions
    .filter((p) => p.status === 'accepted' || p.status === 'implemented')
    .reduce((sum, p) => sum + Number(p.impact_estimate ?? 0), 0);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className="font-semibold">Action plan</h3>
          <p className="text-sm text-muted-foreground">
            {positions.length} position{positions.length === 1 ? '' : 's'} · accepted impact{' '}
            {money(totalImpact)}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add position
        </Button>
      </Card>

      {positions.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-medium">No positions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run the analysis and push the proposed positions here, or add one manually.
          </p>
        </Card>
      ) : (
        positions.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {p.category.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant={riskTone(p.risk_level)} className="text-[10px]">
                    {p.risk_level} risk
                  </Badge>
                  <Badge variant={positionStatusTone(p.status)} className="text-[10px]">
                    {p.status}
                  </Badge>
                </div>
                {p.recommendation && <p className="mt-2 text-sm">{p.recommendation}</p>}
                {p.rationale && (
                  <p className="mt-1 text-sm text-muted-foreground">{p.rationale}</p>
                )}
                {p.authority && (
                  <p className="mt-1 text-xs italic text-muted-foreground">{p.authority}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {p.due_date && <span>Due {shortDate(p.due_date)}</span>}
                  {p.owner && <span>Owner {p.owner}</span>}
                  {p.impact_estimate ? <span>Impact {money(Number(p.impact_estimate))}</span> : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={p.status}
                  onValueChange={(v) =>
                    update(p.id, {
                      status: v,
                      decided_at: ['accepted', 'declined'].includes(v)
                        ? new Date().toISOString()
                        : null,
                    })
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add a position</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as PositionCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Risk</Label>
              <Select
                value={form.risk_level}
                onValueChange={(v) => setForm({ ...form, risk_level: v as RiskLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Recommendation</Label>
              <Textarea
                rows={3}
                value={form.recommendation}
                onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Rationale</Label>
              <Textarea
                rows={3}
                value={form.rationale}
                onChange={(e) => setForm({ ...form, rationale: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Authority</Label>
              <Input
                value={form.authority}
                onChange={(e) => setForm({ ...form, authority: e.target.value })}
                placeholder="IRC sec. …, Rev. Proc. …"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated impact</Label>
              <Input
                type="number"
                value={form.impact_estimate}
                onChange={(e) => setForm({ ...form, impact_estimate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Owner</Label>
              <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
