
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Edit, X, FileText, Image, Film, Music } from 'lucide-react';
import { format } from 'date-fns';

interface Document {
  id: string;
  name: string;
  description?: string;
  category: string;
  mimeType?: string;
  fileSize?: number;
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

export function DocumentPreviewDialog({ 
  document, 
  open, 
  onOpenChange, 
  onEdit, 
  onDownload 
}: DocumentPreviewDialogProps) {
  if (!document) return null;

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="w-16 h-16 text-gray-400" />;
    
    if (mimeType.startsWith('image/')) return <Image className="w-16 h-16 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Film className="w-16 h-16 text-red-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-16 h-16 text-green-500" />;
    return <FileText className="w-16 h-16 text-gray-400" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb > 1) return `${mb.toFixed(1)} MB`;
    return `${kb.toFixed(1)} KB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Document Preview
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Header */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {getFileIcon(document.mimeType)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold truncate">{document.name}</h2>
              {document.description && (
                <p className="text-gray-600 mt-1">{document.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary">{document.category}</Badge>
                {document.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Document Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">File Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">File Size:</span>
                  <span>{formatFileSize(document.fileSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span>{document.mimeType || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{format(document.createdAt, 'MMM dd, yyyy HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Modified:</span>
                  <span>{format(document.updatedAt, 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Area */}
          <div className="bg-gray-100 rounded-lg p-8 text-center min-h-64">
            {document.mimeType?.startsWith('image/') ? (
              <div className="text-gray-500">
                <Image className="w-24 h-24 mx-auto mb-4" />
                <p>Image preview would appear here</p>
                <p className="text-sm mt-2">Preview functionality requires file storage integration</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <FileText className="w-24 h-24 mx-auto mb-4" />
                <p>File preview not available</p>
                <p className="text-sm mt-2">Download to view content</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={() => onDownload(document)} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => onEdit(document)} variant="outline" className="flex-1">
              <Edit className="w-4 h-4 mr-2" />
              Edit Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
