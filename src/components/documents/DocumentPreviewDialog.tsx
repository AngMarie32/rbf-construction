import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Download, Edit, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { documentUrl } from '@/lib/documentFiles';

interface Document {
  id: string;
  name: string;
  description?: string;
  category: string;
  mimeType?: string;
  fileSize?: number;
  filePath?: string;
  sourceType?: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

interface DocumentPreviewDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (document: Document) => void;
  onDownload: (document: Document) => void;
}

const formatFileSize = (bytes?: number) => (!bytes ? '—' : bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Shows the real file: images and PDFs inline, anything else as a download. */
export function DocumentPreviewDialog({ document, open, onOpenChange, onEdit, onDownload }: DocumentPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || !document) return;
    setUrl(null);
    setFailed(false);
    if (!document.filePath) return;
    setLoading(true);
    documentUrl(document)
      .then(setUrl)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [open, document]);

  if (!document) return null;
  const mime = document.mimeType || '';
  const isImage = mime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(document.filePath || '');
  const isPdf = mime.includes('pdf') || /\.pdf$/i.test(document.filePath || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">{document.name}</DialogTitle>
          <DialogDescription>
            {[document.category, formatFileSize(document.fileSize), `Added ${format(document.createdAt, 'MMM d, yyyy')}`].filter(Boolean).join(' · ')}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border bg-muted/40">
          {!document.filePath ? (
            <div className="flex h-72 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p className="font-medium text-foreground">No file attached</p>
              <p className="text-sm">This record was saved without its file. Edit it or upload the document again.</p>
            </div>
          ) : loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : failed || !url ? (
            <div className="flex h-72 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p className="font-medium text-foreground">The file couldn't be opened</p>
              <p className="text-sm">It may have been moved, or document storage isn't set up yet.</p>
            </div>
          ) : isImage ? (
            <img src={url} alt={document.name} className="mx-auto max-h-[65vh] object-contain" />
          ) : isPdf ? (
            <iframe src={url} title={document.name} className="h-[65vh] w-full bg-white" />
          ) : (
            <div className="flex h-72 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p className="text-sm">No preview for this file type. Download it to open it.</p>
            </div>
          )}
        </div>

        {document.description && <p className="text-sm text-muted-foreground">{document.description}</p>}
        {!!document.tags?.length && (
          <div className="flex flex-wrap gap-1">
            {document.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onEdit(document)}>
            <Edit className="mr-2 h-4 w-4" /> Edit details
          </Button>
          {url && (
            <Button variant="outline" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Open in new tab
              </a>
            </Button>
          )}
          <Button onClick={() => onDownload(document)} disabled={!document.filePath}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
