CREATE TABLE public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  location text,
  area_sf numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  contingency_pct numeric NOT NULL DEFAULT 5,
  overhead_pct numeric NOT NULL DEFAULT 4,
  profit_pct numeric NOT NULL DEFAULT 6,
  bond_pct numeric NOT NULL DEFAULT 1,
  scope_summary text,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimates TO authenticated;
GRANT ALL ON public.estimates TO service_role;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage estimates" ON public.estimates FOR ALL TO authenticated
USING (company_id IS NULL OR public.has_company_access(company_id))
WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));

CREATE TRIGGER trg_estimates_updated BEFORE UPDATE ON public.estimates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.estimate_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  group_key text NOT NULL DEFAULT 'building',
  group_name text NOT NULL DEFAULT 'BUILDING DIRECT COST',
  section_name text NOT NULL DEFAULT 'General',
  name text NOT NULL,
  baseline_amount numeric NOT NULL DEFAULT 0,
  override_amount numeric,
  quantity numeric,
  unit text,
  unit_cost numeric,
  confidence text NOT NULL DEFAULT 'C',
  status text NOT NULL DEFAULT 'Modeled',
  basis text,
  source text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_lines TO authenticated;
GRANT ALL ON public.estimate_lines TO service_role;
ALTER TABLE public.estimate_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage estimate lines" ON public.estimate_lines FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND (e.company_id IS NULL OR public.has_company_access(e.company_id))))
WITH CHECK (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND (e.company_id IS NULL OR public.has_company_access(e.company_id))));

CREATE TRIGGER trg_estimate_lines_updated BEFORE UPDATE ON public.estimate_lines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.estimate_subcosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL REFERENCES public.estimate_lines(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'included',
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_subcosts TO authenticated;
GRANT ALL ON public.estimate_subcosts TO service_role;
ALTER TABLE public.estimate_subcosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage estimate subcosts" ON public.estimate_subcosts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.estimate_lines l JOIN public.estimates e ON e.id = l.estimate_id WHERE l.id = line_id AND (e.company_id IS NULL OR public.has_company_access(e.company_id))))
WITH CHECK (EXISTS (SELECT 1 FROM public.estimate_lines l JOIN public.estimates e ON e.id = l.estimate_id WHERE l.id = line_id AND (e.company_id IS NULL OR public.has_company_access(e.company_id))));

CREATE TABLE public.estimate_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'medium',
  issue text NOT NULL,
  finding text,
  exposure text,
  action text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_flags TO authenticated;
GRANT ALL ON public.estimate_flags TO service_role;
ALTER TABLE public.estimate_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage estimate flags" ON public.estimate_flags FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND (e.company_id IS NULL OR public.has_company_access(e.company_id))))
WITH CHECK (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND (e.company_id IS NULL OR public.has_company_access(e.company_id))));

CREATE TABLE public.estimate_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  line_id uuid REFERENCES public.estimate_lines(id) ON DELETE SET NULL,
  trade text NOT NULL,
  company_name text NOT NULL,
  raw_amount numeric NOT NULL DEFAULT 0,
  leveling_additions numeric NOT NULL DEFAULT 0,
  leveling_credits numeric NOT NULL DEFAULT 0,
  inclusions text,
  exclusions text,
  notes text,
  recommended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_bids TO authenticated;
GRANT ALL ON public.estimate_bids TO service_role;
ALTER TABLE public.estimate_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage estimate bids" ON public.estimate_bids FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND (e.company_id IS NULL OR public.has_company_access(e.company_id))))
WITH CHECK (EXISTS (SELECT 1 FROM public.estimates e WHERE e.id = estimate_id AND (e.company_id IS NULL OR public.has_company_access(e.company_id))));

CREATE TRIGGER trg_estimate_bids_updated BEFORE UPDATE ON public.estimate_bids
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_estimate_lines_estimate ON public.estimate_lines(estimate_id);
CREATE INDEX idx_estimate_subcosts_line ON public.estimate_subcosts(line_id);
CREATE INDEX idx_estimate_flags_estimate ON public.estimate_flags(estimate_id);
CREATE INDEX idx_estimate_bids_estimate ON public.estimate_bids(estimate_id);