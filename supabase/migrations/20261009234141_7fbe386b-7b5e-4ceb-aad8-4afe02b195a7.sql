ALTER TABLE public.overhead_items ADD COLUMN IF NOT EXISTS external_ref text;
ALTER TABLE public.project_billing ADD COLUMN IF NOT EXISTS external_ref text;
CREATE INDEX IF NOT EXISTS overhead_items_external_ref_idx ON public.overhead_items (external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS project_billing_external_ref_idx ON public.project_billing (external_ref) WHERE external_ref IS NOT NULL;