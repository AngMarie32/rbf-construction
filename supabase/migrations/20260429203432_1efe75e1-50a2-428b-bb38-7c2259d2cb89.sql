ALTER TABLE public.esign_envelopes
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS payment_app_number text;