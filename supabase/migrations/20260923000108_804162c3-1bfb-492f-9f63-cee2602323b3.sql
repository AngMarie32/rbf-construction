ALTER TABLE public.sov_items
  ADD COLUMN IF NOT EXISTS source_estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_estimate_line_id uuid REFERENCES public.estimate_lines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sov_items_source_estimate ON public.sov_items(source_estimate_id);

ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS sov_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sov_synced_at timestamptz;