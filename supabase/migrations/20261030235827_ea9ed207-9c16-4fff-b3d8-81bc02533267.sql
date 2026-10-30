CREATE TABLE public.cost_database (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'labor',
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'HR',
  unit_cost numeric(14,3) NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_database TO authenticated;
GRANT ALL ON public.cost_database TO service_role;
ALTER TABLE public.cost_database ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage cost database" ON public.cost_database FOR ALL TO authenticated
  USING (company_id IS NULL OR public.has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));
CREATE TRIGGER update_cost_database_updated_at BEFORE UPDATE ON public.cost_database
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();