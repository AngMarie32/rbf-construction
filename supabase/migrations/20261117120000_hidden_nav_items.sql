-- Pages an admin has hidden from the left menu for the whole company.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS hidden_nav_items text[] NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
