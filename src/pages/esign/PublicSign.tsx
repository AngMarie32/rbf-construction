import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PdfViewer } from '@/components/esign/PdfViewer';
import { SignaturePad } from '@/components/esign/SignaturePad';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, FileCheck, Camera, WifiOff, X, ZoomIn, ZoomOut, ArrowDown } from 'lucide-react';
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
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingQueued, setPendingQueued] = useState(false);
  const idInputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const pdfWrapRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

  // Online/offline detection
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Auto-retry queued submission when back online
  useEffect(() => {
    if (!online || !token) return;
    const queued = localStorage.getItem(`esign_pending_${token}`);
    if (queued) {
      (async () => {
        try {
          const payload = JSON.parse(queued);
          const r = await fetch(
            `https://gdrurkccaglzcicpivyy.supabase.co/functions/v1/esign-submit-signature`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
              body: JSON.stringify(payload),
            }
          );
          if (r.ok) {
            localStorage.removeItem(`esign_pending_${token}`);
            setPendingQueued(false);
            setCompleted(true);
            toast.success('Submission completed');
          }
        } catch {}
      })();
    }
  }, [online, token]);

  // Persist field values locally for offline tolerance
  useEffect(() => {
    if (!token) return;
    try {
      localStorage.setItem(`esign_draft_${token}`, JSON.stringify({ fieldValues, idPhoto }));
    } catch {}
  }, [fieldValues, idPhoto, token]);

  // Restore draft on load
  useEffect(() => {
    if (!token) return;
    try {
      const draft = localStorage.getItem(`esign_draft_${token}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.fieldValues) setFieldValues(prev => ({ ...prev, ...parsed.fieldValues }));
        if (parsed.idPhoto) setIdPhoto(parsed.idPhoto);
      }
      if (localStorage.getItem(`esign_pending_${token}`)) setPendingQueued(true);
    } catch {}
  }, [token]);

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

  const isFieldFilled = (f: any) => {
    if (f.field_type === 'signature' || f.field_type === 'initial') return !!fieldValues[f.id];
    if (f.field_type === 'checkbox') return true;
    return !!fieldValues[f.id];
  };
  const isFieldRequired = (f: any) =>
    f.field_type === 'signature' || f.field_type === 'initial' || f.required;
  const requiredFields = myFields.filter(isFieldRequired);
  const missingFields = requiredFields.filter((f: any) => !isFieldFilled(f));
  const remaining = missingFields.length;
  const allFilled = remaining === 0;

  const goToNextRequired = () => {
    if (missingFields.length === 0) return;
    // Prefer a missing field on the current page; otherwise jump pages
    const onPage = missingFields.find((f: any) => f.page_number === page);
    const target = onPage || missingFields[0];
    if (target.page_number !== page) {
      setPage(target.page_number);
      // wait for re-render then scroll
      setTimeout(() => scrollToField(target.id), 250);
    } else {
      scrollToField(target.id);
    }
  };

  const scrollToField = (id: string) => {
    const el = fieldRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-amber-400');
      setTimeout(() => el.classList.remove('ring-4', 'ring-amber-400'), 1600);
    }
  };

  // Pinch-to-zoom on PDF wrapper
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { startDist: Math.hypot(dx, dy), startZoom: zoom };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const next = Math.max(0.5, Math.min(3, pinchRef.current.startZoom * (dist / pinchRef.current.startDist)));
      setZoom(next);
    }
  };
  const onTouchEnd = () => { pinchRef.current = null; };

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
    if (remaining > 0) {
      setShowErrors(true);
      toast.error(`${remaining} required field${remaining === 1 ? '' : 's'} remaining`);
      goToNextRequired();
      return;
    }
    if (!sigData) return toast.error('Please add your signature');
    const payload = { token, fieldValues, signatureData: sigData.data, signatureType: sigData.type, idPhoto };
    if (!online) {
      try {
        localStorage.setItem(`esign_pending_${token}`, JSON.stringify(payload));
        setPendingQueued(true);
        toast.success("You're offline — we'll submit automatically when you reconnect.");
      } catch {
        toast.error('Could not save offline. Please reconnect and try again.');
      }
      return;
    }
    try {
      const r = await fetch(
        `https://gdrurkccaglzcicpivyy.supabase.co/functions/v1/esign-submit-signature`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify(payload),
        }
      );
      const json = await r.json();
      if (!r.ok) throw new Error(json.error);
      localStorage.removeItem(`esign_draft_${token}`);
      localStorage.removeItem(`esign_pending_${token}`);
      setCompleted(true);
    } catch (e: any) {
      // Network failure → queue for retry
      try {
        localStorage.setItem(`esign_pending_${token}`, JSON.stringify(payload));
        setPendingQueued(true);
        toast.error('Submission failed — queued for retry when connection improves.');
      } catch {
        toast.error(e.message);
      }
    }
  };

  const handleIdCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo too large (max 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setIdPhoto(reader.result as string);
      toast.success('ID photo captured');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Offline / queued banners */}
      {!online && (
        <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-30">
          <WifiOff className="h-4 w-4" /> You are offline. Your progress is saved on this device.
        </div>
      )}
      {pendingQueued && online && (
        <div className="bg-blue-600 text-white text-sm px-4 py-2 text-center sticky top-0 z-30">
          Submitting your signed document…
        </div>
      )}
      {/* Top bar */}
      <div className="bg-background border-b sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{envelope.title}</h1>
            <p className="text-xs text-muted-foreground truncate">Signing as {signer.name} ({signer.email})</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {remaining > 0 && (
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {remaining} required field{remaining === 1 ? '' : 's'} remaining
              </span>
            )}
            <Button onClick={handleSubmit} size="lg" className="h-12 px-6 text-base">
              <FileCheck className="h-4 w-4 mr-2" /> Finish & Submit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-3 pb-32 sm:pb-4">
        {envelope.message && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <p className="text-sm">{envelope.message}</p>
          </Card>
        )}

        {/* Notary ID capture */}
        <Card className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-medium">Photo ID (for notarization)</p>
            <p className="text-xs text-muted-foreground">Optional. Use your camera to capture a clear photo of your government-issued ID.</p>
          </div>
          <div className="flex items-center gap-2">
            {idPhoto ? (
              <>
                <img src={idPhoto} alt="ID" className="h-12 w-16 object-cover rounded border" />
                <Button size="lg" variant="outline" className="h-12" onClick={() => setIdPhoto(null)}>
                  <X className="h-4 w-4 mr-1" /> Remove
                </Button>
              </>
            ) : (
              <Button size="lg" variant="outline" className="h-12" onClick={() => idInputRef.current?.click()}>
                <Camera className="h-5 w-5 mr-2" /> Capture ID
              </Button>
            )}
            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleIdCapture}
            />
          </div>
        </Card>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 items-center">
            <Button size="lg" variant="outline" className="h-11 min-w-[72px]" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <span className="text-sm self-center px-2">Page {page} of {numPages}</span>
            <Button size="lg" variant="outline" className="h-11 min-w-[72px]" onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages}>Next</Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button size="icon" variant="outline" className="h-11 w-11" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="outline" className="h-11 w-11" onClick={() => setZoom(z => Math.min(3, z + 0.25))} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
          </div>
          <span className="text-xs text-muted-foreground">{myFields.filter((f: any) => fieldValues[f.id]).length} of {myFields.length} fields completed</span>
        </div>

        <div className="overflow-auto bg-muted/40 rounded-lg border" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>
          <div
            ref={pdfWrapRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="relative bg-white shadow-sm overflow-hidden mx-auto"
            style={{ width: `${zoom * 100}%`, transition: 'width 0.15s ease' }}
          >
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
            const missing = showErrors && isFieldRequired(f) && !isFieldFilled(f);
            return (
              <div
                key={f.id}
                ref={(el) => { fieldRefs.current[f.id] = el; }}
                onClick={() => isSig && handleFieldClick(f)}
                className={`absolute border-2 rounded flex items-center justify-center transition ${
                  isSig ? 'cursor-pointer' : ''
                } ${
                  v
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : missing
                      ? 'border-red-500 bg-red-500/20 animate-pulse'
                      : 'border-amber-500 bg-amber-500/20 hover:bg-amber-500/30'
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
      </div>

      <Dialog open={sigOpen} onOpenChange={setSigOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Your Signature</DialogTitle></DialogHeader>
          <SignaturePad onComplete={handleSigComplete} signerName={signer.name} />
        </DialogContent>
      </Dialog>

      {/* Mobile sticky submit bar — large tap targets */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-background border-t p-3 z-30 shadow-lg space-y-2">
        {remaining > 0 ? (
          <>
            <p className="text-center text-sm font-medium text-amber-600 dark:text-amber-400">
              {remaining} required field{remaining === 1 ? '' : 's'} remaining
            </p>
            <Button onClick={goToNextRequired} variant="outline" className="w-full h-12 text-base">
              <ArrowDown className="h-5 w-5 mr-2" /> Next required field
            </Button>
          </>
        ) : (
          <Button onClick={handleSubmit} className="w-full h-14 text-base">
            <FileCheck className="h-5 w-5 mr-2" /> Finish & Submit
          </Button>
        )}
      </div>
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">{children}</div>;
}