-- Surety bonds per project, and the company's bonding capacity (in Settings).

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS bond_capacity_single numeric(14,2),
  ADD COLUMN IF NOT EXISTS bond_capacity_aggregate numeric(14,2),
  ADD COLUMN IF NOT EXISTS surety_company text,
  ADD COLUMN IF NOT EXISTS surety_agent text,
  ADD COLUMN IF NOT EXISTS surety_agent_email text,
  ADD COLUMN IF NOT EXISTS surety_agent_phone text;

CREATE TABLE IF NOT EXISTS public.project_bonds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bond_type text NOT NULL DEFAULT 'Performance',   -- Bid | Performance | Payment | Performance & Payment | Maintenance | License | Other
  bond_number text,
  surety text,
  obligee text,
  amount numeric(14,2) NOT NULL DEFAULT 0,         -- penal sum
  premium numeric(12,2),
  premium_paid boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Requested',        -- Requested | Active | Released | Expired
  effective_date date,
  expiration_date date,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_bonds_project_idx ON public.project_bonds(project_id);
CREATE INDEX IF NOT EXISTS project_bonds_expiration_idx ON public.project_bonds(expiration_date);

ALTER TABLE public.project_bonds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_bonds_access" ON public.project_bonds;
CREATE POLICY "project_bonds_access" ON public.project_bonds FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
DROP TRIGGER IF EXISTS project_bonds_updated ON public.project_bonds;
CREATE TRIGGER project_bonds_updated BEFORE UPDATE ON public.project_bonds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
