import { useEffect, useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const SCORE_CRITERIA = [
  { key: 'quality', label: 'Quality of work', hint: 'Workmanship, punch items, callbacks' },
  { key: 'schedule', label: 'Schedule', hint: 'Shows up and finishes on time' },
  { key: 'price', label: 'Price', hint: 'Competitive bids, few surprise change orders' },
  { key: 'communication', label: 'Communication', hint: 'Responsive, paperwork on time' },
  { key: 'safety', label: 'Safety & cleanliness', hint: 'Safe crews, clean site' },
] as const;
export type CriterionKey = (typeof SCORE_CRITERIA)[number]['key'];
export interface Scorecard { scores: Partial<Record<CriterionKey, number>>; note?: string; rated_at?: string }

/** Read-only or clickable 1–5 stars. */
export function StarRating({ value, onChange, size = 'sm' }: { value: number | null | undefined; onChange?: (v: number) => void; size?: 'sm' | 'lg' }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const cls = size === 'lg' ? 'h-6 w-6' : 'h-3.5 w-3.5';
  return (
    <div className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, shown - (i - 1)));
        const star = (
          <span className={cn('relative inline-block', cls)}>
            <Star className={cn(cls, 'text-slate-300 dark:text-slate-600')} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn(cls, 'fill-amber-400 text-amber-400')} />
              </span>
            )}
          </span>
        );
        return onChange ? (
          <button key={i} type="button" onMouseEnter={() => setHover(i)} onClick={() => onChange(i)} aria-label={`${i} star${i > 1 ? 's' : ''}`} className="rounded focus-visible:ring-2 focus-visible:ring-ring">
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </div>
  );
}

interface Props {
  sub: { id: string; name: string; company: string | null; rating: number | null; scorecard?: Scorecard | null } | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function SubcontractorScorecardDialog({ sub, onOpenChange, onSaved }: Props) {
  const [scores, setScores] = useState<Partial<Record<CriterionKey, number>>>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sub) return;
    setScores(sub.scorecard?.scores || {});
    setNote(sub.scorecard?.note || '');
  }, [sub]);

  const rated = SCORE_CRITERIA.filter((c) => scores[c.key]);
  const overall = rated.length ? rated.reduce((s, c) => s + (scores[c.key] || 0), 0) / rated.length : null;

  const save = async () => {
    if (!sub || overall == null) return toast.error('Rate at least one category.');
    setSaving(true);
    const rating = Math.round(overall * 10) / 10;
    const scorecard: Scorecard = { scores, note: note || undefined, rated_at: new Date().toISOString() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { error } = await supabase.from('subcontractors').update({ rating, scorecard } as any).eq('id', sub.id);
    let partial = false;
    if (error && /scorecard/i.test(error.message)) {
      // Database not updated yet: keep the overall rating, skip the per-category detail.
      ({ error } = await supabase.from('subcontractors').update({ rating }).eq('id', sub.id));
      partial = !error;
    }
    setSaving(false);
    if (error) return toast.error(`Couldn't save the rating: ${error.message}`);
    toast.success(partial ? 'Overall rating saved. Category scores need the latest database update to be kept.' : 'Rating saved.');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={!!sub} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rate {sub?.company || sub?.name}</DialogTitle>
          <DialogDescription>
            Score each area from 1 to 5. The overall rating is the average and sets their rank.
            {sub?.rating != null && !sub?.scorecard && ` Current rating: ${Number(sub.rating).toFixed(1)}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {SCORE_CRITERIA.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.hint}</p>
              </div>
              <StarRating size="lg" value={scores[c.key]} onChange={(v) => setScores((s) => ({ ...s, [c.key]: v }))} />
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm font-medium">Overall</span>
            <span className="flex items-center gap-2">
              <StarRating value={overall} />
              <span className="font-display text-lg font-bold tabular-nums">{overall == null ? '—' : overall.toFixed(1)}</span>
            </span>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes on this subcontractor's work" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || overall == null}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
