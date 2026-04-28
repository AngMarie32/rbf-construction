
-- 1. Document types table (user-managed)
CREATE TABLE IF NOT EXISTS public.esign_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.esign_document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view document types"
  ON public.esign_document_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert document types"
  ON public.esign_document_types FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update document types"
  ON public.esign_document_types FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete document types"
  ON public.esign_document_types FOR DELETE TO authenticated USING (true);

-- Seed the existing hardcoded document types
INSERT INTO public.esign_document_types (name) VALUES
  ('Contract'), ('Change Order'), ('Subcontract'), ('NDA'),
  ('Proposal'), ('Lien Waiver'), ('Payment Application'), ('Bid'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- 2. Allow authenticated users to update/delete system templates (per user request)
DROP POLICY IF EXISTS "Update own templates" ON public.esign_templates;
DROP POLICY IF EXISTS "Delete own templates" ON public.esign_templates;

CREATE POLICY "Update own or system templates"
  ON public.esign_templates FOR UPDATE TO authenticated
  USING (is_system = true OR created_by = auth.uid());

CREATE POLICY "Delete own or system templates"
  ON public.esign_templates FOR DELETE TO authenticated
  USING (is_system = true OR created_by = auth.uid());
