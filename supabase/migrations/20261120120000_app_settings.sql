-- Company-wide app settings (key/value). First used for the hidden menu pages,
-- which previously lived on company_settings and could be lost between sessions.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_read" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_write" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_update" ON public.app_settings;
CREATE POLICY "app_settings_read" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_settings_write" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "app_settings_update" ON public.app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Carry over a list saved the old way, if there is one.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'hidden_nav_items') THEN
    INSERT INTO public.app_settings (key, value)
    SELECT 'hidden_nav_items', to_jsonb(hidden_nav_items)
    FROM public.company_settings
    WHERE hidden_nav_items IS NOT NULL AND array_length(hidden_nav_items, 1) > 0
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
