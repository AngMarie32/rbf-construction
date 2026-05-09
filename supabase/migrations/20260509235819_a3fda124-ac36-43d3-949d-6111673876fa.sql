CREATE TABLE IF NOT EXISTS public.user_esign_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  signature_data text,
  signature_type text CHECK (signature_type IN ('drawn','typed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_esign_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own esign prefs"
  ON public.user_esign_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own esign prefs"
  ON public.user_esign_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own esign prefs"
  ON public.user_esign_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own esign prefs"
  ON public.user_esign_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_esign_prefs_updated
  BEFORE UPDATE ON public.user_esign_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();