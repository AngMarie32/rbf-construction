CREATE TABLE public.overhead_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  amount numeric(14,3) NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly',
  is_active boolean NOT NULL DEFAULT true,
  start_date date,
  end_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.overhead_items TO authenticated;
GRANT ALL ON public.overhead_items TO service_role;

ALTER TABLE public.overhead_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage overhead items"
ON public.overhead_items FOR ALL
TO authenticated
USING (company_id IS NULL OR public.has_company_access(company_id))
WITH CHECK (company_id IS NULL OR public.has_company_access(company_id));

CREATE INDEX idx_overhead_items_company ON public.overhead_items(company_id);

CREATE TRIGGER trg_overhead_items_updated
BEFORE UPDATE ON public.overhead_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();