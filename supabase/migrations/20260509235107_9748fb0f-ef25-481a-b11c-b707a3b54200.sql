ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid;

CREATE INDEX IF NOT EXISTS idx_documents_source ON public.documents(source_type, source_id);