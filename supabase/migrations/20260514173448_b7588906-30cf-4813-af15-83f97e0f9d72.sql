
-- Bulk invoices table
CREATE TABLE public.bulk_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  project_id UUID,
  invoice_number TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  amount NUMERIC(14,3) DEFAULT 0,
  notes TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  cc_emails TEXT[] DEFAULT '{}',
  subject TEXT,
  message TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'one_time', -- 'one_time' | 'monthly'
  next_send_date DATE,
  last_sent_at TIMESTAMPTZ,
  send_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | sent | active | paused | completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bulk invoices"
ON public.bulk_invoices FOR ALL TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE INDEX idx_bulk_invoices_project ON public.bulk_invoices(project_id);
CREATE INDEX idx_bulk_invoices_status ON public.bulk_invoices(status);

CREATE TRIGGER trg_bulk_invoices_updated
BEFORE UPDATE ON public.bulk_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Send log
CREATE TABLE public.bulk_invoice_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_invoice_id UUID NOT NULL REFERENCES public.bulk_invoices(id) ON DELETE CASCADE,
  sent_to TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  resend_id TEXT,
  file_path TEXT
);

ALTER TABLE public.bulk_invoice_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own invoice sends"
ON public.bulk_invoice_sends FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.bulk_invoices b WHERE b.id = bulk_invoice_sends.bulk_invoice_id AND b.created_by = auth.uid()));

CREATE POLICY "Users insert own invoice sends"
ON public.bulk_invoice_sends FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.bulk_invoices b WHERE b.id = bulk_invoice_sends.bulk_invoice_id AND b.created_by = auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bulk-invoices', 'bulk-invoices', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own bulk invoice files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'bulk-invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own bulk invoice files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bulk-invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own bulk invoice files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'bulk-invoices' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own bulk invoice files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bulk-invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
