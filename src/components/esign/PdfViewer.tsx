import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface Props {
  url: string;
  pageNumber: number;
  onLoad?: (numPages: number, dims: { width: number; height: number }) => void;
  className?: string;
}

export function PdfViewer({ url, pageNumber, onLoad, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let task: any;
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        task = page.render({ canvasContext: ctx, viewport, canvas });
        await task.promise;
        onLoad?.(pdf.numPages, { width: viewport.width, height: viewport.height });
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load PDF');
      }
    })();
    return () => {
      cancelled = true;
      try { task?.cancel?.(); } catch {}
    };
  }, [url, pageNumber]);

  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }

  return <canvas ref={canvasRef} className={className} />;
}