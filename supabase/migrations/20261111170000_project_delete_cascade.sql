-- Projects could not be deleted when other records still pointed at them
-- (documents, invoices, pay apps, proposals, bid packages, calendar events...).
-- Make every foreign key to projects follow the project when it is deleted:
--   * records that only make sense with the project are deleted with it (CASCADE)
--   * records worth keeping on their own are detached (SET NULL)
DO $$
DECLARE
  r record;
  keep_detached text[] := ARRAY[
    'documents.project_id',
    'calendar_events.project_id',
    'equipment.project_assignment_id',
    'profiles.project_id',
    'estimates.project_id',
    'estimates.sov_project_id',
    'blueprint_analyses.project_id',
    'qb_import_lines.matched_project_id',
    'proposals.project_id'
  ];
  action text;
BEGIN
  FOR r IN
    SELECT c.conname,
           c.conrelid::regclass AS tbl,
           cl.relname AS tbl_name,
           a.attname AS col
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.projects'::regclass
      AND n.nspname = 'public'
      AND array_length(c.conkey, 1) = 1
      AND c.confdeltype IN ('a', 'r')  -- NO ACTION / RESTRICT only; leave CASCADE / SET NULL alone
  LOOP
    action := CASE WHEN (r.tbl_name || '.' || r.col) = ANY (keep_detached) THEN 'SET NULL' ELSE 'CASCADE' END;

    -- SET NULL needs a nullable column; fall back to CASCADE if it is NOT NULL.
    IF action = 'SET NULL' AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl_name AND column_name = r.col AND is_nullable = 'NO'
    ) THEN
      action := 'CASCADE';
    END IF;

    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.projects(id) ON DELETE %s',
      r.tbl, r.conname, r.col, action
    );
    RAISE NOTICE 'projects FK %.% -> ON DELETE %', r.tbl_name, r.col, action;
  END LOOP;
END $$;

-- Billing line items hang off project_billing; make sure they go with their billing record.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.billing_line_items'::regclass
      AND c.confrelid = 'public.project_billing'::regclass
      AND c.confdeltype IN ('a', 'r')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.project_billing(id) ON DELETE CASCADE', r.tbl, r.conname, r.col);
  END LOOP;
EXCEPTION WHEN undefined_table THEN
  NULL; -- billing_line_items not present in this database
END $$;
