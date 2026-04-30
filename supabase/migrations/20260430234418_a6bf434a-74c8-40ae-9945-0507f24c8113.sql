
-- Add void + reminder fields to esign_envelopes (expires_at already exists)
ALTER TABLE public.esign_envelopes
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_cadence_days integer,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

-- Allow 'voided' status (status is text so no enum change needed)

-- Schedule reminder dispatcher every hour
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old job if present, then re-schedule
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'esign-send-reminders-hourly';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'esign-send-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://gdrurkccaglzcicpivyy.supabase.co/functions/v1/esign-send-reminders',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcnVya2NjYWdsemNpY3Bpdnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTk2ODAsImV4cCI6MjA4MDI5NTY4MH0.iyiz6WotoN0uI2uPgC9woB6_Lp8-gbCtcN57QkVucVs"}'::jsonb,
    body:=concat('{"scheduled_at": "', now(), '"}')::jsonb
  );
  $$
);
