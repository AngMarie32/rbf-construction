ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.esign_envelopes ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON public.projects (archived_at);
CREATE INDEX IF NOT EXISTS idx_esign_envelopes_archived_at ON public.esign_envelopes (archived_at);