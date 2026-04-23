-- E-Sign envelopes (signature requests)
CREATE TABLE public.esign_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partially_signed','completed','declined','expired','voided')),
  signing_order TEXT NOT NULL DEFAULT 'parallel' CHECK (signing_order IN ('parallel','sequential')),
  source_type TEXT,
  source_id UUID,
  project_id UUID,
  original_pdf_path TEXT,
  signed_pdf_path TEXT,
  certificate_path TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Signers
CREATE TABLE public.esign_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES public.esign_envelopes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','notified','viewed','signed','declined')),
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  notified_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  signature_data TEXT,
  signature_type TEXT CHECK (signature_type IN ('drawn','typed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_esign_signers_envelope ON public.esign_signers(envelope_id);
CREATE INDEX idx_esign_signers_token ON public.esign_signers(access_token);

-- Fields
CREATE TABLE public.esign_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES public.esign_envelopes(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES public.esign_signers(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL CHECK (field_type IN ('signature','initial','date','text','checkbox','name')),
  page_number INTEGER NOT NULL DEFAULT 1,
  x_pct NUMERIC NOT NULL,
  y_pct NUMERIC NOT NULL,
  width_pct NUMERIC NOT NULL DEFAULT 20,
  height_pct NUMERIC NOT NULL DEFAULT 5,
  required BOOLEAN NOT NULL DEFAULT true,
  value TEXT,
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_esign_fields_envelope ON public.esign_fields(envelope_id);
CREATE INDEX idx_esign_fields_signer ON public.esign_fields(signer_id);

-- Audit events
CREATE TABLE public.esign_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES public.esign_envelopes(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES public.esign_signers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_name TEXT,
  actor_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_esign_audit_envelope ON public.esign_audit_events(envelope_id);

-- Templates
CREATE TABLE public.esign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  source_pdf_path TEXT,
  default_fields JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER update_esign_envelopes_updated_at
  BEFORE UPDATE ON public.esign_envelopes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_esign_templates_updated_at
  BEFORE UPDATE ON public.esign_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.esign_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esign_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esign_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esign_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esign_templates ENABLE ROW LEVEL SECURITY;

-- RLS: envelopes (authenticated users manage their own; edge functions use service role for signer access)
CREATE POLICY "Users view own envelopes" ON public.esign_envelopes
  FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users create envelopes" ON public.esign_envelopes
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update own envelopes" ON public.esign_envelopes
  FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users delete own envelopes" ON public.esign_envelopes
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- RLS: signers
CREATE POLICY "Users manage signers of own envelopes" ON public.esign_signers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.esign_envelopes e WHERE e.id = esign_signers.envelope_id AND e.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.esign_envelopes e WHERE e.id = esign_signers.envelope_id AND e.created_by = auth.uid()));

-- RLS: fields
CREATE POLICY "Users manage fields of own envelopes" ON public.esign_fields
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.esign_envelopes e WHERE e.id = esign_fields.envelope_id AND e.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.esign_envelopes e WHERE e.id = esign_fields.envelope_id AND e.created_by = auth.uid()));

-- RLS: audit events
CREATE POLICY "Users view audit of own envelopes" ON public.esign_audit_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.esign_envelopes e WHERE e.id = esign_audit_events.envelope_id AND e.created_by = auth.uid()));
CREATE POLICY "Users insert audit of own envelopes" ON public.esign_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.esign_envelopes e WHERE e.id = esign_audit_events.envelope_id AND e.created_by = auth.uid()));

-- RLS: templates (system templates visible to all, user templates to owner)
CREATE POLICY "View templates" ON public.esign_templates
  FOR SELECT TO authenticated USING (is_system = true OR created_by = auth.uid());
CREATE POLICY "Create own templates" ON public.esign_templates
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND is_system = false);
CREATE POLICY "Update own templates" ON public.esign_templates
  FOR UPDATE TO authenticated USING (created_by = auth.uid() AND is_system = false);
CREATE POLICY "Delete own templates" ON public.esign_templates
  FOR DELETE TO authenticated USING (created_by = auth.uid() AND is_system = false);

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('esign-documents', 'esign-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: contractors manage their files in folder named by their user id
CREATE POLICY "Users upload own esign docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'esign-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own esign docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'esign-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own esign docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'esign-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own esign docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'esign-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed system templates (no PDF attached - user uploads their own or uses defaults)
INSERT INTO public.esign_templates (name, description, category, is_system, default_fields) VALUES
  ('Construction Contract', 'Standard construction agreement between contractor and client', 'Contract', true, '[]'::jsonb),
  ('Change Order', 'Modification to original contract scope, schedule, or cost', 'Change Order', true, '[]'::jsonb),
  ('Invoice', 'Billing invoice for work completed', 'Invoice', true, '[]'::jsonb),
  ('Subcontractor Agreement', 'Agreement between general contractor and subcontractor', 'Subcontractor', true, '[]'::jsonb),
  ('Lien Waiver', 'Conditional or unconditional lien release', 'Lien Waiver', true, '[]'::jsonb),
  ('Proposal', 'Project proposal for client review and approval', 'Proposal', true, '[]'::jsonb);