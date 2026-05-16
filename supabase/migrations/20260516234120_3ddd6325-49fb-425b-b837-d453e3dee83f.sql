
-- Folders for organizing bulk invoices
CREATE TABLE public.bulk_invoice_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_invoice_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own folders"
ON public.bulk_invoice_folders FOR ALL TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE TRIGGER update_bulk_invoice_folders_updated_at
BEFORE UPDATE ON public.bulk_invoice_folders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder + archive to bulk_invoices
ALTER TABLE public.bulk_invoices
  ADD COLUMN folder_id uuid REFERENCES public.bulk_invoice_folders(id) ON DELETE SET NULL,
  ADD COLUMN archived_at timestamptz;

-- Email delivery tracking on sends
ALTER TABLE public.bulk_invoice_sends
  ADD COLUMN delivered_at timestamptz,
  ADD COLUMN opened_at timestamptz,
  ADD COLUMN last_event_at timestamptz;

-- Allow service role to update sends (webhook will use service role anyway, but add user UPDATE policy too)
CREATE POLICY "Users update own invoice sends"
ON public.bulk_invoice_sends FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM bulk_invoices b WHERE b.id = bulk_invoice_sends.bulk_invoice_id AND b.created_by = auth.uid()));

CREATE INDEX idx_bulk_invoice_sends_resend_id ON public.bulk_invoice_sends(resend_id);
