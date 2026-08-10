import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Loader2, FileText, Trash2, Split, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Equipment } from '@/types/equipment';

const CATEGORIES = [
  'Preventive Maintenance',
  'Tires/Tracks',
  'Hydraulics',
  'Engine',
  'Drivetrain',
  'Electrical',
  'Brakes/Wear',
  'Body/Attachment',
  'Inspection',
  'Other',
];

interface DraftLine {
  key: string;
  include: boolean;
  equipment_id: string;
  equipment_guess: string;
  date: string;
  description: string;
  category: string;
  cost: string;
  hours_meter: string;
  confidence: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment[];
  onImported: () => void;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function RepairInvoiceImportDialog({ open, onOpenChange, equipment, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<{ vendor?: string; invoice_number?: string; invoice_date?: string } | null>(null);
  const [tax, setTax] = useState('0');
  const [fees, setFees] = useState('0');
  const [docTotal, setDocTotal] = useState('');
  const [taxMode, setTaxMode] = useState<'allocate' | 'line' | 'ignore'>('allocate');
  const [splitKey, setSplitKey] = useState<string | null>(null);
  const [splitUnits, setSplitUnits] = useState<string[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [dupes, setDupes] = useState<{ id: string; date: string; cost: number; description: string }[]>([]);
  const [dupChecking, setDupChecking] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const reset = () => {
    setFile(null);
    setLines([]);
    setMeta(null);
    setTax('0');
    setFees('0');
    setDocTotal('');
    setSplitKey(null);
    setSplitUnits([]);
    setDupes([]);
    setAllowDuplicate(false);
  };

  // Flag invoices already imported with the same invoice # from the same vendor.
  useEffect(() => {
    const invNo = (meta?.invoice_number || '').trim();
    const vendor = (meta?.vendor || '').trim();
    setAllowDuplicate(false);
    if (!invNo) {
      setDupes([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setDupChecking(true);
      try {
        const { data, error } = await supabase
          .from('maintenance_logs')
          .select('id, date, cost, description')
          .ilike('description', `%Inv ${invNo}%`)
          .limit(50);
        if (error) throw error;
        const v = vendor.toLowerCase();
        const matches = (data || []).filter((r: any) =>
          v ? String(r.description || '').toLowerCase().includes(v) : true
        );
        if (!cancelled) setDupes(matches as any);
      } catch {
        if (!cancelled) setDupes([]);
      } finally {
        if (!cancelled) setDupChecking(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [meta?.invoice_number, meta?.vendor]);

  const toBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const handleRead = async (selected: File) => {
    if (selected.size > 6 * 1024 * 1024) {
      toast.error('File must be under 6MB — try a lower-resolution scan or split the PDF');
      return;
    }
    setFile(selected);
    setReading(true);
    try {
      const fileBase64 = await toBase64(selected);
      const { data, error } = await supabase.functions.invoke('parse-repair-invoice', {
        body: {
          fileBase64,
          mimeType: selected.type || 'application/pdf',
          fileName: selected.name,
          equipment: equipment.map((e) => ({
            id: e.id,
            name: e.name,
            category: e.category,
            year: e.year,
            vin_serial_number: e.vin_serial_number,
          })),
        },
      });
      if (error) {
        let detail = error.message;
        const ctx: any = (error as any).context;
        try {
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.clone().json();
            if (body?.error) detail = body.error;
          }
        } catch {
          /* ignore body parse failure */
        }
        throw new Error(detail);
      }
      if ((data as any)?.error) throw new Error((data as any).error);

      const items = ((data as any)?.line_items || []) as any[];
      if (!items.length) {
        toast.error('No repair line items were found on that document');
      }
      setMeta({
        vendor: (data as any)?.vendor || '',
        invoice_number: (data as any)?.invoice_number || '',
        invoice_date: (data as any)?.invoice_date || '',
      });
      setTax(String(Number((data as any)?.tax || 0).toFixed(2)));
      setFees(String(Number((data as any)?.fees || 0).toFixed(2)));
      setDocTotal(
        (data as any)?.document_total != null
          ? String(Number((data as any).document_total).toFixed(2))
          : ''
      );
      setLines(
        items.map((it, i) => ({
          key: `${i}-${Date.now()}`,
          include: true,
          equipment_id: equipment.some((e) => e.id === it.equipment_id) ? it.equipment_id : '',
          equipment_guess: it.equipment_guess || '',
          date: it.date || (data as any)?.invoice_date || new Date().toISOString().slice(0, 10),
          description: it.description || '',
          category: CATEGORIES.includes(it.category) ? it.category : 'Other',
          cost: Number(it.cost || 0).toFixed(3),
          hours_meter: it.hours_meter != null ? String(it.hours_meter) : '',
          confidence: Number(it.confidence ?? 0),
        }))
      );
    } catch (e: any) {
      toast.error(e.message || 'Could not read that document');
    } finally {
      setReading(false);
    }
  };

  const update = (key: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const selected = lines.filter((l) => l.include);
  const unmatched = selected.filter((l) => !l.equipment_id).length;
  const lineTotal = selected.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
  const taxNum = taxMode === 'ignore' ? 0 : parseFloat(tax) || 0;
  const feesNum = taxMode === 'ignore' ? 0 : parseFloat(fees) || 0;
  const total = round2(lineTotal + taxNum + feesNum);
  const docTotalNum = docTotal === '' ? null : parseFloat(docTotal) || 0;
  const variance = docTotalNum == null ? 0 : round2(docTotalNum - total);

  const balanceToTotal = () => {
    if (docTotalNum == null) return;
    setTax(String(round2((parseFloat(tax) || 0) + variance).toFixed(2)));
    if (taxMode === 'ignore') setTaxMode('allocate');
  };

  const openSplit = (key: string) => {
    const l = lines.find((x) => x.key === key);
    setSplitUnits(l?.equipment_id ? [l.equipment_id] : []);
    setSplitKey(key);
  };

  const applySplit = () => {
    const source = lines.find((l) => l.key === splitKey);
    if (!source || splitUnits.length < 2) return;
    const cost = parseFloat(source.cost) || 0;
    const share = round2(cost / splitUnits.length);
    const parts = splitUnits.map((id, i) => ({
      ...source,
      key: `${source.key}-s${i}`,
      equipment_id: id,
      equipment_guess: '',
      cost: (i === splitUnits.length - 1
        ? round2(cost - share * (splitUnits.length - 1))
        : share
      ).toFixed(3),
      description: `${source.description} (split ${i + 1}/${splitUnits.length})`,
    }));
    setLines((prev) => prev.flatMap((l) => (l.key === splitKey ? parts : [l])));
    setSplitKey(null);
    setSplitUnits([]);
  };

  const handleSave = async () => {
    if (!selected.length) return;
    if (unmatched) {
      toast.error(`${unmatched} line${unmatched > 1 ? 's' : ''} still need a unit assigned`);
      return;
    }
    if (dupes.length && !allowDuplicate) {
      toast.error('This invoice number was already imported for this vendor — confirm to import anyway');
      return;
    }
    setSaving(true);
    try {
      const addOns = round2(taxNum + feesNum);
      const base = selected.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
      const allocFor = (l: DraftLine) =>
        base > 0 ? round2(((parseFloat(l.cost) || 0) / base) * addOns) : 0;

      // Ensure allocations sum exactly to the add-on amount.
      const allocations = selected.map(allocFor);
      if (addOns !== 0 && allocations.length) {
        const diff = round2(addOns - allocations.reduce((s, v) => s + v, 0));
        allocations[allocations.length - 1] = round2(allocations[allocations.length - 1] + diff);
      }

      const payload = selected.map((l, i) => ({
        equipment_id: l.equipment_id,
        date: l.date,
        description: [
          l.category !== 'Other' ? `[${l.category}]` : '',
          l.description,
          l.hours_meter ? `(meter ${l.hours_meter} hrs)` : '',
          meta?.vendor ? `— ${meta.vendor}` : '',
          meta?.invoice_number ? `Inv ${meta.invoice_number}` : '',
          taxMode === 'allocate' && allocations[i] ? `+ tax/fees ${allocations[i].toFixed(2)}` : '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim(),
        cost:
          taxMode === 'allocate'
            ? round2((parseFloat(l.cost) || 0) + allocations[i])
            : parseFloat(l.cost) || 0,
      }));

      if (taxMode === 'line' && addOns !== 0) {
        selected.forEach((l, i) => {
          if (!allocations[i]) return;
          payload.push({
            equipment_id: l.equipment_id,
            date: l.date,
            description: [
              '[Other] Sales tax & fees',
              meta?.vendor ? `— ${meta.vendor}` : '',
              meta?.invoice_number ? `Inv ${meta.invoice_number}` : '',
            ]
              .filter(Boolean)
              .join(' ')
              .trim(),
            cost: allocations[i],
          });
        });
      }

      const { error } = await supabase.from('maintenance_logs').insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} repair record${payload.length > 1 ? 's' : ''} added`);
      reset();
      onOpenChange(false);
      onImported();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save repair records');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Repair Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-6 text-center">
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Upload a typed or handwritten invoice, work order, or repair ticket
                </p>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  Select File
                </Button>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG or HEIC up to 15MB</p>
              </div>
            )}
            <Input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleRead(f);
                e.target.value = '';
              }}
            />
          </div>

          {reading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading the document…
            </div>
          )}

          {!reading && lines.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Vendor</Label>
                  <Input
                    value={meta?.vendor || ''}
                    onChange={(e) => setMeta((m) => ({ ...m, vendor: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Invoice #</Label>
                  <Input
                    value={meta?.invoice_number || ''}
                    onChange={(e) => setMeta((m) => ({ ...m, invoice_number: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Invoice Date</Label>
                  <Input
                    type="date"
                    value={meta?.invoice_date || ''}
                    onChange={(e) => setMeta((m) => ({ ...m, invoice_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4 rounded-lg border p-3">
                {null}
                <div>
                  <Label className="text-xs">Sales tax</Label>
                  <Input type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Shop supplies / fees</Label>
                  <Input type="number" step="0.01" value={fees} onChange={(e) => setFees(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Invoice total (from document)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={docTotal}
                    onChange={(e) => setDocTotal(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tax & fees handling</Label>
                  <Select value={taxMode} onValueChange={(v) => setTaxMode(v as typeof taxMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allocate">Roll into each line (pro-rata)</SelectItem>
                      <SelectItem value="line">Add as separate tax line</SelectItem>
                      <SelectItem value="ignore">Exclude tax & fees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead className="min-w-[190px]">Unit</TableHead>
                      <TableHead className="min-w-[140px]">Date</TableHead>
                      <TableHead className="min-w-[240px]">Detail</TableHead>
                      <TableHead className="min-w-[170px]">Type</TableHead>
                      <TableHead className="min-w-[120px]">Cost</TableHead>
                      <TableHead className="min-w-[90px]">Meter</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((l) => (
                      <TableRow key={l.key} className={!l.equipment_id && l.include ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={l.include}
                            onCheckedChange={(v) => update(l.key, { include: Boolean(v) })}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={l.equipment_id || 'unassigned'}
                            onValueChange={(v) => update(l.key, { equipment_id: v === 'unassigned' ? '' : v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {equipment.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {l.equipment_guess && (
                            <p className="mt-1 text-xs text-muted-foreground">Read as: {l.equipment_guess}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input type="date" value={l.date} onChange={(e) => update(l.key, { date: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={l.description}
                            onChange={(e) => update(l.key, { description: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={l.category} onValueChange={(v) => update(l.key, { category: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            value={l.cost}
                            onChange={(e) => update(l.key, { cost: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={l.hours_meter}
                            onChange={(e) => update(l.key, { hours_meter: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-end gap-1">
                            {l.confidence > 0 && l.confidence < 0.7 && (
                              <Badge variant="secondary" className="text-[10px]">
                                Verify
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Split across units"
                              onClick={() => openSplit(l.key)}
                            >
                              <Split className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-sm text-muted-foreground">
                  {selected.length} of {lines.length} selected · Lines{' '}
                  <span className="font-medium text-foreground">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lineTotal)}
                  </span>
                  {taxMode !== 'ignore' && (taxNum || feesNum) ? (
                    <>
                      {' '}
                      + tax/fees{' '}
                      <span className="font-medium text-foreground">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(taxNum + feesNum)}
                      </span>
                    </>
                  ) : null}{' '}
                  = Total{' '}
                  <span className="font-medium text-foreground">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
                  </span>
                  {docTotalNum != null && (
                    variance === 0 ? (
                      <Badge className="ml-2 border-0 bg-green-500/15 text-green-600">Matches invoice</Badge>
                    ) : (
                      <span className="ml-2">
                        <Badge className="border-0 bg-yellow-500/15 text-yellow-600">
                          Off by {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(variance)}
                        </Badge>
                        <Button variant="link" size="sm" className="h-auto p-0 ml-2" onClick={balanceToTotal}>
                          Balance to invoice
                        </Button>
                      </span>
                    )
                  )}
                  {unmatched > 0 && (
                    <span className="ml-2 text-destructive">{unmatched} need a unit</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving || !selected.length}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve & Add {selected.length ? `(${selected.length})` : ''}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>

      </Dialog>
      <Dialog open={!!splitKey} onOpenChange={(o) => !o && setSplitKey(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Split cost across units</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pick every unit this line covers. The cost is divided evenly, with rounding applied to
              the last unit so the invoice still balances.
            </p>
            <div className="max-h-72 overflow-auto rounded-md border divide-y">
              {equipment.map((eq) => (
                <label key={eq.id} className="flex items-center gap-3 p-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={splitUnits.includes(eq.id)}
                    onCheckedChange={() =>
                      setSplitUnits((prev) =>
                        prev.includes(eq.id) ? prev.filter((x) => x !== eq.id) : [...prev, eq.id]
                      )
                    }
                  />
                  <span>{eq.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSplitKey(null)}>
                Cancel
              </Button>
              <Button onClick={applySplit} disabled={splitUnits.length < 2}>
                Split into {splitUnits.length || 0}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
