CREATE TABLE public.fleet_report_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Fleet Cost & Value Report',
  recipients text[] NOT NULL DEFAULT '{}',
  subject_override text,
  frequency text NOT NULL DEFAULT 'weekly',
  day_of_week integer NOT NULL DEFAULT 1,
  day_of_month integer,
  hour integer NOT NULL DEFAULT 7,
  timezone text NOT NULL DEFAULT 'America/New_York',
  run_at timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sent_at timestamptz,
  next_send_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_report_subscriptions TO authenticated;
GRANT ALL ON public.fleet_report_subscriptions TO service_role;

ALTER TABLE public.fleet_report_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own fleet report subscriptions"
ON public.fleet_report_subscriptions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.fleet_report_subs_set_next()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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

CREATE TRIGGER trg_fleet_report_subs_set_next
BEFORE INSERT OR UPDATE ON public.fleet_report_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.fleet_report_subs_set_next();