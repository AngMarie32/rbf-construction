
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  trade text,
  hourly_rate numeric,
  ot_multiplier numeric NOT NULL DEFAULT 1.5,
  burden_percent numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_access" ON public.employees FOR ALL TO authenticated
  USING (company_id IS NULL OR public.has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));
CREATE TRIGGER employees_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.trade_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  trade text NOT NULL,
  hourly_rate numeric NOT NULL DEFAULT 0,
  ot_multiplier numeric NOT NULL DEFAULT 1.5,
  burden_percent numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_rates TO authenticated;
GRANT ALL ON public.trade_rates TO service_role;
ALTER TABLE public.trade_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trade_rates_access" ON public.trade_rates FOR ALL TO authenticated
  USING (company_id IS NULL OR public.has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));
CREATE TRIGGER trade_rates_updated BEFORE UPDATE ON public.trade_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name text NOT NULL,
  trade text,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  regular_hours numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  ot_multiplier numeric NOT NULL DEFAULT 1.5,
  burden_percent numeric NOT NULL DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (
    ((regular_hours * hourly_rate) + (overtime_hours * hourly_rate * ot_multiplier))
    * (1 + burden_percent / 100)
  ) STORED,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  import_batch_id uuid REFERENCES public.qb_import_batches(id) ON DELETE SET NULL,
  external_ref text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX time_entries_project_date_idx ON public.time_entries(project_id, work_date DESC);
CREATE INDEX time_entries_external_ref_idx ON public.time_entries(external_ref);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_entries_access" ON public.time_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
CREATE TRIGGER time_entries_updated BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
