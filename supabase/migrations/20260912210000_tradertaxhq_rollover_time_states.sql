-- =====================================================================
-- TraderTaxHQ — prior-year rollover, time tracking, state positions
-- =====================================================================

-- ---------------------------------------------------------------------
-- Time entries. Without hours there is no realization, and without
-- realization the firm cannot price its own work.
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  engagement_id uuid REFERENCES public.tth_engagements(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.tth_clients(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  minutes integer NOT NULL CHECK (minutes > 0),
  activity text NOT NULL DEFAULT 'preparation',
  description text,
  person text,
  billable boolean NOT NULL DEFAULT true,
  standard_rate numeric(10,2),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- State tax positions the firm has researched. The shipped dataset is a
-- starting point; anything a firm confirms lands here and overrides it.
-- ---------------------------------------------------------------------
CREATE TABLE public.tth_state_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  state_code text NOT NULL,
  topic text NOT NULL,
  position text NOT NULL,
  citation text,
  verified_on date,
  verified_by text,
  review_months integer NOT NULL DEFAULT 12,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, state_code, topic)
);

-- ---------------------------------------------------------------------
-- Rollover lineage
-- ---------------------------------------------------------------------
ALTER TABLE public.tth_engagements
  ADD COLUMN IF NOT EXISTS rolled_from_engagement_id uuid
    REFERENCES public.tth_engagements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rolled_at timestamptz;

ALTER TABLE public.tth_intakes
  ADD COLUMN IF NOT EXISTS rolled_keys text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS confirmed_keys text[] NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------
-- Grants + RLS
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tth_time_entries','tth_state_positions'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$
      CREATE POLICY "Company members manage %1$s"
      ON public.%1$I FOR ALL TO authenticated
      USING (company_id IS NULL OR public.has_company_access(company_id))
      WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));
    $p$, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;

CREATE INDEX idx_tth_time_engagement ON public.tth_time_entries(engagement_id);
CREATE INDEX idx_tth_time_date ON public.tth_time_entries(entry_date DESC);
CREATE INDEX idx_tth_state_positions_state ON public.tth_state_positions(state_code);
CREATE INDEX idx_tth_engagements_rolled_from ON public.tth_engagements(rolled_from_engagement_id);
