-- Daily smart-reminder email (overdue invoices, sub insurance, permit inspections and expiry, job cost jumps).
-- Runs at 12:15 UTC (7:15 am Central). Calls the send-reminders edge function in cron mode.
SELECT cron.schedule(
  'daily-smart-reminders',
  '15 12 * * *',
  $$
  SELECT net.http_post(
    url:='https://gdrurkccaglzcicpivyy.supabase.co/functions/v1/send-reminders',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcnVya2NjYWdsemNpY3Bpdnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTk2ODAsImV4cCI6MjA4MDI5NTY4MH0.iyiz6WotoN0uI2uPgC9woB6_Lp8-gbCtcN57QkVucVs","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcnVya2NjYWdsemNpY3Bpdnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTk2ODAsImV4cCI6MjA4MDI5NTY4MH0.iyiz6WotoN0uI2uPgC9woB6_Lp8-gbCtcN57QkVucVs"}'::jsonb,
    body:='{"cron":true}'::jsonb
  );
  $$
);
