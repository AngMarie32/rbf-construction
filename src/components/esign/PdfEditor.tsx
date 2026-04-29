import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Type, Highlighter, Pen, Trash2, ChevronUp, ChevronDown,
  FileUp, Save, X, MousePointer2, Eraser, Files
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type Tool = 'select' | 'text' | 'highlight' | 'whiteout' | 'draw';

interface Annotation {
  id: string;
  page: number; // 1-based, refers to the *current* page index in pageOrder
  type: 'text' | 'highlight' | 'whiteout' | 'draw';
  // pct of viewport
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontSize?: number; // px in viewport
  // for draw: list of points in pct relative to bbox
  points?: { x: number; y: number }[];
  color?: { r: number; g: number; b: number };
}

interface PageRef {
  // 'orig' = page from original doc, 'ext' = page from inserted doc
  source: 'orig' | string; // string = inserted doc id
  pageIndex: number; // 0-based within source doc
}

interface Props {
  pdfUrl: string;
  onSave: (file: File) => Promise<void> | void;
  onCancel: () => void;
  hasFields: boolean;
}

export function PdfEditor({ pdfUrl, onSave, onCancel, hasFields }: Props) {
  const [origBytes, setOrigBytes] = useState<Uint8Array | null>(null);
  const [insertedDocs, setInsertedDocs] = useState<Record<string, Uint8Array>>({});
  const [pageOrder, setPageOrder] = useState<PageRef[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [tool, setTool] = useState<Tool>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [fontSize, setFontSize] = useState(14);
  const [saving, setSaving] = useState(false);
  const [renderDims, setRenderDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [drawing, setDrawing] = useState<Annotation | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load original PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(pdfUrl);
        const buf = new Uint8Array(await res.arrayBuffer());
        if (cancelled) return;
        setOrigBytes(buf);
        const pdf = await pdfjsLib.getDocument({ data: buf.slice() }).promise;
        const order: PageRef[] = [];
        for (let i = 0; i < pdf.numPages; i++) order.push({ source: 'orig', pageIndex: i });
        setPageOrder(order);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load PDF');
      }
    })();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  // Render current page
  useEffect(() => {
    if (pageOrder.length === 0) return;
    if (currentPage > pageOrder.length) setCurrentPage(pageOrder.length);
    const ref = pageOrder[currentPage - 1];
    if (!ref) return;
    const bytes = ref.source === 'orig' ? origBytes : insertedDocs[ref.source];
    if (!bytes) return;
    let cancelled = false;
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
        const page = await pdf.getPage(ref.pageIndex + 1);
        const viewport = page.getViewport({ scale: 1.4 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        try { renderTaskRef.current?.cancel?.(); } catch {}
        const task = page.render({ canvasContext: ctx, viewport } as any);
        renderTaskRef.current = task;
        await task.promise;
        setRenderDims({ w: viewport.width, h: viewport.height });
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') {
          // ignore
        }
      }
    })();
    return () => { cancelled = true; try { renderTaskRef.current?.cancel?.(); } catch {} };
  }, [pageOrder, currentPage, origBytes, insertedDocs]);

  const pageAnnotations = useMemo(
    () => annotations.filter(a => a.page === currentPage),
    [annotations, currentPage]
  );

  const getRelPos = (e: React.PointerEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (tool === 'select') return;
    if ((e.target as HTMLElement).closest('[data-annotation]')) return;
    e.preventDefault();
    const pos = getRelPos(e);
    const id = crypto.randomUUID();
    if (tool === 'text') {
      const ann: Annotation = {
        id, page: currentPage, type: 'text',
        x: pos.x, y: pos.y, w: 25, h: 4,
        text: '', fontSize, color: { r: 0, g: 0, b: 0 },
      };
      setAnnotations(p => [...p, ann]);
      setEditingId(id);
      setTool('select');
      return;
    }
    if (tool === 'draw') {
      const ann: Annotation = {
        id, page: currentPage, type: 'draw',
        x: pos.x, y: pos.y, w: 0, h: 0,
        points: [{ x: 0, y: 0 }],
        color: { r: 0, g: 0, b: 0 },
      };
      setDrawing(ann);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    // highlight / whiteout: drag a rect
    const ann: Annotation = {
      id, page: currentPage, type: tool,
      x: pos.x, y: pos.y, w: 0, h: 0,
      color: tool === 'highlight'
        ? { r: 1, g: 0.95, b: 0.2 }
        : { r: 1, g: 1, b: 1 },
    };
    setDrawing(ann);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const pos = getRelPos(e);
    if (drawing.type === 'draw') {
      // Track absolute points; we'll convert to bbox-relative on commit
      setDrawing(d => d ? {
        ...d,
        points: [...(d.points || []), { x: pos.x - d.x, y: pos.y - d.y }],
      } : d);
    } else {
      setDrawing(d => d ? { ...d, w: pos.x - d.x, h: pos.y - d.y } : d);
    }
  };

  const handlePointerUp = () => {
    if (!drawing) return;
    let final = drawing;
    if (final.type === 'draw') {
      const pts = final.points || [];
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      const minX = Math.min(0, ...xs);
      const minY = Math.min(0, ...ys);
      const maxX = Math.max(0, ...xs);
      const maxY = Math.max(0, ...ys);
      final = {
        ...final,
        x: final.x + minX,
        y: final.y + minY,
        w: maxX - minX,
        h: maxY - minY,
        points: pts.map(p => ({ x: p.x - minX, y: p.y - minY })),
      };
    } else {
      // normalize negatives
      if (final.w < 0) { final.x = final.x + final.w; final.w = -final.w; }
      if (final.h < 0) { final.y = final.y + final.h; final.h = -final.h; }
      if (final.w < 0.5 || final.h < 0.5) { setDrawing(null); return; }
    }
    setAnnotations(p => [...p, final]);
    setDrawing(null);
    setTool('select');
  };

  const removeAnnotation = (id: string) =>
    setAnnotations(p => p.filter(a => a.id !== id));

  const updateAnnotation = (id: string, updates: Partial<Annotation>) =>
    setAnnotations(p => p.map(a => a.id === id ? { ...a, ...updates } : a));

  // Page management
  const movePage = (idx: number, dir: -1 | 1) => {
    setPageOrder(p => {
      const next = [...p];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return p;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
    // remap annotations for swapped pages
    setAnnotations(prev => prev.map(a => {
      if (a.page === idx + 1) return { ...a, page: idx + 1 + dir };
      if (a.page === idx + 1 + dir) return { ...a, page: idx + 1 };
      return a;
    }));
    if (currentPage === idx + 1) setCurrentPage(idx + 1 + dir);
    else if (currentPage === idx + 1 + dir) setCurrentPage(idx + 1);
  };

  const deletePage = (idx: number) => {
    if (pageOrder.length <= 1) return toast.error('Cannot delete the last page');
    setPageOrder(p => p.filter((_, i) => i !== idx));
    setAnnotations(prev =>
      prev.filter(a => a.page !== idx + 1)
          .map(a => a.page > idx + 1 ? { ...a, page: a.page - 1 } : a)
    );
    if (currentPage > pageOrder.length - 1) setCurrentPage(Math.max(1, pageOrder.length - 1));
    else if (currentPage > idx + 1) setCurrentPage(currentPage - 1);
  };

  const insertPdf = async (file: File) => {
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const docId = crypto.randomUUID();
      setInsertedDocs(p => ({ ...p, [docId]: buf }));
      const pdf = await pdfjsLib.getDocument({ data: buf.slice() }).promise;
      const newRefs: PageRef[] = [];
      for (let i = 0; i < pdf.numPages; i++) newRefs.push({ source: docId, pageIndex: i });
      // Insert after current page
      setPageOrder(p => {
        const before = p.slice(0, currentPage);
        const after = p.slice(currentPage);
        return [...before, ...newRefs, ...after];
      });
      // shift annotations after currentPage
      setAnnotations(prev => prev.map(a =>
        a.page > currentPage ? { ...a, page: a.page + newRefs.length } : a
      ));
      toast.success(`Inserted ${newRefs.length} page${newRefs.length === 1 ? '' : 's'}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to insert PDF');
    }
  };

  // Build & save final PDF
  const handleSave = async () => {
    if (!origBytes) return;
    if (hasFields) {
      const ok = confirm('Saving will remove any signature fields you placed. Continue?');
      if (!ok) return;
    }
    setSaving(true);
    try {
      const out = await PDFDocument.create();
      const sourceCache: Record<string, PDFDocument> = {};
      sourceCache['orig'] = await PDFDocument.load(origBytes);
      for (const [k, v] of Object.entries(insertedDocs)) {
        sourceCache[k] = await PDFDocument.load(v);
      }
      const helv = await out.embedFont(StandardFonts.Helvetica);

      for (let i = 0; i < pageOrder.length; i++) {
        const ref = pageOrder[i];
        const src = sourceCache[ref.source];
        const [copied] = await out.copyPages(src, [ref.pageIndex]);
        const page = out.addPage(copied);
        const { width: pw, height: ph } = page.getSize();

        // Draw annotations for this page (page index is i+1 in 1-based)
        const pageAnns = annotations.filter(a => a.page === i + 1);
        for (const a of pageAnns) {
          const x = (a.x / 100) * pw;
          // pdf-lib origin is bottom-left
          const yTop = (a.y / 100) * ph;
          const w = (a.w / 100) * pw;
          const h = (a.h / 100) * ph;
          const yBottom = ph - yTop - h;
          const color = a.color || { r: 0, g: 0, b: 0 };

          if (a.type === 'highlight') {
            page.drawRectangle({
              x, y: yBottom, width: w, height: h,
              color: rgb(color.r, color.g, color.b),
              opacity: 0.35,
            });
          } else if (a.type === 'whiteout') {
            page.drawRectangle({
              x, y: yBottom, width: w, height: h,
              color: rgb(1, 1, 1),
            });
          } else if (a.type === 'text') {
            const text = a.text || '';
            // approximate: viewport rendered at scale 1.4, fontSize stored in viewport px
            // convert px -> pdf points: pdf points = viewport_px / scale
            const sizePts = (a.fontSize || 14) / 1.4;
            // wrap by width
            const lines = wrapText(text, helv, sizePts, w);
            const lineHeight = sizePts * 1.2;
            lines.forEach((line, li) => {
              const ly = ph - yTop - sizePts - li * lineHeight;
              page.drawText(line, {
                x, y: ly, size: sizePts, font: helv,
                color: rgb(color.r, color.g, color.b),
              });
            });
          } else if (a.type === 'draw' && a.points && a.points.length > 1) {
            for (let p = 1; p < a.points.length; p++) {
              const p1 = a.points[p - 1];
              const p2 = a.points[p];
              page.drawLine({
                start: { x: x + (p1.x / 100) * pw, y: ph - yTop - (p1.y / 100) * ph },
                end:   { x: x + (p2.x / 100) * pw, y: ph - yTop - (p2.y / 100) * ph },
                thickness: 1.5,
                color: rgb(color.r, color.g, color.b),
              });
            }
          }
        }
      }

      const bytes = await out.save();
      const file = new File([bytes as BlobPart], 'edited.pdf', { type: 'application/pdf' });
      await onSave(file);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save PDF');
    } finally {
      setSaving(false);
    }
  };

  const ToolBtn = ({ t, icon: Icon, label }: { t: Tool; icon: any; label: string }) => (
    <Button
      type="button"
      size="sm"
      variant={tool === t ? 'default' : 'outline'}
      onClick={() => { setTool(t); setEditingId(null); }}
      title={label}
    >
      <Icon className="h-4 w-4 mr-1" /> {label}
    </Button>
  );

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border rounded-lg bg-muted/30">
        <ToolBtn t="select" icon={MousePointer2} label="Select" />
        <ToolBtn t="text" icon={Type} label="Text" />
        <ToolBtn t="highlight" icon={Highlighter} label="Highlight" />
        <ToolBtn t="whiteout" icon={Eraser} label="White-out" />
        <ToolBtn t="draw" icon={Pen} label="Draw" />
        {tool === 'text' && (
          <div className="flex items-center gap-1 ml-2">
            <Label className="text-xs">Size</Label>
            <Input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Math.max(8, parseInt(e.target.value) || 14))}
              className="w-16 h-8"
            />
          </div>
        )}
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {hasFields && (
        <div className="text-xs px-3 py-2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
          Note: Saving the edited PDF will remove existing signature field placements. Re-add them after saving.
        </div>
      )}

      <div className="grid grid-cols-[200px_1fr] gap-3">
        {/* Pages panel */}
        <div className="border rounded-lg p-2 space-y-1 max-h-[75vh] overflow-auto bg-card">
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pages</p>
            <label className="cursor-pointer text-primary hover:opacity-80" title="Insert PDF after current page">
              <FileUp className="h-4 w-4" />
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) insertPdf(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {pageOrder.map((_, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1 p-1.5 rounded text-sm border ${
                currentPage === idx + 1 ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-muted'
              }`}
            >
              <button
                className="flex-1 text-left px-1"
                onClick={() => setCurrentPage(idx + 1)}
              >
                Page {idx + 1}
              </button>
              <button
                className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                disabled={idx === 0}
                onClick={() => movePage(idx, -1)}
                title="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                disabled={idx === pageOrder.length - 1}
                onClick={() => movePage(idx, 1)}
                title="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                className="p-0.5 hover:bg-destructive/10 rounded text-destructive disabled:opacity-30"
                disabled={pageOrder.length <= 1}
                onClick={() => deletePage(idx)}
                title="Delete page"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Page canvas + overlay */}
        <div className="border rounded-lg max-h-[75vh] overflow-auto bg-muted/20 p-3">
          <div
            className="relative inline-block mx-auto"
            style={{ width: renderDims.w || 'auto' }}
          >
            <canvas ref={canvasRef} className="block shadow-md" />
            <div
              ref={overlayRef}
              className="absolute inset-0"
              style={{
                cursor: tool === 'select' ? 'default'
                      : tool === 'text' ? 'text'
                      : 'crosshair',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {pageAnnotations.map(a => (
                <AnnotationView
                  key={a.id}
                  ann={a}
                  editing={editingId === a.id}
                  onStartEdit={() => a.type === 'text' && setEditingId(a.id)}
                  onStopEdit={() => setEditingId(null)}
                  onChange={(u) => updateAnnotation(a.id, u)}
                  onRemove={() => removeAnnotation(a.id)}
                />
              ))}
              {drawing && drawing.page === currentPage && (
                <DrawingPreview ann={drawing} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnotationView({ ann, editing, onStartEdit, onStopEdit, onChange, onRemove }: {
  ann: Annotation;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onChange: (u: Partial<Annotation>) => void;
  onRemove: () => void;
}) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${ann.x}%`,
    top: `${ann.y}%`,
    width: `${ann.w}%`,
    height: `${ann.h}%`,
  };

  if (ann.type === 'highlight') {
    return (
      <div data-annotation style={{ ...baseStyle, background: 'rgba(255, 240, 50, 0.4)' }}>
        <RemoveBtn onClick={onRemove} />
      </div>
    );
  }
  if (ann.type === 'whiteout') {
    return (
      <div data-annotation style={{ ...baseStyle, background: 'white', border: '1px dashed rgba(0,0,0,0.3)' }}>
        <RemoveBtn onClick={onRemove} />
      </div>
    );
  }
  if (ann.type === 'draw' && ann.points) {
    const path = pointsToPath(ann.points);
    return (
      <div data-annotation style={baseStyle}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <path d={path} stroke="black" strokeWidth="0.5" fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
        <RemoveBtn onClick={onRemove} />
      </div>
    );
  }
  // text
  return (
    <div
      data-annotation
      style={{ ...baseStyle, minHeight: 20 }}
      onDoubleClick={onStartEdit}
    >
      {editing ? (
        <textarea
          autoFocus
          value={ann.text || ''}
          onChange={(e) => onChange({ text: e.target.value })}
          onBlur={onStopEdit}
          style={{
            width: '100%', height: '100%', minHeight: 24,
            border: '1px solid hsl(var(--primary))',
            background: 'rgba(255,255,255,0.95)',
            color: 'black',
            fontSize: ann.fontSize || 14,
            padding: 2, resize: 'both', outline: 'none',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%', height: '100%',
            border: '1px dashed rgba(0,0,0,0.3)',
            background: 'rgba(255,255,255,0.6)',
            color: 'black',
            fontSize: ann.fontSize || 14,
            padding: 2, whiteSpace: 'pre-wrap', overflow: 'hidden',
            cursor: 'text',
          }}
          onClick={onStartEdit}
        >
          {ann.text || <span style={{ opacity: 0.5 }}>Click to type…</span>}
        </div>
      )}
      <RemoveBtn onClick={onRemove} />
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center shadow"
      title="Remove"
    >
      ×
    </button>
  );
}

function DrawingPreview({ ann }: { ann: Annotation }) {
  if (ann.type === 'draw' && ann.points) {
    const xs = ann.points.map(p => p.x);
    const ys = ann.points.map(p => p.y);
    const minX = Math.min(0, ...xs);
    const minY = Math.min(0, ...ys);
    const maxX = Math.max(0, ...xs);
    const maxY = Math.max(0, ...ys);
    const left = ann.x + minX;
    const top = ann.y + minY;
    const w = maxX - minX;
    const h = maxY - minY;
    const norm = ann.points.map(p => ({
      x: w === 0 ? 50 : ((p.x - minX) / w) * 100,
      y: h === 0 ? 50 : ((p.y - minY) / h) * 100,
    }));
    return (
      <div style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <path d={pointsToPath(norm)} stroke="black" strokeWidth="0.5" fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    );
  }
  const w = Math.abs(ann.w);
  const h = Math.abs(ann.h);
  const x = ann.w < 0 ? ann.x + ann.w : ann.x;
  const y = ann.h < 0 ? ann.y + ann.h : ann.y;
  const bg = ann.type === 'highlight' ? 'rgba(255,240,50,0.4)' : 'white';
  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`,
      background: bg,
      border: ann.type === 'whiteout' ? '1px dashed rgba(0,0,0,0.3)' : 'none',
    }} />
  );
}

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      const w = font.widthOfTextAtSize(test, size);
      if (w > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    lines.push(current);
  }
  return lines;
}