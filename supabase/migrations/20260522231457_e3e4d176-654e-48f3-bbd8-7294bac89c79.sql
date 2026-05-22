
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname='weekly-report-dispatcher';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'weekly-report-dispatcher',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://gdrurkccaglzcicpivyy.supabase.co/functions/v1/send-weekly-report',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcnVya2NjYWdsemNpY3Bpdnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTk2ODAsImV4cCI6MjA4MDI5NTY4MH0.iyiz6WotoN0uI2uPgC9woB6_Lp8-gbCtcN57QkVucVs"}'::jsonb,
    body:='{"cron":true}'::jsonb
  );
  $$
);
