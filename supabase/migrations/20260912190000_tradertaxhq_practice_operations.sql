-- =====================================================================
-- TraderTaxHQ practice operations
--   1. Firm-wide deadline calendar  (tth_firm_deadlines)
--   2. Security program / WISP      (tth_firm_profile, tth_security_*,
--                                    tth_service_providers)
--   3. Lead intake and pipeline     (tth_leads)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Firm profile — one row per company. Drives the WISP document, the
-- public inquiry form, and the retention clock.
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_firm_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  firm_name text NOT NULL,
  legal_entity text,
  ein_last4 text,
  ptin text,
  efin text,
  street text,
  city text,
  state text,
  postal_code text,
  phone text,
  email text,
  website text,
  -- Safeguards Rule 16 CFR 314.4(a): a single qualified individual owns the program.
  security_officer_name text,
  security_officer_title text,
  security_officer_email text,
  wisp_adopted_on date,
  wisp_last_reviewed_on date,
  wisp_version text NOT NULL DEFAULT '1.0',
  retention_years integer NOT NULL DEFAULT 7,
  breach_counsel text,
  cyber_insurer text,
  cyber_policy_number text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Firm-level recurring obligations (PTIN renewal, WISP review, e-file
-- shutdown, information return filing). Client obligations are derived
-- from tth_filings and the engines — these are the ones that belong to
-- the practice itself.
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_firm_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'compliance',
  detail text,
  authority text,
  due_date date NOT NULL,
  recurrence text NOT NULL DEFAULT 'annual',
  owner text,
  status text NOT NULL DEFAULT 'open',
  completed_at timestamptz,
  reminder_days integer NOT NULL DEFAULT 30,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Security controls register — the safeguards the firm claims to have,
-- who owns each, when it was last reviewed, and what the evidence is.
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_security_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  requirement text NOT NULL,
  authority text,
  status text NOT NULL DEFAULT 'not_started',
  owner text,
  evidence text,
  implemented_on date,
  last_reviewed_on date,
  review_months integer NOT NULL DEFAULT 12,
  applicability text NOT NULL DEFAULT 'required',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

-- ---------------------------------------------------------------------
-- Security incident log. 16 CFR 314.4(h) requires a written incident
-- response plan; this is where its execution is recorded.
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  discovered_at timestamptz,
  severity text NOT NULL DEFAULT 'low',
  category text NOT NULL DEFAULT 'other',
  summary text NOT NULL,
  systems_affected text,
  clients_affected integer NOT NULL DEFAULT 0,
  taxpayer_data_involved boolean NOT NULL DEFAULT false,
  containment text,
  remediation text,
  -- Preparers report client data theft to their IRS Stakeholder Liaison and
  -- to the state; FTC notification thresholds are separate.
  reported_irs_at timestamptz,
  reported_state_at timestamptz,
  reported_clients_at timestamptz,
  reported_ftc_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  lessons_learned text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Annual security awareness training log.
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_security_training (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  person_email text,
  role text,
  topic text NOT NULL DEFAULT 'Annual security awareness',
  completed_on date NOT NULL,
  next_due_on date,
  provider text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Service provider register. 16 CFR 314.4(f) requires selecting and
-- overseeing providers that touch customer information.
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  purpose text NOT NULL,
  data_accessed text,
  contract_on_file boolean NOT NULL DEFAULT false,
  security_review_on date,
  next_review_on date,
  soc2 boolean NOT NULL DEFAULT false,
  mfa_enforced boolean NOT NULL DEFAULT false,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Leads — the pipeline before someone becomes a client.
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  source text NOT NULL DEFAULT 'inquiry_form',
  status text NOT NULL DEFAULT 'new',
  tax_year integer,
  service_wanted text,
  -- Screening answers from the public inquiry form.
  screening jsonb NOT NULL DEFAULT '{}'::jsonb,
  triage_score integer,
  triage_tier text,
  triage_summary text,
  complexity jsonb NOT NULL DEFAULT '{}'::jsonb,
  quoted_fee_low numeric(12,2),
  quoted_fee_high numeric(12,2),
  quoted_at timestamptz,
  next_action text,
  next_action_on date,
  owner text,
  lost_reason text,
  converted_client_id uuid REFERENCES public.tth_clients(id) ON DELETE SET NULL,
  converted_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Assignment + reminders on existing client obligations.
-- ---------------------------------------------------------------------
ALTER TABLE public.tth_filings
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS reminder_days integer NOT NULL DEFAULT 14;

ALTER TABLE public.tth_engagements
  ADD COLUMN IF NOT EXISTS retention_until date;

-- ---------------------------------------------------------------------
-- Grants + RLS
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tth_firm_profile','tth_firm_deadlines','tth_security_controls',
    'tth_security_incidents','tth_security_training','tth_service_providers','tth_leads'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$
      CREATE POLICY "Company members manage %1$s"
      ON public.%1$I FOR ALL TO authenticated
      USING (company_id IS NULL OR public.has_company_access(company_id))
      WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));
    $p$, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
CREATE INDEX idx_tth_firm_deadlines_company ON public.tth_firm_deadlines(company_id);
CREATE INDEX idx_tth_firm_deadlines_due ON public.tth_firm_deadlines(due_date) WHERE status = 'open';
CREATE INDEX idx_tth_security_controls_company ON public.tth_security_controls(company_id);
CREATE INDEX idx_tth_security_incidents_company ON public.tth_security_incidents(company_id, occurred_at DESC);
CREATE INDEX idx_tth_security_training_company ON public.tth_security_training(company_id);
CREATE INDEX idx_tth_service_providers_company ON public.tth_service_providers(company_id);
CREATE INDEX idx_tth_leads_company ON public.tth_leads(company_id);
CREATE INDEX idx_tth_leads_status ON public.tth_leads(status);
CREATE INDEX idx_tth_leads_next_action ON public.tth_leads(next_action_on) WHERE status NOT IN ('won','lost');

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tth_firm_profile','tth_firm_deadlines','tth_security_controls',
    'tth_security_incidents','tth_security_training','tth_service_providers','tth_leads'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;
