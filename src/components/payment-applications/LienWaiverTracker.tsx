import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Check, FileSignature, Trash2, Upload, Plus, Download } from 'lucide-react';
import { WAIVER_LABELS, type WaiverType } from '@/utils/lienWaiverPdf';

export interface LienWaiverRow {
  id: string;
  payment_app_id: string;
  recipient_name: string;
  recipient_email: string | null;
  waiver_type: WaiverType;
  amount: number;
  through_date: string | null;
  status: 'pending' | 'requested' | 'received' | 'waived';
  envelope_id: string | null;
  signed_pdf_path: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  requested: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  received: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  waived: 'bg-muted text-muted-foreground',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paymentApp: { id: string; application_number: number };
  onChanged?: () => void;
}

export function LienWaiverTracker({ open, onOpenChange, paymentApp, onChanged }: Props) {
  const [rows, setRows] = useState<LienWaiverRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payment_app_lien_waivers')
      .select('*')
      .eq('payment_app_id', paymentApp.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, paymentApp.id]);

  const updateStatus = async (id: string, status: LienWaiverRow['status'], extra: Record<string, any> = {}) => {
    const { error } = await supabase
      .from('payment_app_lien_waivers')
      .update({ status, ...extra })
      .eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Updated');
    load();
    onChanged?.();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this waiver record?')) return;
    const { error } = await supabase.from('payment_app_lien_waivers').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
    onChanged?.();
  };

  const addManual = async () => {
    if (!newName.trim()) return toast.error('Name is required');
    const { error } = await supabase.from('payment_app_lien_waivers').insert({
      payment_app_id: paymentApp.id,
      recipient_name: newName.trim(),
      amount: Number(newAmount) || 0,
      waiver_type: 'conditional_progress',
      status: 'pending',
    });
    if (error) return toast.error(error.message);
    setNewName(''); setNewAmount(''); setAdding(false);
    load();
    onChanged?.();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    const path = `lien-waivers/${paymentApp.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('esign-documents').upload(path, file);
    if (upErr) return toast.error(upErr.message);
    await updateStatus(uploadTargetId, 'received', {
      signed_pdf_path: path,
      received_at: new Date().toISOString(),
    });
    setUploadTargetId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSigned = async (path: string) => {
    const { data, error } = await supabase.storage.from('esign-documents').createSignedUrl(path, 60);
    if (error || !data) return toast.error('Failed to fetch file');
    window.open(data.signedUrl, '_blank');
  };

  const totals = {
    total: rows.length,
    received: rows.filter(r => r.status === 'received' || r.status === 'waived').length,
    outstanding: rows.filter(r => r.status === 'pending' || r.status === 'requested').length,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" /> Lien Waivers — App #{paymentApp.application_number}
          </SheetTitle>
          <SheetDescription>
            Track conditional and unconditional waivers from each subcontractor. Payment can be marked paid only after all required waivers are received.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            {totals.received} received
          </Badge>
          <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            {totals.outstanding} outstanding
          </Badge>
          <Badge variant="outline">{totals.total} total</Badge>
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={() => setAdding(v => !v)}>
              <Plus className="h-4 w-4 mr-1" /> Add waiver
            </Button>
          </div>
        </div>

        {adding && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 items-end p-3 border rounded-lg">
            <div className="md:col-span-2">
              <Label className="text-xs">Recipient</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Subcontractor name" />
            </div>
            <div>
              <Label className="text-xs">Amount ($)</Label>
              <Input type="number" step="0.001" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
            </div>
            <div className="md:col-span-3 flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={addManual}>Add</Button>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No waivers tracked yet. Generate one from "Lien Waiver" or add a manual record.
            </p>
          )}
          {rows.map(row => (
            <div key={row.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{row.recipient_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {WAIVER_LABELS[row.waiver_type] || row.waiver_type}
                    {row.recipient_email ? ` · ${row.recipient_email}` : ''}
                  </div>
                </div>
                <Badge className={STATUS_STYLES[row.status]}>
                  {row.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Amount: ${Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {row.through_date && <span>Through: {format(new Date(row.through_date), 'MMM d, yyyy')}</span>}
                {row.received_at && <span>Received: {format(new Date(row.received_at), 'MMM d, yyyy')}</span>}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {row.status !== 'received' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(row.id, 'received', { received_at: new Date().toISOString() })}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Mark received
                  </Button>
                )}
                {row.status !== 'waived' && (
                  <Button size="sm" variant="ghost" onClick={() => updateStatus(row.id, 'waived')}>
                    Mark not required
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setUploadTargetId(row.id); fileInputRef.current?.click(); }}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" /> Upload signed
                </Button>
                {row.signed_pdf_path && (
                  <Button size="sm" variant="ghost" onClick={() => downloadSigned(row.signed_pdf_path!)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => remove(row.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleUpload} />
      </SheetContent>
    </Sheet>
  );
}

// Helper for parent: returns waiver summary for a payment app
export async function fetchWaiverSummary(paymentAppId: string) {
  const { data } = await supabase
    .from('payment_app_lien_waivers')
    .select('status')
    .eq('payment_app_id', paymentAppId);
  const rows = (data as any[]) || [];
  return {
    total: rows.length,
    received: rows.filter(r => r.status === 'received' || r.status === 'waived').length,
    outstanding: rows.filter(r => r.status === 'pending' || r.status === 'requested').length,
    allCleared: rows.length > 0 && rows.every(r => r.status === 'received' || r.status === 'waived'),
  };
}