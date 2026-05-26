
ALTER TABLE public.weekly_report_subscriptions
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS day_of_month int,
  ADD COLUMN IF NOT EXISTS run_at timestamptz,
  ADD COLUMN IF NOT EXISTS subject_override text,
  ADD COLUMN IF NOT EXISTS date_range_days int,
  ADD COLUMN IF NOT EXISTS only_changes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attach_csv boolean NOT NULL DEFAULT false;

ALTER TABLE public.weekly_report_subscriptions
  DROP CONSTRAINT IF EXISTS weekly_report_subs_frequency_check;
ALTER TABLE public.weekly_report_subscriptions
  ADD CONSTRAINT weekly_report_subs_frequency_check
  CHECK (frequency IN ('one_time','daily','weekly','monthly'));

CREATE OR REPLACE FUNCTION public.compute_next_scheduled_send(
  p_frequency text,
  p_day_of_week int,
  p_day_of_month int,
  p_hour int,
  p_tz text,
  p_run_at timestamptz,
  p_after timestamptz
) RETURNS timestamptz
LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $$
DECLARE
  local_now timestamp;
  base_date date;
  local_target timestamp;
  days_ahead int;
  target_day int;
  m_first date;
  last_day int;
BEGIN
  IF p_frequency = 'one_time' THEN
    IF p_run_at IS NULL OR p_run_at <= p_after THEN
      RETURN NULL;
    END IF;
    RETURN p_run_at;
  END IF;

  local_now := (p_after AT TIME ZONE p_tz);
  base_date := local_now::date;

  IF p_frequency = 'daily' THEN
    local_target := base_date + make_time(COALESCE(p_hour,0), 0, 0);
    IF local_target <= local_now THEN
      local_target := local_target + interval '1 day';
    END IF;
    RETURN local_target AT TIME ZONE p_tz;
  END IF;

  IF p_frequency = 'weekly' THEN
    days_ahead := (COALESCE(p_day_of_week,1) - EXTRACT(DOW FROM base_date)::int + 7) % 7;
    local_target := (base_date + days_ahead) + make_time(COALESCE(p_hour,0), 0, 0);
    IF local_target <= local_now THEN
      local_target := local_target + interval '7 days';
    END IF;
    RETURN local_target AT TIME ZONE p_tz;
  END IF;

  IF p_frequency = 'monthly' THEN
    target_day := COALESCE(p_day_of_month, 1);
    m_first := date_trunc('month', base_date)::date;
    last_day := EXTRACT(DAY FROM (m_first + interval '1 month - 1 day'))::int;
    local_target := (m_first + (LEAST(target_day, last_day) - 1)) + make_time(COALESCE(p_hour,0), 0, 0);
    IF local_target <= local_now THEN
      m_first := (m_first + interval '1 month')::date;
      last_day := EXTRACT(DAY FROM (m_first + interval '1 month - 1 day'))::int;
      local_target := (m_first + (LEAST(target_day, last_day) - 1)) + make_time(COALESCE(p_hour,0), 0, 0);
    END IF;
    RETURN local_target AT TIME ZONE p_tz;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.weekly_report_subs_set_next()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
