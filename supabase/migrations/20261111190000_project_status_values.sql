-- The app offers Planning, Active, On Hold, Completed and Closed, but the database
-- only accepted some of them (older forms stored "Open" for Active), so changing a
-- project to On Hold or Completed failed with "Failed to update project".

-- 1) Drop any existing CHECK constraint on projects.status.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.projects'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Normalize old values.
UPDATE public.projects SET status = 'Active' WHERE status IN ('Open', 'open', 'In Progress');
UPDATE public.projects SET status = 'Planning' WHERE status IS NULL OR btrim(status) = '';

-- 3) Allow exactly the statuses the app offers.
ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('Planning', 'Active', 'On Hold', 'Completed', 'Closed'));
