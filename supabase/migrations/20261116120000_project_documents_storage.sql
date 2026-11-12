-- Documents uploaded on the Documents page were saved without their file. Give them storage,
-- and keep favorites and archive on the record instead of in the browser.

INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "project_documents_read" ON storage.objects;
DROP POLICY IF EXISTS "project_documents_write" ON storage.objects;
DROP POLICY IF EXISTS "project_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "project_documents_delete" ON storage.objects;
CREATE POLICY "project_documents_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'project-documents');
CREATE POLICY "project_documents_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-documents');
CREATE POLICY "project_documents_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'project-documents');
CREATE POLICY "project_documents_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-documents');

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

NOTIFY pgrst, 'reload schema';
