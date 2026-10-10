
-- COST CODES
CREATE TABLE public.cost_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  division text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cost_codes_company_code_idx ON public.cost_codes (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_codes TO authenticated;
GRANT ALL ON public.cost_codes TO service_role;
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_codes_access" ON public.cost_codes FOR ALL TO authenticated
  USING (company_id IS NULL OR public.has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));
CREATE TRIGGER cost_codes_updated BEFORE UPDATE ON public.cost_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- IMPORT BATCHES
CREATE TABLE public.qb_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  source_report text,
  imported_by uuid,
  imported_by_name text,
  row_count integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qb_import_batches TO authenticated;
GRANT ALL ON public.qb_import_batches TO service_role;
ALTER TABLE public.qb_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qb_import_batches_access" ON public.qb_import_batches FOR ALL TO authenticated
  USING (company_id IS NULL OR public.has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));
CREATE TRIGGER qb_import_batches_updated BEFORE UPDATE ON public.qb_import_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- IMPORT LINES
CREATE TABLE public.qb_import_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.qb_import_batches(id) ON DELETE CASCADE,
  row_index integer NOT NULL DEFAULT 0,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  txn_date date,
  vendor text,
  account text,
  job_name text,
  memo text,
  ref_number text,
  amount numeric NOT NULL DEFAULT 0,
  matched_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  matched_cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  category text,
  confidence numeric NOT NULL DEFAULT 0,
  match_reason text,
  status text NOT NULL DEFAULT 'pending',
  expense_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qb_import_lines_batch_idx ON public.qb_import_lines(batch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qb_import_lines TO authenticated;
GRANT ALL ON public.qb_import_lines TO service_role;
ALTER TABLE public.qb_import_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qb_import_lines_access" ON public.qb_import_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qb_import_batches b WHERE b.id = batch_id AND (b.company_id IS NULL OR public.has_company_access(b.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.qb_import_batches b WHERE b.id = batch_id AND (b.company_id IS NULL OR public.has_company_access(b.company_id))));
CREATE TRIGGER qb_import_lines_updated BEFORE UPDATE ON public.qb_import_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MAPPING RULES
CREATE TABLE public.qb_mapping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  match_type text NOT NULL,
  match_value text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  category text,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qb_mapping_rules_lookup_idx ON public.qb_mapping_rules(match_type, match_value);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qb_mapping_rules TO authenticated;
GRANT ALL ON public.qb_mapping_rules TO service_role;
ALTER TABLE public.qb_mapping_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qb_mapping_rules_access" ON public.qb_mapping_rules FOR ALL TO authenticated
  USING (company_id IS NULL OR public.has_company_access(company_id))
  WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));
CREATE TRIGGER qb_mapping_rules_updated BEFORE UPDATE ON public.qb_mapping_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- EXPENSES EXTENSIONS
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.qb_import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_ref text;
CREATE INDEX IF NOT EXISTS expenses_external_ref_idx ON public.expenses(external_ref);

-- DAILY LOGS
CREATE TABLE public.daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  crew_name text,
  headcount integer NOT NULL DEFAULT 0,
  hours numeric NOT NULL DEFAULT 0,
  work_performed text,
  weather_summary text,
  temperature_high numeric,
  temperature_low numeric,
  delays text,
  delay_cause text,
  deliveries text,
  visitors text,
  safety_notes text,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX daily_logs_project_date_idx ON public.daily_logs(project_id, log_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_logs TO authenticated;
GRANT ALL ON public.daily_logs TO service_role;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_logs_access" ON public.daily_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
CREATE TRIGGER daily_logs_updated BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.daily_log_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id uuid REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  caption text,
  taken_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid,
  uploaded_by_name text,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_log_photos TO authenticated;
GRANT ALL ON public.daily_log_photos TO service_role;
ALTER TABLE public.daily_log_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_log_photos_access" ON public.daily_log_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));

-- RFIS
CREATE TABLE public.rfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number integer NOT NULL DEFAULT 1,
  subject text NOT NULL,
  question text,
  answer text,
  assigned_to text,
  submitted_by text,
  date_submitted date NOT NULL DEFAULT CURRENT_DATE,
  date_due date,
  date_answered date,
  status text NOT NULL DEFAULT 'Open',
  priority text NOT NULL DEFAULT 'Normal',
  cost_impact numeric,
  schedule_impact_days integer,
  spec_section text,
  drawing_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rfis_project_idx ON public.rfis(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfis TO authenticated;
GRANT ALL ON public.rfis TO service_role;
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfis_access" ON public.rfis FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
CREATE TRIGGER rfis_updated BEFORE UPDATE ON public.rfis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SUBMITTALS
CREATE TABLE public.submittals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  spec_section text,
  submittal_type text,
  revision integer NOT NULL DEFAULT 0,
  ball_in_court text,
  responsible_contractor text,
  date_submitted date NOT NULL DEFAULT CURRENT_DATE,
  date_required date,
  date_returned date,
  status text NOT NULL DEFAULT 'Pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX submittals_project_idx ON public.submittals(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submittals TO authenticated;
GRANT ALL ON public.submittals TO service_role;
ALTER TABLE public.submittals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submittals_access" ON public.submittals FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
CREATE TRIGGER submittals_updated BEFORE UPDATE ON public.submittals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COMMITMENTS
CREATE TABLE public.commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  commitment_type text NOT NULL DEFAULT 'Subcontract',
  number text,
  title text NOT NULL,
  vendor_name text,
  subcontractor_id uuid REFERENCES public.subcontractors(id) ON DELETE SET NULL,
  original_amount numeric NOT NULL DEFAULT 0,
  approved_changes numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  executed_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commitments_project_idx ON public.commitments(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitments TO authenticated;
GRANT ALL ON public.commitments TO service_role;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commitments_access" ON public.commitments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
CREATE TRIGGER commitments_updated BEFORE UPDATE ON public.commitments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.commitment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id uuid NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  description text NOT NULL,
  cost_code_id uuid REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitment_items TO authenticated;
GRANT ALL ON public.commitment_items TO service_role;
ALTER TABLE public.commitment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commitment_items_access" ON public.commitment_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commitments c JOIN public.projects p ON p.id = c.project_id WHERE c.id = commitment_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.commitments c JOIN public.projects p ON p.id = c.project_id WHERE c.id = commitment_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
CREATE TRIGGER commitment_items_updated BEFORE UPDATE ON public.commitment_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
