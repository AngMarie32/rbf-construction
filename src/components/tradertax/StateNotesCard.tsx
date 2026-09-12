import { useCallback, useEffect, useMemo, useState } from 'react';
import { tth } from '@/integrations/supabase/tradertax';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BookMarked, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TthStatePosition } from '@/types/tradertax';
import {
  CONFIDENCE_LABEL,
  StateConfidence,
  stateNotesFor,
  stateProfileFor,
  statesInPlay,
} from '@/utils/traderTax/stateConformity';
import { shortDate } from '@/utils/traderTax/labels';

const TONE: Record<StateConfidence, string> = {
  high: 'success',
  medium: 'warning',
  research: 'destructive',
};

interface StateNotesCardProps {
  homeState: string | null;
  otherStates: string[];
  companyId: string | null;
}

/**
 * State treatment is where trader returns quietly go wrong. The shipped notes
 * are a prompt list, not authority — anything the firm confirms is written to
 * tth_state_positions and shown above them, so the research is done once.
 */
export function StateNotesCard({ homeState, otherStates, companyId }: StateNotesCardProps) {
  const { user } = useAuth();
  const [positions, setPositions] = useState<TthStatePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ state_code: '', topic: '', position: '', citation: '' });

  const states = useMemo(() => statesInPlay(homeState, otherStates), [homeState, otherStates]);

  const load = useCallback(async () => {
    setLoading(true);
    if (states.length === 0) {
      setPositions([]);
      setLoading(false);
      return;
    }
    const { data } = await tth
      .from('tth_state_positions')
      .select('*')
      .in('state_code', states)
      .order('state_code');
    setPositions((data ?? []) as TthStatePosition[]);
    setLoading(false);
  }, [states]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form.state_code.trim() || !form.position.trim()) {
      toast.error('State and position are required');
      return;
    }
    setBusy(true);
    const { error } = await tth.from('tth_state_positions').insert({
      company_id: companyId,
      state_code: form.state_code.trim().toUpperCase(),
      topic: form.topic.trim() || 'general',
      position: form.position.trim(),
      citation: form.citation.trim() || null,
      verified_on: new Date().toISOString().slice(0, 10),
      verified_by: user?.email ?? null,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error('Could not save the position', { description: error.message });
      return;
    }
    toast.success('Position recorded — the next client in this state inherits it');
    setForm({ state_code: '', topic: '', position: '', citation: '' });
    setOpen(false);
    await load();
  };

  if (states.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="font-semibold">State treatment</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No states recorded on the intake yet.
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">State treatment</h3>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record a position
          </Button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          A section 475 election is federal. Whether a state respects the ordinary characterization,
          whether a trading loss can offset wages, and whether short-term gains carry their own rate are
          separate questions per state.
        </p>

        <div className="space-y-4">
          {states.map((code) => {
            const profile = stateProfileFor(code);
            const notes = stateNotesFor(code);
            const confirmed = positions.filter((p) => p.state_code === code);
            return (
              <div key={code} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {code}
                    {profile ? ` — ${profile.name}` : ''}
                  </span>
                  {code === homeState?.toUpperCase() && (
                    <Badge variant="outline" className="text-[10px]">
                      resident
                    </Badge>
                  )}
                  {confirmed.length > 0 && (
                    <Badge variant="success" className="text-[10px]">
                      {confirmed.length} confirmed
                    </Badge>
                  )}
                </div>

                {confirmed.map((p) => (
                  <div key={p.id} className="mt-2 rounded-md border border-emerald-200 bg-emerald-50/60 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                        {p.topic}
                      </span>
                      <span className="text-xs text-emerald-700">
                        verified {shortDate(p.verified_on)}
                        {p.verified_by ? ` by ${p.verified_by}` : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{p.position}</p>
                    {p.citation && <p className="mt-1 text-xs italic text-muted-foreground">{p.citation}</p>}
                  </div>
                ))}

                <div className="mt-2 space-y-2">
                  {notes.map((n, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{n.headline}</span>
                        <Badge variant={TONE[n.confidence] as never} className="text-[10px]">
                          {CONFIDENCE_LABEL[n.confidence]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{n.detail}</p>
                      <p className="mt-1 text-xs italic text-muted-foreground">→ {n.verifyPrompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a state position</DialogTitle>
            <DialogDescription>
              Once you research a state, write it down here. Every future client in that state inherits
              it, and the shipped prompt gets replaced by your own answer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                maxLength={2}
                value={form.state_code}
                onChange={(e) => setForm({ ...form, state_code: e.target.value.toUpperCase() })}
                placeholder="CA"
              />
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="sec475_conformity"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Position</Label>
              <Textarea
                rows={4}
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="What the state actually does, and what it means for the return."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Citation</Label>
              <Input
                value={form.citation}
                onChange={(e) => setForm({ ...form, citation: e.target.value })}
                placeholder="Statute, regulation, or published guidance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save position
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
