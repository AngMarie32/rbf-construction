import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PdfViewer } from '@/components/esign/PdfViewer';
import { SignaturePad } from '@/components/esign/SignaturePad';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function PublicSign() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [sigOpen, setSigOpen] = useState(false);
  const [sigData, setSigData] = useState<{ data: string; type: 'drawn' | 'typed' } | null>(null);
  const [activeSigField, setActiveSigField] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke('esign-get-envelope', {
          method: 'GET' as any,
          body: undefined as any,
        });
        // Use direct fetch since we need GET with query param
        const r = await fetch(
          `https://gdrurkccaglzcicpivyy.supabase.co/functions/v1/esign-get-envelope?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        setData(json);
        // Pre-fill date fields only; name is typed by the signer
        const initial: Record<string, string> = {};
        const myFields = json.fields.filter((f: any) => f.signer_id === json.signer.id);
        myFields.forEach((f: any) => {
          if (f.field_type === 'date') initial[f.id] = new Date().toLocaleDateString();
        });
        setFieldValues(initial);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <FullScreen><div>Loading…</div></FullScreen>;
  if (error) return <FullScreen><div className="text-destructive">{error}</div></FullScreen>;
  if (!data) return null;

  const { signer, envelope, fields, pdfUrl } = data;

  if (signer.status === 'signed' || completed) {
    return (
      <FullScreen>
        <Card className="p-8 max-w-md w-full text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
          <p className="text-muted-foreground">You've successfully signed <strong>{envelope.title}</strong>. A confirmation email has been sent.</p>
        </Card>
      </FullScreen>
    );
  }

  const myFields = fields.filter((f: any) => f.signer_id === signer.id);
  const pageFields = myFields.filter((f: any) => f.page_number === page);

  const allFilled = myFields.every((f: any) => {
    if (f.field_type === 'signature' || f.field_type === 'initial') {
      return !!fieldValues[f.id];
    }
    if (!f.required) return true;
    if (f.field_type === 'checkbox') return true; // optional check
    return !!fieldValues[f.id];
  });

  const handleFieldClick = (f: any) => {
    if (f.field_type === 'signature' || f.field_type === 'initial') {
      setActiveSigField(f.id);
      setSigOpen(true);
    }
  };

  const handleSigComplete = (dataUrl: string, type: 'drawn' | 'typed') => {
    // Always store the latest signature so it can be applied to all sig/initial fields
    setSigData({ data: dataUrl, type });
    setFieldValues(prev => {
      const next = { ...prev };
      // Apply to the field the signer clicked on (if any)
      if (activeSigField) next[activeSigField] = dataUrl;
      // Auto-fill all signature & initial fields belonging to this signer that aren't yet set
      const myFields = (data?.fields || []).filter((f: any) => f.signer_id === data?.signer.id);
      for (const f of myFields) {
        if ((f.field_type === 'signature' || f.field_type === 'initial') && !next[f.id]) {
          next[f.id] = dataUrl;
        }
      }
      return next;
    });
    setSigOpen(false);
  };

  const handleSubmit = async () => {
    if (!sigData) return toast.error('Please add your signature');
    try {
      const r = await fetch(
        `https://gdrurkccaglzcicpivyy.supabase.co/functions/v1/esign-submit-signature`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ token, fieldValues, signatureData: sigData.data, signatureType: sigData.type }),
        }
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error);
      setCompleted(true);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <div className="bg-background border-b sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{envelope.title}</h1>
            <p className="text-xs text-muted-foreground truncate">Signing as {signer.name} ({signer.email})</p>
          </div>
          <Button onClick={handleSubmit} disabled={!allFilled} size="sm">
            <FileCheck className="h-4 w-4 mr-2" /> Finish & Submit
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-3">
        {envelope.message && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <p className="text-sm">{envelope.message}</p>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <span className="text-sm self-center">Page {page} of {numPages}</span>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages}>Next</Button>
          </div>
          <span className="text-xs text-muted-foreground">{myFields.filter((f: any) => fieldValues[f.id]).length} of {myFields.length} fields completed</span>
        </div>

        <div className="relative inline-block bg-white shadow-sm border rounded-lg overflow-hidden w-full">
          {pdfUrl && (
            <PdfViewer
              url={pdfUrl}
              pageNumber={page}
              onLoad={(n) => setNumPages(n)}
              className="w-full h-auto block"
            />
          )}
          {pageFields.map((f: any) => {
            const v = fieldValues[f.id];
            const isTextLike = f.field_type === 'text' || f.field_type === 'date' || f.field_type === 'name';
            const isSig = f.field_type === 'signature' || f.field_type === 'initial';
            return (
              <div
                key={f.id}
                onClick={() => isSig && handleFieldClick(f)}
                className={`absolute border-2 rounded flex items-center justify-center transition ${
                  isSig ? 'cursor-pointer' : ''
                } ${
                  v ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500 bg-amber-500/20 hover:bg-amber-500/30'
                }`}
                style={{
                  left: `${f.x_pct}%`, top: `${f.y_pct}%`,
                  width: `${f.width_pct}%`, height: `${f.height_pct}%`,
                }}
              >
                {isSig ? (
                  v ? (
                    <img src={v} alt="" className="max-h-full max-w-full" />
                  ) : (
                    <span className="text-xs font-medium capitalize">{f.field_type}</span>
                  )
                ) : isTextLike ? (
                  <Input
                    value={fieldValues[f.id] || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setFieldValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                    className="h-full w-full text-xs border-0 bg-transparent rounded px-1 focus-visible:ring-1"
                    placeholder={f.field_type}
                  />
                ) : f.field_type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={fieldValues[f.id] === 'true'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setFieldValues(prev => ({ ...prev, [f.id]: e.target.checked ? 'true' : '' }))}
                  />
                ) : (
                  <span className="text-xs font-medium capitalize">{f.field_type}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={sigOpen} onOpenChange={setSigOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Your Signature</DialogTitle></DialogHeader>
          <SignaturePad onComplete={handleSigComplete} signerName={signer.name} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">{children}</div>;
}