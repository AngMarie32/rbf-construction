-- Payment applications: keep the details the G702/G703 need, and a snapshot of each
-- line as billed, so an application can be reopened and edited with its real numbers.
ALTER TABLE public.payment_applications_g702
  ADD COLUMN IF NOT EXISTS period_from date,
  ADD COLUMN IF NOT EXISTS application_date date,
  ADD COLUMN IF NOT EXISTS contract_date date,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS architect_name text,
  ADD COLUMN IF NOT EXISTS architect_project_no text,
  ADD COLUMN IF NOT EXISTS contractor_signatory text,
  ADD COLUMN IF NOT EXISTS contractor_title text,
  ADD COLUMN IF NOT EXISTS retainage_percentage numeric,
  ADD COLUMN IF NOT EXISTS retainage_stored_percentage numeric,
  ADD COLUMN IF NOT EXISTS line_items jsonb;
