CREATE TABLE public.analytics_report_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null default 'Business Analytics Report',
  recipients text[] not null default '{}',
  subject_override text,
  frequency text not null default 'weekly',
  day_of_week integer not null default 1,
  day_of_month integer,
  hour integer not null default 7,
  timezone text not null default 'America/New_York',
  run_at timestamptz,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  last_sent_at timestamptz,
  next_send_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_report_subscriptions TO authenticated;
GRANT ALL ON public.analytics_report_subscriptions TO service_role;

ALTER TABLE public.analytics_report_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their analytics report subscriptions"
ON public.analytics_report_subscriptions FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_app_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_app_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.analytics_report_subs_set_next()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.enabled THEN
    NEW.next_send_at := public.compute_next_scheduled_send(
      NEW.frequency, NEW.day_of_week, NEW.day_of_month, NEW.hour, NEW.timezone, NEW.run_at, now()
    );
  ELSE
    NEW.next_send_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_analytics_report_subs_set_next
BEFORE INSERT OR UPDATE ON public.analytics_report_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.analytics_report_subs_set_next();

SELECT cron.schedule(
  'analytics-report-dispatcher',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://gdrurkccaglzcicpivyy.supabase.co/functions/v1/send-analytics-report',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcnVya2NjYWdsemNpY3Bpdnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTk2ODAsImV4cCI6MjA4MDI5NTY4MH0.iyiz6WotoN0uI2uPgC9woB6_Lp8-gbCtcN57QkVucVs"}'::jsonb,
    body:='{"cron":true}'::jsonb
  );
  $$
);