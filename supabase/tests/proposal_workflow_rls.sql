-- Regression test for the proposal -> Schedule of Values workflow.
-- Runs as a real company member and rolls back every test row.
BEGIN;

DO $precondition$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_companies) THEN
    RAISE EXCEPTION 'Proposal workflow test requires at least one company member';
  END IF;
END
$precondition$;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM public.user_companies ORDER BY created_at LIMIT 1),
  true
);
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', current_setting('request.jwt.claim.sub', true),
    'role', 'authenticated'
  )::text,
  true
);
SET LOCAL ROLE authenticated;

DO $test$
DECLARE
  test_user uuid := auth.uid();
  test_project uuid;
  test_proposal uuid;
  test_sov uuid;
BEGIN
  IF test_user IS NULL THEN
    RAISE EXCEPTION 'Could not impersonate a company member';
  END IF;

  -- Unlinked proposals are supported by the proposal form.
  INSERT INTO public.proposals (
    project_name, client, amount, status, proposal_items
  ) VALUES (
    'RLS regression proposal', 'RLS regression client', 125.50, 'Draft', '[]'::jsonb
  )
  RETURNING id INTO test_proposal;

  UPDATE public.proposals
  SET notes = 'Create and update passed'
  WHERE id = test_proposal;

  DELETE FROM public.proposals WHERE id = test_proposal;

  SELECT p.id INTO test_project
  FROM public.projects p
  JOIN public.user_companies uc
    ON uc.company_id = p.company_id AND uc.user_id = test_user
  ORDER BY p.created_at
  LIMIT 1;

  IF test_project IS NULL THEN
    SELECT p.id INTO test_project
    FROM public.projects p
    WHERE p.company_id IS NULL
    ORDER BY p.created_at
    LIMIT 1;
  END IF;

  IF test_project IS NULL THEN
    RAISE EXCEPTION 'Proposal workflow test requires a project accessible to the company member';
  END IF;

  -- Linked proposals must save and create their corresponding SOV lines.
  INSERT INTO public.proposals (
    project_id, project_name, client, amount, status, proposal_items
  ) VALUES (
    test_project, 'RLS linked proposal', 'RLS regression client', 125.50, 'Draft',
    '[{"id":"1","description":"Test line","quantity":1,"unit":"each","unitPrice":125.5,"total":125.5}]'::jsonb
  )
  RETURNING id INTO test_proposal;

  INSERT INTO public.sov_items (
    project_id, item_number, category, subcategory, description,
    scheduled_value, source_proposal_id
  ) VALUES (
    test_project, 'RLS-TEST', 'Proposal', 'RLS linked proposal', 'Test line',
    125.50, test_proposal
  )
  RETURNING id INTO test_sov;

  UPDATE public.sov_items
  SET description = 'Test line updated'
  WHERE id = test_sov;

  DELETE FROM public.sov_items WHERE id = test_sov;
  DELETE FROM public.proposals WHERE id = test_proposal;
END
$test$;

ROLLBACK;
