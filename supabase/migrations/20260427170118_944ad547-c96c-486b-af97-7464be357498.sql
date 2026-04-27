ALTER TABLE public.esign_envelopes ADD COLUMN IF NOT EXISTS document_type text;
ALTER TABLE public.esign_templates ADD COLUMN IF NOT EXISTS document_type text;