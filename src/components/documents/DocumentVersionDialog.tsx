
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Eye, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentVersion {
  id: string;
  version: number;
  name: string;
  uploadedBy: string;
  uploadedAt: Date;
  fileSize: number;
  comment?: string;
  isCurrent: boolean;
}

interface DocumentVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  versions: DocumentVersion[];
  onUploadNewVersion: () => void;
  onRestoreVersion: (versionId: string) => void;
  onDownloadVersion: (versionId: string) => void;
  onPreviewVersion: (versionId: string) => void;
}

export function DocumentVersionDialog({
  open,
  onOpenChange,
  documentName,
  versions,
  onUploadNewVersion,
  onRestoreVersion,
  onDownloadVersion,
  onPreviewVersion
}: DocumentVersionDialogProps) {
  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb > 1) return `${mb.toFixed(1)} MB`;
    return `${kb.toFixed(1)} KB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Version History - {documentName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              {versions.length} version{versions.length !== 1 ? 's' : ''} available
            </p>
            <Button onClick={onUploadNewVersion}>
              <Upload className="w-4 h-4 mr-2" />
              Upload New Version
            </Button>
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">
                      v{version.version}
                    </TableCell>
                    <TableCell>
                      {version.isCurrent ? (
                        <Badge variant="default">Current</Badge>
                      ) : (
                        <Badge variant="secondary">Archive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {version.uploadedBy}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(version.uploadedAt, 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{formatFileSize(version.fileSize)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {version.comment || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onPreviewVersion(version.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDownloadVersion(version.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {!version.isCurrent && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRestoreVersion(version.id)}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
