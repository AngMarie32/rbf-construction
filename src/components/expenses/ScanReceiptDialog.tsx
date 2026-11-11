import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { toast } from 'sonner';

const CATEGORIES = [
  'Materials', 'Labor', 'Equipment', 'Subcontractors', 'Permits', 'Travel', 'Utilities',
  'Office Supplies', 'Insurance', 'Professional Services', 'Fuel', 'Maintenance', 'Other',
];

interface ProjectOption { id: string; name: string; client?: string | null; address?: string | null; status?: string | null }

interface ScanReceiptDialogProps {
  onExpenseCreated: () => void;
  /** Pre-select a job (e.g. when opened from a project page). */
  defaultProjectId?: string;
  triggerLabel?: string;
}

const emptyForm = () => ({
  project_id: '',
  vendor: '',
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  category: 'Materials',
  description: '',
  receipt_number: '',
});

/** Shrinks phone photos to ~1600px JPEG so uploads stay small and fast. PDFs pass through. */
async function prepareFile(file: File): Promise<{ base64: string; mimeType: string; preview: string }> {
  const readAsDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

  if (!file.type.startsWith('image/')) {
    const url = await readAsDataUrl(file);
    return { base64: url.split(',')[1] || '', mimeType: file.type || 'application/pdf', preview: '' };
  }

  const url = await readAsDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const jpeg = canvas.toDataURL('image/jpeg', 0.85);
  return { base64: jpeg.split(',')[1] || '', mimeType: 'image/jpeg', preview: jpeg };
}

export function ScanReceiptDialog({ onExpenseCreated, defaultProjectId, triggerLabel = 'Snap receipt' }: ScanReceiptDialogProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState('');
  const [scanned, setScanned] = useState(false);
  const [suggestion, setSuggestion] = useState<{ id: string; reason?: string } | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('projects')
      .select('id, name, client, address, status').is('archived_at', null)
      .then(({ data }) => setProjects(sortProjectsOpenFirst(data || [])));
  }, [open]);

  const reset = () => {
    setForm({ ...emptyForm(), project_id: defaultProjectId || '' });
    setPreview('');
    setScanned(false);
    setSuggestion(null);
    setConfidence(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const openDialog = () => {
    reset();
    setOpen(true);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) return toast.error('That file is over 15 MB. Try a smaller photo.');
    setReading(true);
    try {
      const { base64, mimeType, preview } = await prepareFile(file);
      setPreview(preview);
      const open = projects.filter((p) => p.status !== 'Completed' && p.status !== 'Closed');
      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: {
          fileBase64: base64,
          mimeType,
          fileName: file.name,
          projects: open.map((p) => ({ id: p.id, name: p.name, client: p.client, address: p.address })),
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Could not read the receipt');
      setForm((f) => ({
        ...f,
        vendor: data.vendor || f.vendor,
        date: data.date || f.date,
        amount: data.total != null ? String(data.total) : f.amount,
        category: data.category || f.category,
        description: data.description || f.description,
        receipt_number: data.receipt_number || f.receipt_number,
        project_id: defaultProjectId || data.project_id || f.project_id,
      }));
      if (data.project_id) setSuggestion({ id: data.project_id, reason: data.project_reason || undefined });
      setConfidence(typeof data.confidence === 'number' ? data.confidence : null);
      setScanned(true);
    } catch (e) {
      toast.error((e as Error).message);
      setScanned(true); // let them type it in by hand
    } finally {
      setReading(false);
    }
  };

  const save = async () => {
    if (!form.project_id || !form.amount) return toast.error('Pick a job and enter the amount.');
    setSaving(true);
    const { error } = await supabase.from('expenses').insert([{
      project_id: form.project_id,
      vendor: form.vendor || null,
      date: form.date,
      amount: parseFloat(form.amount),
      category: form.category,
      description: form.description || (form.vendor ? `Receipt from ${form.vendor}` : 'Receipt'),
      receipt_number: form.receipt_number || null,
      status: 'Pending Field Approval',
    }]);
    setSaving(false);
    if (error) return toast.error('Could not save the expense.');
    toast.success('Receipt saved as an expense.');
    onExpenseCreated();
    setOpen(false);
  };

  const set = (k: keyof ReturnType<typeof emptyForm>) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const lowConfidence = confidence != null && confidence < 0.6;

  return (
    <>
      <Button variant="outline" onClick={openDialog}>
        <Camera className="w-4 h-4" /> {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Snap a receipt</DialogTitle>
            <DialogDescription>Take a photo and we'll fill in the vendor, date, amount and job. Check it, then save.</DialogDescription>
          </DialogHeader>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {!scanned && !reading && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center hover:bg-muted/40"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Camera className="h-7 w-7" />
              </span>
              <span className="font-medium">Take a photo or choose a file</span>
              <span className="text-xs text-muted-foreground">JPG, PNG, HEIC or PDF</span>
            </button>
          )}

          {reading && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Reading the receipt…</p>
            </div>
          )}

          {scanned && !reading && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {preview && <img src={preview} alt="Receipt" className="h-28 w-20 shrink-0 rounded-lg border object-cover" />}
                <div className="flex-1 space-y-2 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {confidence == null ? 'Enter the details below' : lowConfidence ? 'Hard to read. Please double-check.' : 'Filled in from your receipt'}
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { reset(); fileRef.current?.click(); }}>
                    <RotateCcw className="h-4 w-4" /> Retake
                  </Button>
                </div>
              </div>

              <div>
                <Label>Job *</Label>
                <Select value={form.project_id} onValueChange={set('project_id')}>
                  <SelectTrigger><SelectValue placeholder="Which job is this for?" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {suggestion && form.project_id === suggestion.id && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <Badge variant="info" className="mr-1">Suggested</Badge>{suggestion.reason}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount *</Label>
                  <Input type="number" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => set('amount')(e.target.value)} />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => set('date')(e.target.value)} />
                </div>
                <div>
                  <Label>Vendor</Label>
                  <Input value={form.vendor} onChange={(e) => set('vendor')(e.target.value)} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={set('category')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>What was bought</Label>
                <Input value={form.description} onChange={(e) => set('description')(e.target.value)} />
              </div>
              <div>
                <Label>Receipt #</Label>
                <Input value={form.receipt_number} onChange={(e) => set('receipt_number')(e.target.value)} />
              </div>
            </div>
          )}

          {scanned && !reading && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save expense
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
