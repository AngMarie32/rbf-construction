-- Material takeoff behind each estimate line (editable, with the AI's original numbers kept),
-- and the scope the estimator was asked to price.

CREATE TABLE IF NOT EXISTS public.estimate_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  line_id uuid NOT NULL REFERENCES public.estimate_lines(id) ON DELETE CASCADE,
  item text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  unit_cost numeric NOT NULL DEFAULT 0,
  waste_pct numeric NOT NULL DEFAULT 0,
  ai_quantity numeric,
  ai_unit_cost numeric,
  ai_waste_pct numeric,
  basis text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS estimate_materials_line_idx ON public.estimate_materials(line_id);
CREATE INDEX IF NOT EXISTS estimate_materials_estimate_idx ON public.estimate_materials(estimate_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_materials TO authenticated;
GRANT ALL ON public.estimate_materials TO service_role;
ALTER TABLE public.estimate_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members manage estimate materials" ON public.estimate_materials;
CREATE POLICY "Company members manage estimate materials" ON public.estimate_materials FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND (e.company_id IS NULL OR public.has_company_access(e.company_id))))
WITH CHECK (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND (e.company_id IS NULL OR public.has_company_access(e.company_id))));

-- What was asked for: e.g. {"building":false,"site":true,"utilities":true}
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS scope jsonb;

NOTIFY pgrst, 'reload schema';
