-- Permits were only kept in browser memory. Store them, plus their inspections.

CREATE TABLE public.permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  permit_type text NOT NULL DEFAULT 'Building',
  permit_number text,
  description text NOT NULL DEFAULT '',
  issuing_authority text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Not Applied',
  application_date date,
  issued_date date,
  expiration_date date,
  fee_amount numeric(12,2),
  fee_paid boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX permits_project_idx ON public.permits(project_id);
CREATE INDEX permits_expiration_idx ON public.permits(expiration_date);

ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permits_access" ON public.permits FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
CREATE TRIGGER permits_updated BEFORE UPDATE ON public.permits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.permit_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id uuid NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  inspection_type text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time text,
  inspector text,
  result text NOT NULL DEFAULT 'Scheduled', -- Scheduled | Passed | Failed | Partial | Cancelled
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX permit_inspections_permit_idx ON public.permit_inspections(permit_id);
CREATE INDEX permit_inspections_date_idx ON public.permit_inspections(scheduled_date);

ALTER TABLE public.permit_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permit_inspections_access" ON public.permit_inspections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.permits pm JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.id = permit_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.permits pm JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.id = permit_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
CREATE TRIGGER permit_inspections_updated BEFORE UPDATE ON public.permit_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
