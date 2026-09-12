-- =====================================================================
-- TraderTaxHQ consultation & filing system
-- Client intake -> secure documents (TitanFile) -> analysis -> consult -> filings
-- =====================================================================

-- ---------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  legal_name text,
  email text,
  phone text,
  entity_type text NOT NULL DEFAULT 'individual',
  filing_status text,
  home_state text,
  other_states text[] NOT NULL DEFAULT '{}',
  tax_id_last4 text,
  spouse_name text,
  occupation text,
  status text NOT NULL DEFAULT 'lead',
  source text,
  titanfile_channel_id text,
  titanfile_channel_url text,
  titanfile_contact_email text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Engagements (one per client per tax year / service)
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.tth_clients(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  service_type text NOT NULL DEFAULT 'consultation',
  status text NOT NULL DEFAULT 'intake',
  fee numeric(12,2),
  engagement_letter_signed_at timestamptz,
  titanfile_channel_id text,
  titanfile_channel_url text,
  target_date date,
  consult_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, tax_year, service_type)
);

-- ---------------------------------------------------------------------
-- Intake questionnaires (client-facing, token addressable)
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.tth_engagements(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.tth_clients(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  schema_version text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT 'draft',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  completion_pct numeric(5,2) NOT NULL DEFAULT 0,
  access_token text UNIQUE,
  token_expires_at timestamptz,
  sent_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id)
);

