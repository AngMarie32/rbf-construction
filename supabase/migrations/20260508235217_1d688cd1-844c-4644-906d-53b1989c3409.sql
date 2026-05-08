
-- Add payment status to payment apps
ALTER TABLE public.payment_applications_g702
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

-- Lien waivers per payment app
CREATE TABLE IF NOT EXISTS public.payment_app_lien_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_app_id uuid NOT NULL,
  project_id uuid,
  subcontractor_id uuid,
  recipient_name text NOT NULL,
  recipient_email text,
  waiver_type text NOT NULL DEFAULT 'conditional_progress',
  amount numeric NOT NULL DEFAULT 0,
  through_date date,
  status text NOT NULL DEFAULT 'pending',
  envelope_id uuid,
  signed_pdf_path text,
  received_at timestamp with time zone,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lien_waivers_payment_app ON public.payment_app_lien_waivers(payment_app_id);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_envelope ON public.payment_app_lien_waivers(envelope_id);

ALTER TABLE public.payment_app_lien_waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lien waivers"
  ON public.payment_app_lien_waivers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert lien waivers"
  ON public.payment_app_lien_waivers FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update lien waivers"
  ON public.payment_app_lien_waivers FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated can delete lien waivers"
  ON public.payment_app_lien_waivers FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER trg_lien_waivers_updated_at
  BEFORE UPDATE ON public.payment_app_lien_waivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
