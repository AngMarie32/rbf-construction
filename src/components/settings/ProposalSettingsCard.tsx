import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, FileSignature, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_PROPOSAL_SETTINGS, loadProposalSettings, saveProposalSettings, type ProposalSettings } from '@/lib/proposalSettings';

/** Settings → Proposals: the intro sentence, terms and conditions, and acceptance text on every proposal. */
export function ProposalSettingsCard() {
  const [s, setS] = useState<ProposalSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProposalSettings().then(setS);
  }, []);

  if (!s) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading proposal settings…</CardContent>
      </Card>
    );
  }

  const setTerm = (i: number, v: string) => setS({ ...s, terms: s.terms.map((t, j) => (j === i ? v : t)) });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= s.terms.length) return;
    const t = [...s.terms];
    [t[i], t[j]] = [t[j], t[i]];
    setS({ ...s, terms: t });
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveProposalSettings({ ...s, terms: s.terms.map((t) => t.trim()).filter(Boolean) });
      toast.success('Proposal wording saved. New proposal PDFs use it.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" /> Proposals
        </CardTitle>
        <CardDescription>
          The wording on every proposal. Use {'{company}'}, {'{project}'} and {'{days}'} and they're filled in for each proposal. A proposal that has its own terms keeps them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="ps-intro">Opening paragraph</Label>
          <Textarea id="ps-intro" rows={3} value={s.intro} onChange={(e) => setS({ ...s, intro: e.target.value })} />
          <p className="mt-1 text-xs text-muted-foreground">Shown above the price. Avoid saying what the price covers unless it's true for every job.</p>
        </div>

        <div className="max-w-[200px]">
          <Label htmlFor="ps-days">Proposal valid for (days)</Label>
          <Input id="ps-days" type="number" min={1} value={s.validDays} onChange={(e) => setS({ ...s, validDays: Math.max(1, Number(e.target.value) || 30) })} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Terms and conditions</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => setS({ ...s, terms: [...s.terms, ''] })}>
              <Plus className="h-4 w-4" /> Add term
            </Button>
          </div>
          <ol className="mt-2 space-y-2">
            {s.terms.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2.5 w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}.</span>
                <Textarea rows={2} className="min-h-[44px] flex-1" value={t} onChange={(e) => setTerm(i, e.target.value)} />
                <div className="flex flex-col">
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6" aria-label="Move down" disabled={i === s.terms.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button type="button" size="icon" variant="ghost" className="mt-1 h-8 w-8 text-destructive" aria-label="Remove term" onClick={() => setS({ ...s, terms: s.terms.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <Label htmlFor="ps-accept">Acceptance text (above the signature lines)</Label>
          <Textarea id="ps-accept" rows={3} value={s.acceptance} onChange={(e) => setS({ ...s, acceptance: e.target.value })} />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button type="button" variant="ghost" onClick={() => setS(DEFAULT_PROPOSAL_SETTINGS)}>
            <RotateCcw className="h-4 w-4" /> Restore defaults
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save proposal wording
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
