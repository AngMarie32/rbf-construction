-- ============ COMPANY GROUPS ============
CREATE TABLE public.company_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_groups TO authenticated;
GRANT ALL ON public.company_groups TO service_role;
ALTER TABLE public.company_groups ENABLE ROW LEVEL SECURITY;

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'construction',
  group_id uuid REFERENCES public.company_groups(id) ON DELETE SET NULL,
  logo_url text,
  address text,
  phone text,
  email text,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ============ USER COMPANY ACCESS ============
CREATE TABLE public.user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_companies TO authenticated;
GRANT ALL ON public.user_companies TO service_role;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.role = 'Admin');
$$;

CREATE OR REPLACE FUNCTION public.has_company_access(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_app_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.company_id = _company_id AND uc.user_id = auth.uid()
    )
  );
$$;

-- companies / groups policies
CREATE POLICY "Authenticated can view companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage companies" ON public.companies FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "Authenticated can view company groups" ON public.company_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage company groups" ON public.company_groups FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "Users see own company access" ON public.user_companies FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_app_admin(auth.uid()));
CREATE POLICY "Admins manage company access" ON public.user_companies FOR ALL TO authenticated
  USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));

-- ============ PROPERTIES ============
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  property_type text NOT NULL DEFAULT 'residential',
  purchase_date date,
  purchase_price numeric(14,3),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage properties" ON public.properties FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));

-- ============ UNITS ============
CREATE TABLE public.property_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  bedrooms numeric(4,1),
  bathrooms numeric(4,1),
  square_feet integer,
  market_rent numeric(14,3),
  status text NOT NULL DEFAULT 'vacant',
  tenant_name text,
  tenant_email text,
  tenant_phone text,
  lease_start date,
  lease_end date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_units TO authenticated;
GRANT ALL ON public.property_units TO service_role;
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage units" ON public.property_units FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.has_company_access(p.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND public.has_company_access(p.company_id)));

-- ============ OBLIGATIONS (money owed to / by the company) ============
CREATE TABLE public.company_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'receivable',
  kind text NOT NULL DEFAULT 'other',
  counterparty_name text NOT NULL,
  description text,
  amount numeric(14,3) NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  recurrence text NOT NULL DEFAULT 'one_time',
  property_unit_id uuid REFERENCES public.property_units(id) ON DELETE SET NULL,
  project_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_obligations TO authenticated;
GRANT ALL ON public.company_obligations TO service_role;
ALTER TABLE public.company_obligations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage obligations" ON public.company_obligations FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));

CREATE TABLE public.obligation_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id uuid NOT NULL REFERENCES public.company_obligations(id) ON DELETE CASCADE,
  amount numeric(14,3) NOT NULL DEFAULT 0,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  method text,
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obligation_payments TO authenticated;
GRANT ALL ON public.obligation_payments TO service_role;
ALTER TABLE public.obligation_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage obligation payments" ON public.obligation_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.company_obligations o WHERE o.id = obligation_id AND public.has_company_access(o.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.company_obligations o WHERE o.id = obligation_id AND public.has_company_access(o.company_id)));

CREATE INDEX idx_properties_company ON public.properties(company_id);
CREATE INDEX idx_units_property ON public.property_units(property_id);
CREATE INDEX idx_obligations_company ON public.company_obligations(company_id);
CREATE INDEX idx_obligations_due ON public.company_obligations(due_date);
CREATE INDEX idx_obligation_payments_ob ON public.obligation_payments(obligation_id);

-- ============ TIMESTAMP TRIGGERS ============
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_company_groups_updated BEFORE UPDATE ON public.company_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_units_updated BEFORE UPDATE ON public.property_units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_obligations_updated BEFORE UPDATE ON public.company_obligations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_obligation_payments_updated BEFORE UPDATE ON public.obligation_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ATTACH COMPANY TO EXISTING DATA ============
INSERT INTO public.companies (name, type) VALUES ('RBF Construction', 'construction');

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
UPDATE public.projects SET company_id = (SELECT id FROM public.companies WHERE name = 'RBF Construction' LIMIT 1) WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company_id);

-- grant all existing users access to the default company
INSERT INTO public.user_companies (user_id, company_id, access_level)
SELECT p.id, c.id, 'member' FROM public.profiles p CROSS JOIN public.companies c WHERE c.name = 'RBF Construction'
ON CONFLICT DO NOTHING;

-- ============ REPORTS: COMPANY SCOPING ============
ALTER TABLE public.weekly_report_subscriptions ADD COLUMN IF NOT EXISTS company_ids uuid[];