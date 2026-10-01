ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS project_address text,
  ADD COLUMN IF NOT EXISTS valid_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS proposal_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sov_synced_at timestamptz;
ALTER TABLE public.sov_items ADD COLUMN IF NOT EXISTS source_proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL;