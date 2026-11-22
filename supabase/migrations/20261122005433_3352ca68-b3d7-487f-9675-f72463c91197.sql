CREATE TABLE public.property_leases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id uuid NOT NULL UNIQUE REFERENCES public.property_units(id) ON DELETE CASCADE,
  lease_type text NOT NULL DEFAULT 'gross' CHECK (lease_type IN ('gross', 'nnn', 'modified_gross', 'percentage', 'month_to_month', 'other')),
  security_deposit numeric(14,3),
  base_nnn_monthly numeric(14,3) NOT NULL DEFAULT 0,
  allocation_method text NOT NULL DEFAULT 'sqft' CHECK (allocation_method IN ('sqft', 'fixed')),
  fixed_allocation_percent numeric(9,6),
  cam_cap_type text NOT NULL DEFAULT 'none' CHECK (cam_cap_type IN ('none', 'percent', 'dollar')),
  cam_cap_value numeric(14,3),
  admin_fee_cap_percent numeric(9,6),
  custom_admin_fee_percent numeric(9,6),
  management_fee_cap_type text NOT NULL DEFAULT 'none' CHECK (management_fee_cap_type IN ('none', 'percent_of_rent', 'per_sqft', 'fixed')),
  management_fee_cap_value numeric(14,3),
  custom_management_fee_type text CHECK (custom_management_fee_type IS NULL OR custom_management_fee_type IN ('fixed', 'percentage')),
  custom_management_fee_amount numeric(14,3),
  custom_management_fee_percent numeric(9,6),
  renewal_terms text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_leases TO authenticated;
GRANT ALL ON public.property_leases TO service_role;
ALTER TABLE public.property_leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage unit leases" ON public.property_leases
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.property_units pu
  JOIN public.properties p ON p.id = pu.property_id
  WHERE pu.id = property_leases.unit_id AND public.has_company_access(p.company_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.property_units pu
  JOIN public.properties p ON p.id = pu.property_id
  WHERE pu.id = property_leases.unit_id AND public.has_company_access(p.company_id)
));

CREATE TABLE public.property_lease_rent_bumps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id uuid NOT NULL REFERENCES public.property_leases(id) ON DELETE CASCADE,
  start_year integer NOT NULL CHECK (start_year >= 1),
  end_year integer NOT NULL CHECK (end_year >= start_year),
  increase_percent numeric(9,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_lease_rent_bumps TO authenticated;
GRANT ALL ON public.property_lease_rent_bumps TO service_role;
ALTER TABLE public.property_lease_rent_bumps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage lease rent bumps" ON public.property_lease_rent_bumps
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.property_leases pl
  JOIN public.property_units pu ON pu.id = pl.unit_id
  JOIN public.properties p ON p.id = pu.property_id
  WHERE pl.id = property_lease_rent_bumps.lease_id AND public.has_company_access(p.company_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.property_leases pl
  JOIN public.property_units pu ON pu.id = pl.unit_id
  JOIN public.properties p ON p.id = pu.property_id
  WHERE pl.id = property_lease_rent_bumps.lease_id AND public.has_company_access(p.company_id)
));

CREATE TABLE public.property_lease_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id uuid NOT NULL REFERENCES public.property_leases(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  content_type text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_lease_documents TO authenticated;
GRANT ALL ON public.property_lease_documents TO service_role;
ALTER TABLE public.property_lease_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage lease documents" ON public.property_lease_documents
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.property_leases pl
  JOIN public.property_units pu ON pu.id = pl.unit_id
  JOIN public.properties p ON p.id = pu.property_id
  WHERE pl.id = property_lease_documents.lease_id AND public.has_company_access(p.company_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.property_leases pl
  JOIN public.property_units pu ON pu.id = pl.unit_id
  JOIN public.properties p ON p.id = pu.property_id
  WHERE pl.id = property_lease_documents.lease_id AND public.has_company_access(p.company_id)
));

CREATE TRIGGER trg_property_leases_updated BEFORE UPDATE ON public.property_leases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_property_lease_rent_bumps_updated BEFORE UPDATE ON public.property_lease_rent_bumps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_property_lease_documents_updated BEFORE UPDATE ON public.property_lease_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_property_lease_rent_bumps_lease ON public.property_lease_rent_bumps(lease_id, start_year);
CREATE INDEX idx_property_lease_documents_lease ON public.property_lease_documents(lease_id, created_at DESC);

CREATE POLICY "Company members access private lease files" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'lease-documents' AND EXISTS (
    SELECT 1 FROM public.property_units pu
    JOIN public.properties p ON p.id = pu.property_id
    WHERE pu.id::text = (storage.foldername(name))[1]
      AND public.has_company_access(p.company_id)
  )
)
WITH CHECK (
  bucket_id = 'lease-documents' AND EXISTS (
    SELECT 1 FROM public.property_units pu
    JOIN public.properties p ON p.id = pu.property_id
    WHERE pu.id::text = (storage.foldername(name))[1]
      AND public.has_company_access(p.company_id)
  )
);