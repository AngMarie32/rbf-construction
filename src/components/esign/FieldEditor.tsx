import { useEffect, useRef, useState } from 'react';
import { PdfViewer } from './PdfViewer';
import type { EsignField, EsignSigner, FieldType } from '@/types/esign';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, PenLine, Type as TypeIcon, Calendar, CheckSquare, User, Hash, Wand2, Loader2, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from 'sonner';

interface Props {
  pdfUrl: string;
  fields: EsignField[];
  signers: EsignSigner[];
  onAddField: (field: Omit<EsignField, 'id' | 'envelope_id' | 'created_at' | 'value' | 'filled_at'>) => void;
  onDeleteField: (id: string) => void;
  onUpdateField: (id: string, updates: Partial<EsignField>) => void;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: any; color: string }[] = [
  { type: 'signature', label: 'Signature', icon: PenLine, color: 'bg-blue-500' },
  { type: 'initial', label: 'Initial', icon: Hash, color: 'bg-indigo-500' },
  { type: 'date', label: 'Date', icon: Calendar, color: 'bg-emerald-500' },
  { type: 'text', label: 'Text', icon: TypeIcon, color: 'bg-amber-500' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, color: 'bg-rose-500' },
  { type: 'name', label: 'Name', icon: User, color: 'bg-violet-500' },
];