-- ---------------------------------------------------------------------
-- Document requests (mirrored against a TitanFile channel)
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.tth_engagements(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  description text,
  is_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'requested',
  due_date date,
  titanfile_file_id text,
  titanfile_file_name text,
  titanfile_path text,
  titanfile_size bigint,
  received_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Analyses (deterministic engine output + AI drafted memo)
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.tth_engagements(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  engine_version text NOT NULL DEFAULT 'v1',
  computed jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_memo text,
  ai_call_script text,
  ai_model text,
  ai_raw jsonb,
  status text NOT NULL DEFAULT 'draft',
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Recommended positions / action plan
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.tth_engagements(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.tth_analyses(id) ON DELETE SET NULL,
  code text NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  recommendation text,
  rationale text,
  authority text,
  risk_level text NOT NULL DEFAULT 'medium',
  impact_estimate numeric(14,2),
  status text NOT NULL DEFAULT 'proposed',
  due_date date,
  owner text,
  decided_at timestamptz,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Filing checklist
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.tth_engagements(id) ON DELETE CASCADE,
  tax_year integer NOT NULL,
  form_code text NOT NULL,
  form_name text NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'federal',
  entity_scope text NOT NULL DEFAULT 'individual',
  due_date date,
  extended_due_date date,
  status text NOT NULL DEFAULT 'not_started',
  extension_filed_at timestamptz,
  filed_at timestamptz,
  confirmation_number text,
  preparer text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Consultations
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.tth_engagements(id) ON DELETE CASCADE,
  scheduled_at timestamptz,
  duration_minutes integer NOT NULL DEFAULT 60,
  mode text NOT NULL DEFAULT 'video',
  attendees text[] NOT NULL DEFAULT '{}',
  agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  recording_url text,
  summary_sent_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Activity log (intake sends, TitanFile syncs, AI runs)
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.tth_clients(id) ON DELETE CASCADE,
  engagement_id uuid REFERENCES public.tth_engagements(id) ON DELETE CASCADE,
  kind text NOT NULL,
  message text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Grants + RLS
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tth_clients','tth_engagements','tth_intakes','tth_document_requests',
    'tth_analyses','tth_positions','tth_filings','tth_consultations','tth_activity'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- Clients are scoped by company (NULL company = shared/global book of business).
CREATE POLICY "Company members manage tth clients"
ON public.tth_clients FOR ALL TO authenticated
USING (company_id IS NULL OR public.has_company_access(company_id))
WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));

CREATE POLICY "Company members manage tth engagements"
ON public.tth_engagements FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tth_clients c
    WHERE c.id = tth_engagements.client_id
      AND (c.company_id IS NULL OR public.has_company_access(c.company_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tth_clients c
    WHERE c.id = tth_engagements.client_id
      AND (c.company_id IS NULL OR public.has_company_access(c.company_id))
  )
);

-- Child tables inherit access through their engagement.
CREATE OR REPLACE FUNCTION public.tth_can_access_engagement(_engagement_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.tth_engagements e
    JOIN public.tth_clients c ON c.id = e.client_id
    WHERE e.id = _engagement_id
      AND (c.company_id IS NULL OR public.has_company_access(c.company_id))
  );
$$;

CREATE POLICY "Engagement members manage tth intakes"
ON public.tth_intakes FOR ALL TO authenticated
USING (public.tth_can_access_engagement(engagement_id))
WITH CHECK (public.tth_can_access_engagement(engagement_id));

CREATE POLICY "Engagement members manage tth document requests"
ON public.tth_document_requests FOR ALL TO authenticated
USING (public.tth_can_access_engagement(engagement_id))
WITH CHECK (public.tth_can_access_engagement(engagement_id));

CREATE POLICY "Engagement members manage tth analyses"
ON public.tth_analyses FOR ALL TO authenticated
USING (public.tth_can_access_engagement(engagement_id))
WITH CHECK (public.tth_can_access_engagement(engagement_id));

CREATE POLICY "Engagement members manage tth positions"
ON public.tth_positions FOR ALL TO authenticated
USING (public.tth_can_access_engagement(engagement_id))
WITH CHECK (public.tth_can_access_engagement(engagement_id));

CREATE POLICY "Engagement members manage tth filings"
ON public.tth_filings FOR ALL TO authenticated
USING (public.tth_can_access_engagement(engagement_id))
WITH CHECK (public.tth_can_access_engagement(engagement_id));

CREATE POLICY "Engagement members manage tth consultations"
ON public.tth_consultations FOR ALL TO authenticated
USING (public.tth_can_access_engagement(engagement_id))
WITH CHECK (public.tth_can_access_engagement(engagement_id));

CREATE POLICY "Engagement members read tth activity"
ON public.tth_activity FOR ALL TO authenticated
USING (
  engagement_id IS NULL
  OR public.tth_can_access_engagement(engagement_id)
)
WITH CHECK (
  engagement_id IS NULL
  OR public.tth_can_access_engagement(engagement_id)
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
CREATE INDEX idx_tth_clients_company ON public.tth_clients(company_id);
CREATE INDEX idx_tth_clients_status ON public.tth_clients(status);
CREATE INDEX idx_tth_engagements_client ON public.tth_engagements(client_id);
CREATE INDEX idx_tth_engagements_year ON public.tth_engagements(tax_year);
CREATE INDEX idx_tth_engagements_status ON public.tth_engagements(status);
CREATE INDEX idx_tth_intakes_engagement ON public.tth_intakes(engagement_id);
CREATE INDEX idx_tth_intakes_token ON public.tth_intakes(access_token);
CREATE INDEX idx_tth_docreq_engagement ON public.tth_document_requests(engagement_id);
CREATE INDEX idx_tth_docreq_status ON public.tth_document_requests(status);
CREATE INDEX idx_tth_analyses_engagement ON public.tth_analyses(engagement_id);
CREATE INDEX idx_tth_positions_engagement ON public.tth_positions(engagement_id);
CREATE INDEX idx_tth_filings_engagement ON public.tth_filings(engagement_id);
CREATE INDEX idx_tth_filings_due ON public.tth_filings(due_date);
CREATE INDEX idx_tth_consultations_engagement ON public.tth_consultations(engagement_id);
CREATE INDEX idx_tth_activity_engagement ON public.tth_activity(engagement_id, created_at DESC);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tth_clients','tth_engagements','tth_intakes','tth_document_requests',
    'tth_analyses','tth_positions','tth_filings','tth_consultations'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;
