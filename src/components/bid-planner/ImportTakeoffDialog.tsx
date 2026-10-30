import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseTakeoffFile, TakeoffLine } from '@/utils/takeoffImport';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  onDone: () => void;
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function ImportTakeoffDialog({ open, onOpenChange, projectId, onDone }: Props) {
  const [lines, setLines] = useState<TakeoffLine[]>([]);
  const [markup, setMarkup] = useState('10');
  const [replace, setReplace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = async (f?: File) => {
    if (!f) return;
    try {
      setFileName(f.name);
      setLines(await parseTakeoffFile(f));
    } catch (e) {
      setLines([]);
      toast.error((e as Error).message);
    }
  };

  const update = (i: number, patch: Partial<TakeoffLine>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const m = parseFloat(markup) || 0;
  const cost = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);

  const handleImport = async () => {
    if (!lines.length) return;
    setSaving(true);
    try {
      if (replace) {
        const { error } = await supabase.from('bid_items').delete().eq('project_id', projectId);
        if (error) throw error;
      }
      const { error } = await supabase.from('bid_items').insert(
        lines.map((l) => ({
          project_id: projectId,
          description: l.description,
          category: l.category,
          quantity: l.quantity,
          unit: l.unit,
          unit_cost: l.unit_cost,
          markup_pct: m,
          total: l.quantity * l.unit_cost * (1 + m / 100),
        })),
      );
      if (error) throw error;
      toast.success(`${lines.length} lines added to the bid.`);
      setLines([]);
      setFileName('');
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error((e as Error).message || 'Import failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CAD / takeoff export</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Upload the Excel or CSV your CAD or takeoff software exports. Columns like Description, Category, Qty, Unit, Unit Cost and Total are found automatically.
        </p>
        <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFile(e.target.files?.[0])} />
        {lines.length > 0 && (
          <>
            <div className="text-sm text-muted-foreground">{fileName}: {lines.length} lines found</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="p-1">Description</th><th className="p-1">Category</th><th className="p-1">Qty</th>
                    <th className="p-1">Unit</th><th className="p-1">Unit cost</th><th className="p-1 text-right">Cost</th><th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="p-1"><Input value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></td>
                      <td className="p-1"><Input value={l.category} onChange={(e) => update(i, { category: e.target.value })} /></td>
                      <td className="p-1 w-24"><Input type="number" step="0.001" value={l.quantity} onChange={(e) => update(i, { quantity: parseFloat(e.target.value) || 0 })} /></td>
                      <td className="p-1 w-20"><Input value={l.unit} onChange={(e) => update(i, { unit: e.target.value })} /></td>
                      <td className="p-1 w-28"><Input type="number" step="0.001" value={l.unit_cost} onChange={(e) => update(i, { unit_cost: parseFloat(e.target.value) || 0 })} /></td>
                      <td className="p-1 text-right whitespace-nowrap">{money(l.quantity * l.unit_cost)}</td>
                      <td className="p-1"><Button variant="ghost" size="sm" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Remove</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Label>Markup %</Label>
                <Input className="w-24" type="number" step="0.001" value={markup} onChange={(e) => setMarkup(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={replace} onCheckedChange={(v) => setReplace(!!v)} />
                Replace the current bid lines
              </label>
              <div className="ml-auto text-sm">
                Cost {money(cost)} · Bid <span className="font-semibold">{money(cost * (1 + m / 100))}</span>
              </div>
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!lines.length || saving} onClick={handleImport}>{saving ? 'Importing…' : 'Add to bid'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