const SIGNER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function FieldEditor({ pdfUrl, fields, signers, onAddField, onDeleteField, onUpdateField }: Props) {
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [pageDims, setPageDims] = useState({ width: 0, height: 0 });
  const [selectedSigner, setSelectedSigner] = useState<string>(signers[0]?.id || '');
  const [selectedType, setSelectedType] = useState<FieldType>('signature');
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [dragState, setDragState] = useState<{
    fieldId: string;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    started: boolean;
  } | null>(null);
  // Local overrides applied during drag so we can update visuals at 60fps
  // without hitting the database on every pointermove (which caused lag).
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<EsignField>>>({});
  const latestOverrideRef = useRef<Partial<EsignField> | null>(null);
  const justDraggedRef = useRef(false);
  // Alignment guides shown while dragging/resizing (percent positions)
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep selectedSigner in sync as signers load/change
  useEffect(() => {
    if (!selectedSigner && signers.length > 0) {
      setSelectedSigner(signers[0].id);
    } else if (selectedSigner && !signers.find(s => s.id === selectedSigner)) {
      setSelectedSigner(signers[0]?.id || '');
    }
  }, [signers, selectedSigner]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState || justDraggedRef.current) return; // ignore clicks at end of drag
    if (!pageDims.width) return;
    if (!selectedSigner) {
      toast.error(signers.length === 0 ? 'Add a signer first' : 'Select a signer');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddField({
      signer_id: selectedSigner,
      field_type: selectedType,
      page_number: page,
      x_pct: Math.max(0, Math.min(95, x - 10)),
      y_pct: Math.max(0, Math.min(95, y - 2.5)),
      width_pct: selectedType === 'checkbox' ? 4 : 20,
      height_pct: selectedType === 'checkbox' ? 4 : 5,
      required: true,
    });
  };

  // Pointer-based drag/resize for placed fields
  useEffect(() => {
    if (!dragState) return;
    const DRAG_THRESHOLD = 4; // pixels before a drag actually starts
    const SNAP_PCT = 0.6; // snap tolerance in percent
    const onMove = (ev: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dxRaw = ev.clientX - dragState.startX;
      const dyRaw = ev.clientY - dragState.startY;
      if (!dragState.started) {
        if (Math.abs(dxRaw) < DRAG_THRESHOLD && Math.abs(dyRaw) < DRAG_THRESHOLD) return;
        dragState.started = true;
      }
      const dxPct = (dxRaw / rect.width) * 100;
      const dyPct = (dyRaw / rect.height) * 100;
      // Compute target rect (before snapping)
      let x = dragState.origX, y = dragState.origY, w = dragState.origW, h = dragState.origH;
      if (dragState.mode === 'move') {
        x = Math.max(0, Math.min(100 - dragState.origW, dragState.origX + dxPct));
        y = Math.max(0, Math.min(100 - dragState.origH, dragState.origY + dyPct));
      } else {
        w = Math.max(2, Math.min(100 - dragState.origX, dragState.origW + dxPct));
        h = Math.max(2, Math.min(100 - dragState.origY, dragState.origH + dyPct));
      }

      // Build snap targets from other fields on the same page
      const others = fields.filter(
        f => f.id !== dragState.fieldId && f.page_number === page
      );
      const vTargets: number[] = [];
      const hTargets: number[] = [];
      others.forEach(f => {
        vTargets.push(f.x_pct, f.x_pct + f.width_pct, f.x_pct + f.width_pct / 2);
        hTargets.push(f.y_pct, f.y_pct + f.height_pct, f.y_pct + f.height_pct / 2);
      });

      const activeGuidesV: number[] = [];
      const activeGuidesH: number[] = [];

      const snap = (val: number, targets: number[]) => {
        let best = val;
        let bestDiff = SNAP_PCT;
        for (const t of targets) {
          const d = Math.abs(t - val);
          if (d < bestDiff) { bestDiff = d; best = t; }
        }
        return { val: best, snapped: best !== val };
      };

      if (dragState.mode === 'move') {
        // Try snapping left/center/right edges
        const leftSnap = snap(x, vTargets);
        const centerSnap = snap(x + w / 2, vTargets);
        const rightSnap = snap(x + w, vTargets);
        if (leftSnap.snapped) { x = leftSnap.val; activeGuidesV.push(x); }
        else if (centerSnap.snapped) { x = centerSnap.val - w / 2; activeGuidesV.push(centerSnap.val); }
        else if (rightSnap.snapped) { x = rightSnap.val - w; activeGuidesV.push(rightSnap.val); }

        const topSnap = snap(y, hTargets);
        const midSnap = snap(y + h / 2, hTargets);
        const botSnap = snap(y + h, hTargets);
        if (topSnap.snapped) { y = topSnap.val; activeGuidesH.push(y); }
        else if (midSnap.snapped) { y = midSnap.val - h / 2; activeGuidesH.push(midSnap.val); }
        else if (botSnap.snapped) { y = botSnap.val - h; activeGuidesH.push(botSnap.val); }
      } else {
        // Resize: snap right and bottom edges
        const rightSnap = snap(x + w, vTargets);
        if (rightSnap.snapped) { w = rightSnap.val - x; activeGuidesV.push(rightSnap.val); }
        const botSnap = snap(y + h, hTargets);
        if (botSnap.snapped) { h = botSnap.val - y; activeGuidesH.push(botSnap.val); }
      }

      const next: Partial<EsignField> =
        dragState.mode === 'move'
          ? { x_pct: x, y_pct: y }
          : { width_pct: w, height_pct: h };
      setGuides({ v: activeGuidesV, h: activeGuidesH });
      latestOverrideRef.current = next;
      setLocalOverrides(prev => ({ ...prev, [dragState.fieldId]: next }));
    };
    const onUp = () => {
      if (dragState.started) {
        justDraggedRef.current = true;
        setTimeout(() => { justDraggedRef.current = false; }, 200);
        // Commit final position to the database once
        if (latestOverrideRef.current) {
          onUpdateField(dragState.fieldId, latestOverrideRef.current);
        }
      }
      latestOverrideRef.current = null;
      setGuides({ v: [], h: [] });
      // Keep override briefly so UI doesn't flicker before server round-trip
      const fid = dragState.fieldId;
      setTimeout(() => {
        setLocalOverrides(prev => {
          const { [fid]: _, ...rest } = prev;
          return rest;
        });
      }, 600);
      setDragState(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragState, onUpdateField, fields, page]);

  const startDrag = (
    e: React.PointerEvent,
    field: EsignField,
    mode: 'move' | 'resize'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragState({
      fieldId: field.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: field.x_pct,
      origY: field.y_pct,
      origW: field.width_pct,
      origH: field.height_pct,
      started: false,
    });
  };

  const autoDetectFields = async () => {
    if (!selectedSigner) {
      toast.error(signers.length === 0 ? 'Add a signer first' : 'Select a signer');
      return;
    }
    setAutoDetecting(true);
    try {
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      let added = 0;
      // Patterns that suggest a signature/date/initial/name field
      const patterns: { re: RegExp; type: FieldType }[] = [
        { re: /^(x\s*[_\-]+|signature|signed by|sign(?:ed)? here|authori[sz]ed signature|contractor signature|owner signature|client signature|subcontractor signature|architect signature|project manager signature|by\s*[:_])/i, type: 'signature' },
        { re: /^(initial|initials|init\.)/i, type: 'initial' },
        { re: /^(date|dated|date signed|signed on|date of (signature|execution)|effective date)/i, type: 'date' },
        { re: /^(print(ed)? name|name|full name|signer name)/i, type: 'name' },
        { re: /^(title|position|company|firm|address|email|e-mail|phone|tel|fax|license #|contractor license)/i, type: 'text' },
      ];

      for (let p = 1; p <= pdf.numPages; p++) {
        const pg = await pdf.getPage(p);
        const viewport = pg.getViewport({ scale: 1 });
        const tc = await pg.getTextContent();
        const items = tc.items as any[];
        // Group by line (similar y)
        const lines: { y: number; text: string; minX: number; maxX: number; height: number }[] = [];
        for (const it of items) {
          const text = (it.str || '').trim();
          if (!text) continue;
          const tx = it.transform[4];
          const ty = it.transform[5];
          const w = it.width || 0;
          const h = it.height || 10;
          const existing = lines.find(l => Math.abs(l.y - ty) < 4);
          if (existing) {
            existing.text += ' ' + text;
            existing.minX = Math.min(existing.minX, tx);
            existing.maxX = Math.max(existing.maxX, tx + w);
          } else {
            lines.push({ y: ty, text, minX: tx, maxX: tx + w, height: h });
          }
        }

        for (const line of lines) {
          const trimmed = line.text.trim();
          // Detect long underscore runs as signature lines (no label, just "________")
          const isUnderscoreLine = /^_{6,}\s*$/.test(trimmed);
          // Look for label patterns, often followed by ":" or underscores
          const labelMatch = trimmed.match(/^([A-Za-z][A-Za-z \/.&-]+?)\s*[:_]/);
          const candidate = labelMatch ? labelMatch[1] : trimmed;
          const match = isUnderscoreLine
            ? { re: /./, type: 'signature' as FieldType }
            : patterns.find(pt => pt.re.test(candidate));
          if (!match) continue;

          // Convert PDF coords (origin bottom-left) to viewer coords (top-left, %)
          const xPct = ((line.maxX + 4) / viewport.width) * 100;
          const yPct = ((viewport.height - line.y - line.height) / viewport.height) * 100;

          // Field size based on type
          const wPct =
            match.type === 'date' ? 15 :
            match.type === 'initial' ? 8 :
            match.type === 'checkbox' ? 4 :
            match.type === 'signature' ? 28 : 22;
          const hPct = match.type === 'signature' ? 5.5 : 4.5;

          // Skip if would overflow or overlap an existing field
          if (xPct + wPct > 98 || yPct < 0 || yPct + hPct > 98) continue;
          const overlaps = fields.some(f =>
            f.page_number === p &&
            Math.abs(f.x_pct - xPct) < 5 &&
            Math.abs(f.y_pct - yPct) < 3
          );
          if (overlaps) continue;

          await onAddField({
            signer_id: selectedSigner,
            field_type: match.type,
            page_number: p,
            x_pct: Math.max(0, Math.min(95, xPct)),
            y_pct: Math.max(0, Math.min(95, yPct)),
            width_pct: wPct,
            height_pct: hPct,
            required: true,
          });
          added++;
        }
      }

      if (added === 0) {
        toast.info('No signature fields detected. Add fields manually by clicking the document.');
      } else {
        toast.success(`Auto-detected ${added} field${added === 1 ? '' : 's'}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Auto-detection failed');
    } finally {
      setAutoDetecting(false);
    }
  };

  const signerColor = (id: string | null) => {
    const idx = signers.findIndex(s => s.id === id);
    return SIGNER_COLORS[idx % SIGNER_COLORS.length] || '#3b82f6';
  };

  const pageFields = fields.filter(f => f.page_number === page);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Toolbar */}
      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Signer</h3>
          <div className="space-y-2">
            {signers.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setSelectedSigner(s.id)}
                className={cn(
                  'w-full text-left p-2 rounded-lg border-2 transition-colors flex items-center gap-2',
                  selectedSigner === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                )}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: SIGNER_COLORS[idx % SIGNER_COLORS.length] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
              </button>
            ))}
            {signers.length === 0 && (
              <p className="text-xs text-muted-foreground">Add signers to assign fields.</p>
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Field Type</h3>
          <div className="grid grid-cols-2 gap-2">
            {FIELD_TYPES.map(ft => {
              const Icon = ft.icon;
              return (
                <button
                  key={ft.type}
                  onClick={() => setSelectedType(ft.type)}
                  className={cn(
                    'p-2 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 text-xs',
                    selectedType === ft.type ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {ft.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Click on the document to place a field.</p>
        </Card>
      </div>

      {/* PDF + fields overlay */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <span className="text-sm">Page {page} of {numPages}</span>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages}>Next</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={autoDetectFields}
              disabled={autoDetecting || !selectedSigner}
              title="Scan PDF for signature, date, name labels and place fields automatically"
            >
              {autoDetecting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
              Auto-detect Fields
            </Button>
            <span className="text-xs text-muted-foreground">{pageFields.length} on this page</span>
          </div>
        </div>

        <div className="border rounded-lg shadow-sm bg-white max-h-[75vh] overflow-auto">
          <div
            ref={containerRef}
            className="relative inline-block cursor-crosshair w-full"
            onClick={handleClick}
          >
            <PdfViewer
              url={pdfUrl}
              pageNumber={page}
              onLoad={(n, d) => { setNumPages(n); setPageDims(d); }}
              className="w-full h-auto block"
            />
            {/* Alignment guides */}
            {guides.v.map((x, i) => (
              <div
                key={`v-${i}`}
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{ left: `${x}%`, width: 0, borderLeft: '1px dashed hsl(var(--primary))' }}
              />
            ))}
            {guides.h.map((y, i) => (
              <div
                key={`h-${i}`}
                className="absolute left-0 right-0 pointer-events-none"
                style={{ top: `${y}%`, height: 0, borderTop: '1px dashed hsl(var(--primary))' }}
              />
            ))}
            {pageFields.map(orig => {
              const f = { ...orig, ...(localOverrides[orig.id] || {}) } as EsignField;
              return (
            <div
              key={f.id}
              className={cn(
                "absolute border-2 rounded flex items-center justify-center text-xs font-medium group select-none",
                dragState?.fieldId === f.id ? "cursor-grabbing" : "cursor-grab"
              )}
              style={{
                left: `${f.x_pct}%`,
                top: `${f.y_pct}%`,
                width: `${f.width_pct}%`,
                height: `${f.height_pct}%`,
                borderColor: signerColor(f.signer_id),
                background: `${signerColor(f.signer_id)}22`,
                touchAction: 'none',
                willChange: dragState?.fieldId === f.id ? 'left, top, width, height' : undefined,
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => startDrag(e, f, 'move')}
            >
              <span className="capitalize pointer-events-none flex items-center gap-1" style={{ color: signerColor(f.signer_id) }}>
                <Move className="h-3 w-3 opacity-60" />
                {f.field_type}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteField(f.id); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              {/* Resize handle (bottom-right) */}
              <div
                onPointerDown={(e) => startDrag(e, f, 'resize')}
                onClick={(e) => e.stopPropagation()}
                className="absolute -bottom-1 -right-1 w-4 h-4 cursor-se-resize rounded-sm opacity-60 group-hover:opacity-100 transition border border-white"
                style={{ background: signerColor(f.signer_id) }}
                title="Drag to resize"
              />
            </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}