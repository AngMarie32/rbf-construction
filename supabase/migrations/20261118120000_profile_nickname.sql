-- Nickname used by the dashboard greeting (falls back to first name when blank).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname text;

NOTIFY pgrst, 'reload schema';
