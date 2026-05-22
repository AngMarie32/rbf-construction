
-- Subscriptions
CREATE TABLE public.weekly_report_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Weekly Recap',
  sections text[] NOT NULL DEFAULT ARRAY['projects','financials','schedule','documents']::text[],
  recipients text[] NOT NULL DEFAULT '{}'::text[],
  day_of_week int NOT NULL DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6),
  hour int NOT NULL DEFAULT 7 CHECK (hour BETWEEN 0 AND 23),
  timezone text NOT NULL DEFAULT 'America/New_York',
  project_ids uuid[] NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz NULL,
  next_send_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_report_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own weekly report subs"
  ON public.weekly_report_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Runs
CREATE TABLE public.weekly_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.weekly_report_subscriptions(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  error_message text NULL,
  recipient_count int NOT NULL DEFAULT 0,
  sections text[] NOT NULL DEFAULT '{}'::text[],
  is_test boolean NOT NULL DEFAULT false
);

ALTER TABLE public.weekly_report_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view runs of own subs"
  ON public.weekly_report_runs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.weekly_report_subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()));

CREATE POLICY "Service role can insert runs"
  ON public.weekly_report_runs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.weekly_report_subscriptions s WHERE s.id = subscription_id AND s.user_id = auth.uid()));

-- Function to compute next send timestamp in a timezone
CREATE OR REPLACE FUNCTION public.compute_next_weekly_send(p_day int, p_hour int, p_tz text, p_after timestamptz)
RETURNS timestamptz LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  local_now timestamp;
  base_date date;
  local_target timestamp;
  days_ahead int;
BEGIN
  local_now := (p_after AT TIME ZONE p_tz);
  base_date := local_now::date;
  days_ahead := (p_day - EXTRACT(DOW FROM base_date)::int + 7) % 7;
  local_target := (base_date + days_ahead) + make_time(p_hour, 0, 0);
  IF local_target <= local_now THEN
    local_target := local_target + interval '7 days';
  END IF;
  RETURN local_target AT TIME ZONE p_tz;
END;
$$;

-- Trigger to recompute next_send_at
CREATE OR REPLACE FUNCTION public.weekly_report_subs_set_next()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.enabled THEN
    IF TG_OP = 'INSERT'
       OR NEW.day_of_week IS DISTINCT FROM OLD.day_of_week
       OR NEW.hour IS DISTINCT FROM OLD.hour
       OR NEW.timezone IS DISTINCT FROM OLD.timezone
       OR NEW.enabled IS DISTINCT FROM OLD.enabled THEN
      NEW.next_send_at := public.compute_next_weekly_send(NEW.day_of_week, NEW.hour, NEW.timezone, now());
    END IF;
  ELSE
    NEW.next_send_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_weekly_report_subs_set_next
  BEFORE INSERT OR UPDATE ON public.weekly_report_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.weekly_report_subs_set_next();

CREATE INDEX idx_weekly_report_subs_due ON public.weekly_report_subscriptions(next_send_at) WHERE enabled = true;
CREATE INDEX idx_weekly_report_runs_sub ON public.weekly_report_runs(subscription_id, sent_at DESC);
