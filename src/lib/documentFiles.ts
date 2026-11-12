import { supabase } from '@/integrations/supabase/client';

export const DOCUMENTS_BUCKET = 'project-documents';

/** Which storage bucket a document's file lives in (Document Sender mirrors its files here). */
export function bucketFor(doc: { sourceType?: string | null; filePath?: string | null }) {
  if (doc.sourceType === 'document_sender') return 'bulk-invoices';
  if (doc.sourceType === 'esign') return 'esign-documents';
  return DOCUMENTS_BUCKET;
}

/** A short-lived link to the file, or null when the document has no file. */
export async function documentUrl(doc: { sourceType?: string | null; filePath?: string | null }, opts: { download?: string } = {}) {
  if (!doc.filePath) return null;
  if (/^https?:\/\//.test(doc.filePath)) return doc.filePath;
  const { data, error } = await supabase.storage
    .from(bucketFor(doc))
    .createSignedUrl(doc.filePath, 600, opts.download ? { download: opts.download } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export const safeFileName = (name: string) => name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim();
