CREATE OR REPLACE FUNCTION public.approve_role_change(request_id uuid, admin_notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  req_record public.role_change_requests%ROWTYPE;
BEGIN
  SELECT * INTO req_record
  FROM public.role_change_requests
  WHERE id = request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role change request not found or already processed';
  END IF;
  UPDATE public.profiles
  SET role = req_record.requested_role, updated_at = now()
  WHERE id = req_record.user_id;
  UPDATE public.role_change_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), admin_notes = approve_role_change.admin_notes
  WHERE id = request_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'Field');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_any_company_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_app_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.user_id = auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_project_access(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_app_admin(auth.uid())
    OR (_project_id IS NULL AND public.has_any_company_access())
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = _project_id
        AND (
          public.has_company_access(p.company_id)
          OR (p.company_id IS NULL AND public.has_any_company_access())
        )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    _profile_id = auth.uid()
    OR public.is_app_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_companies mine
      JOIN public.user_companies theirs ON theirs.company_id = mine.company_id
      WHERE mine.user_id = auth.uid() AND theirs.user_id = _profile_id
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_chat_room(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_app_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.chat_rooms cr WHERE cr.id = _room_id AND cr.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.chat_room_id = _room_id AND cp.user_id = auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION pg_temp.rbf_replace_policy(
  p_table regclass,
  p_old_names text[],
  p_new_name text,
  p_cmd text,
  p_using text,
  p_check text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  old_name text;
BEGIN
  FOREACH old_name IN ARRAY p_old_names LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', old_name, p_table);
  END LOOP;
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR %s TO authenticated%s%s',
    p_new_name,
    p_table,
    p_cmd,
    CASE WHEN p_using IS NULL OR p_cmd = 'INSERT' THEN '' ELSE format(' USING (%s)', p_using) END,
    CASE WHEN p_check IS NULL THEN '' ELSE format(' WITH CHECK (%s)', p_check) END
  );
END;
$function$;

SELECT pg_temp.rbf_replace_policy('public.projects', ARRAY['Authenticated users can view projects'], 'Company project access', 'SELECT', 'public.has_company_access(projects.company_id) OR (projects.company_id IS NULL AND public.has_any_company_access())');
SELECT pg_temp.rbf_replace_policy('public.proposals', ARRAY['Authenticated users can view proposals'], 'Company project access', 'SELECT', 'public.has_project_access(proposals.project_id)');
SELECT pg_temp.rbf_replace_policy('public.maintenance_logs', ARRAY['Authenticated users can view maintenance_logs'], 'Company member access', 'SELECT', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.burn_records', ARRAY['Authenticated users can view burn_records'], 'Company project access', 'SELECT', 'public.has_project_access(burn_records.project_id)');
SELECT pg_temp.rbf_replace_policy('public.payment_applications', ARRAY['Authenticated users can view payment_applications'], 'Company project access', 'SELECT', 'public.has_project_access(payment_applications.project_id)');
SELECT pg_temp.rbf_replace_policy('public.tasks', ARRAY['Authenticated users can view tasks'], 'Company project access', 'SELECT', 'public.has_project_access(tasks.project_id)');
SELECT pg_temp.rbf_replace_policy('public.profiles', ARRAY['Users can view all profiles'], 'Shared company profile access', 'SELECT', 'public.can_view_profile(profiles.id)');
SELECT pg_temp.rbf_replace_policy('public.chat_rooms', ARRAY['Users can view chat rooms'], 'Chat participant access', 'SELECT', 'public.can_access_chat_room(chat_rooms.id)');
SELECT pg_temp.rbf_replace_policy('public.change_orders', ARRAY['Authenticated users can view change_orders'], 'Company project access', 'SELECT', 'public.has_project_access(change_orders.project_id)');
SELECT pg_temp.rbf_replace_policy('public.sov_items', ARRAY['Authenticated users can view sov_items'], 'Company project access', 'SELECT', 'public.has_project_access(sov_items.project_id)');
SELECT pg_temp.rbf_replace_policy('public.bid_items', ARRAY['Authenticated users can view bid_items'], 'Company project access', 'SELECT', 'public.has_project_access(bid_items.project_id)');
SELECT pg_temp.rbf_replace_policy('public.calendar_events', ARRAY['Authenticated users can manage calendar events'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.equipment', ARRAY['Authenticated users can view equipment'], 'Company member access', 'SELECT', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.messages', ARRAY['Users can view messages'], 'Chat participant access', 'SELECT', 'public.can_access_chat_room(messages.chat_room_id)');

SELECT pg_temp.rbf_replace_policy('public.equipment_alert_settings', ARRAY['Users can delete equipment alert settings','Users can update equipment alert settings','Users can create equipment alert settings','Users can view equipment alert settings'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.project_cost_budgets', ARRAY['Signed-in users manage cost budgets'], 'Company project access', 'ALL', 'public.has_project_access(project_cost_budgets.project_id)', 'public.has_project_access(project_cost_budgets.project_id)');
SELECT pg_temp.rbf_replace_policy('public.invoices', ARRAY['Enable delete for authenticated users','Enable update for authenticated users','Enable insert for authenticated users','Enable read access for all users'], 'Company project access', 'ALL', 'public.has_project_access(invoices.project_id)', 'public.has_project_access(invoices.project_id)');
SELECT pg_temp.rbf_replace_policy('public.equipment_usage_logs', ARRAY['Allow all operations on equipment_usage_logs'], 'Company project access', 'ALL', 'public.has_project_access(equipment_usage_logs.project_id)', 'public.has_project_access(equipment_usage_logs.project_id)');
SELECT pg_temp.rbf_replace_policy('public.bid_template_items', ARRAY['Users can delete template items','Users can update template items','Users can create template items','Users can view all template items'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.subcontractor_group_members', ARRAY['Allow all operations on subcontractor_group_members'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.schedule_templates', ARRAY['Users can delete schedule templates','Users can update schedule templates','Users can create schedule templates','Users can view schedule templates'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.project_billing', ARRAY['Enable delete for all users','Enable update for all users','Enable insert for all users','Enable read access for all users'], 'Company project access', 'ALL', 'public.has_project_access(project_billing.project_id)', 'public.has_project_access(project_billing.project_id)');
SELECT pg_temp.rbf_replace_policy('public.billing_line_items', ARRAY['Enable delete for all users','Enable update for all users','Enable insert for all users','Enable read access for all users'], 'Company project access', 'ALL', 'EXISTS (SELECT 1 FROM public.project_billing pb WHERE pb.id = billing_line_items.billing_id AND public.has_project_access(pb.project_id))', 'EXISTS (SELECT 1 FROM public.project_billing pb WHERE pb.id = billing_line_items.billing_id AND public.has_project_access(pb.project_id))');
SELECT pg_temp.rbf_replace_policy('public.budget_forecasts', ARRAY['Users can view budget forecasts'], 'Company project read access', 'SELECT', 'public.has_project_access(budget_forecasts.project_id)');
SELECT pg_temp.rbf_replace_policy('public.budget_forecasts', ARRAY['Users can create budget forecasts'], 'Company project create access', 'INSERT', NULL, 'public.has_project_access(budget_forecasts.project_id)');
SELECT pg_temp.rbf_replace_policy('public.equipment_reservations', ARRAY['Allow all operations on equipment_reservations'], 'Company project access', 'ALL', 'public.has_project_access(equipment_reservations.project_id)', 'public.has_project_access(equipment_reservations.project_id)');
SELECT pg_temp.rbf_replace_policy('public.bid_package_items', ARRAY['Enable delete for authenticated users','Enable update for authenticated users','Enable insert for authenticated users','Enable read access for all users'], 'Company project access', 'ALL', '(bid_package_items.bid_package_id IS NULL AND public.has_any_company_access()) OR EXISTS (SELECT 1 FROM public.bid_packages bp WHERE bp.id = bid_package_items.bid_package_id AND public.has_project_access(bp.project_id))', '(bid_package_items.bid_package_id IS NULL AND public.has_any_company_access()) OR EXISTS (SELECT 1 FROM public.bid_packages bp WHERE bp.id = bid_package_items.bid_package_id AND public.has_project_access(bp.project_id))');
SELECT pg_temp.rbf_replace_policy('public.bid_settings', ARRAY['Users can delete bid settings','Users can update bid settings','Users can create bid settings','Users can view bid settings'], 'Company project access', 'ALL', 'public.has_project_access(bid_settings.project_id)', 'public.has_project_access(bid_settings.project_id)');
SELECT pg_temp.rbf_replace_policy('public.bid_invitation_documents', ARRAY['Allow all operations on bid_invitation_documents'], 'Company project access', 'ALL', 'EXISTS (SELECT 1 FROM public.bid_invitations bi LEFT JOIN public.bid_packages bp ON bp.id = bi.bid_package_id WHERE bi.id = bid_invitation_documents.bid_invitation_id AND ((bi.bid_package_id IS NULL AND public.has_any_company_access()) OR (bp.id IS NOT NULL AND public.has_project_access(bp.project_id))))', 'EXISTS (SELECT 1 FROM public.bid_invitations bi LEFT JOIN public.bid_packages bp ON bp.id = bi.bid_package_id WHERE bi.id = bid_invitation_documents.bid_invitation_id AND ((bi.bid_package_id IS NULL AND public.has_any_company_access()) OR (bp.id IS NOT NULL AND public.has_project_access(bp.project_id))))');
SELECT pg_temp.rbf_replace_policy('public.project_subcontractors', ARRAY['Enable delete for authenticated users','Enable update for authenticated users','Enable insert for authenticated users','Enable read access for all users'], 'Company project access', 'ALL', 'public.has_project_access(project_subcontractors.project_id)', 'public.has_project_access(project_subcontractors.project_id)');
SELECT pg_temp.rbf_replace_policy('public.expenses', ARRAY['Enable delete access for all users','Enable update access for all users','Enable insert access for all users','Enable read access for all users'], 'Company project access', 'ALL', 'public.has_project_access(expenses.project_id)', 'public.has_project_access(expenses.project_id)');
SELECT pg_temp.rbf_replace_policy('public.budget_variances', ARRAY['Users can view budget variances'], 'Company project read access', 'SELECT', 'public.has_project_access(budget_variances.project_id)');
SELECT pg_temp.rbf_replace_policy('public.budget_variances', ARRAY['Users can create budget variances'], 'Company project create access', 'INSERT', NULL, 'public.has_project_access(budget_variances.project_id)');
SELECT pg_temp.rbf_replace_policy('public.budget_variances', ARRAY['Users can update budget variances'], 'Company project update access', 'UPDATE', 'public.has_project_access(budget_variances.project_id)', 'public.has_project_access(budget_variances.project_id)');
SELECT pg_temp.rbf_replace_policy('public.companies', ARRAY['Authenticated can view companies'], 'Company member access', 'SELECT', 'public.has_company_access(companies.id)');
SELECT pg_temp.rbf_replace_policy('public.bid_packages', ARRAY['Enable delete for authenticated users','Enable update for authenticated users','Enable insert for authenticated users','Enable read access for all users'], 'Company project access', 'ALL', 'public.has_project_access(bid_packages.project_id)', 'public.has_project_access(bid_packages.project_id)');
SELECT pg_temp.rbf_replace_policy('public.documents', ARRAY['Enable delete for authenticated users','Enable update for authenticated users','Enable insert for authenticated users','Enable read access for all users'], 'Company project access', 'ALL', 'public.has_project_access(documents.project_id)', 'public.has_project_access(documents.project_id)');
SELECT pg_temp.rbf_replace_policy('public.payment_applications_g702', ARRAY['Users can delete payment applications','Users can update payment applications','Users can create payment applications','Users can view payment applications'], 'Company project access', 'ALL', 'public.has_project_access(payment_applications_g702.project_id)', 'public.has_project_access(payment_applications_g702.project_id)');
SELECT pg_temp.rbf_replace_policy('public.schedule_template_items', ARRAY['Users can delete schedule template items','Users can update schedule template items','Users can create schedule template items','Users can view schedule template items'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.bid_templates', ARRAY['Users can delete bid templates','Users can update bid templates','Users can create bid templates','Users can view all bid templates'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.esign_document_types', ARRAY['Authenticated can delete document types','Authenticated can update document types','Anyone authenticated can view document types','Authenticated can insert document types'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.invoice_items', ARRAY['Enable delete for authenticated users','Enable update for authenticated users','Enable insert for authenticated users','Enable read access for all users'], 'Company project access', 'ALL', 'EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND public.has_project_access(i.project_id))', 'EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND public.has_project_access(i.project_id))');
SELECT pg_temp.rbf_replace_policy('public.payment_app_lien_waivers', ARRAY['Authenticated can delete lien waivers','Authenticated can update lien waivers','Authenticated can view lien waivers','Authenticated can insert lien waivers'], 'Company project access', 'ALL', 'public.has_project_access(payment_app_lien_waivers.project_id)', 'public.has_project_access(payment_app_lien_waivers.project_id)');
SELECT pg_temp.rbf_replace_policy('public.bid_invitations', ARRAY['Allow all operations on bid_invitations'], 'Company project access', 'ALL', '(bid_invitations.bid_package_id IS NULL AND public.has_any_company_access()) OR EXISTS (SELECT 1 FROM public.bid_packages bp WHERE bp.id = bid_invitations.bid_package_id AND public.has_project_access(bp.project_id))', '(bid_invitations.bid_package_id IS NULL AND public.has_any_company_access()) OR EXISTS (SELECT 1 FROM public.bid_packages bp WHERE bp.id = bid_invitations.bid_package_id AND public.has_project_access(bp.project_id))');
SELECT pg_temp.rbf_replace_policy('public.company_groups', ARRAY['Authenticated can view company groups'], 'Company group access', 'SELECT', 'public.is_app_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.companies c WHERE c.group_id = company_groups.id AND public.has_company_access(c.id))');
SELECT pg_temp.rbf_replace_policy('public.company_settings', ARRAY['Authenticated users can view company settings','Enable read access for all users','Public can view company settings'], 'Company member read access', 'SELECT', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.company_settings', ARRAY['Authenticated users can insert company settings'], 'Admin create access', 'INSERT', NULL, 'public.is_app_admin(auth.uid())');
SELECT pg_temp.rbf_replace_policy('public.company_settings', ARRAY['Authenticated users can update company settings','Enable update for authenticated users'], 'Admin update access', 'UPDATE', 'public.is_app_admin(auth.uid())', 'public.is_app_admin(auth.uid())');
SELECT pg_temp.rbf_replace_policy('public.subcontractors', ARRAY['Enable delete for authenticated users','Enable read access for all users','Enable update for authenticated users','Enable insert for authenticated users'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.subcontractor_groups', ARRAY['Allow all operations on subcontractor_groups'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.bid_invitation_recipients', ARRAY['Allow all operations on bid_invitation_recipients'], 'Company project access', 'ALL', 'EXISTS (SELECT 1 FROM public.bid_invitations bi LEFT JOIN public.bid_packages bp ON bp.id = bi.bid_package_id WHERE bi.id = bid_invitation_recipients.bid_invitation_id AND ((bi.bid_package_id IS NULL AND public.has_any_company_access()) OR (bp.id IS NOT NULL AND public.has_project_access(bp.project_id))))', 'EXISTS (SELECT 1 FROM public.bid_invitations bi LEFT JOIN public.bid_packages bp ON bp.id = bi.bid_package_id WHERE bi.id = bid_invitation_recipients.bid_invitation_id AND ((bi.bid_package_id IS NULL AND public.has_any_company_access()) OR (bp.id IS NOT NULL AND public.has_project_access(bp.project_id))))');
SELECT pg_temp.rbf_replace_policy('public.equipment_alerts', ARRAY['Allow all operations on equipment_alerts'], 'Company member access', 'ALL', 'public.has_any_company_access()', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.budget_alerts', ARRAY['Users can view budget alerts'], 'Company project read access', 'SELECT', 'public.has_project_access(budget_alerts.project_id)');
SELECT pg_temp.rbf_replace_policy('public.budget_alerts', ARRAY['Users can create budget alerts'], 'Company project create access', 'INSERT', NULL, 'public.has_project_access(budget_alerts.project_id)');
SELECT pg_temp.rbf_replace_policy('public.budget_alerts', ARRAY['Users can update budget alerts'], 'Company project update access', 'UPDATE', 'public.has_project_access(budget_alerts.project_id)', 'public.has_project_access(budget_alerts.project_id)');
SELECT pg_temp.rbf_replace_policy('public.app_settings', ARRAY['app_settings_read'], 'Company member read access', 'SELECT', 'public.has_any_company_access()');
SELECT pg_temp.rbf_replace_policy('public.app_settings', ARRAY['app_settings_write'], 'Admin create access', 'INSERT', NULL, 'public.is_app_admin(auth.uid())');
SELECT pg_temp.rbf_replace_policy('public.app_settings', ARRAY['app_settings_update'], 'Admin update access', 'UPDATE', 'public.is_app_admin(auth.uid())', 'public.is_app_admin(auth.uid())');

SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['project_documents_read'], 'project_documents_read', 'SELECT', 'bucket_id = ''project-documents'' AND (owner_id = (SELECT auth.uid()::text) OR public.is_app_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.documents d WHERE d.file_path = storage.objects.name AND public.has_project_access(d.project_id)))');
SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['project_documents_write'], 'project_documents_write', 'INSERT', NULL, 'bucket_id = ''project-documents'' AND owner_id = (SELECT auth.uid()::text)');
SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['project_documents_update'], 'project_documents_update', 'UPDATE', 'bucket_id = ''project-documents'' AND (owner_id = (SELECT auth.uid()::text) OR public.is_app_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.documents d WHERE d.file_path = storage.objects.name AND public.has_project_access(d.project_id)))', 'bucket_id = ''project-documents'' AND (owner_id = (SELECT auth.uid()::text) OR public.is_app_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.documents d WHERE d.file_path = storage.objects.name AND public.has_project_access(d.project_id)))');
SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['project_documents_delete'], 'project_documents_delete', 'DELETE', 'bucket_id = ''project-documents'' AND (owner_id = (SELECT auth.uid()::text) OR public.is_app_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.documents d WHERE d.file_path = storage.objects.name AND public.has_project_access(d.project_id)))');
SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['Authenticated users can upload company assets'], 'Authenticated users can upload company assets', 'INSERT', NULL, 'bucket_id = ''company-assets'' AND owner_id = (SELECT auth.uid()::text)');
SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['Authenticated users can update company assets'], 'Authenticated users can update company assets', 'UPDATE', 'bucket_id = ''company-assets'' AND (owner_id = (SELECT auth.uid()::text) OR public.is_app_admin(auth.uid()))', 'bucket_id = ''company-assets'' AND (owner_id = (SELECT auth.uid()::text) OR public.is_app_admin(auth.uid()))');
SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['Authenticated users can delete company assets'], 'Authenticated users can delete company assets', 'DELETE', 'bucket_id = ''company-assets'' AND (owner_id = (SELECT auth.uid()::text) OR public.is_app_admin(auth.uid()))');
SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['Anyone can upload equipment images'], 'Anyone can upload equipment images', 'INSERT', NULL, 'bucket_id = ''equipment-images'' AND owner_id = (SELECT auth.uid()::text)');
SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['Anyone can update equipment images'], 'Anyone can update equipment images', 'UPDATE', 'bucket_id = ''equipment-images'' AND (owner_id = (SELECT auth.uid()::text) OR public.is_app_admin(auth.uid()))', 'bucket_id = ''equipment-images'' AND (owner_id = (SELECT auth.uid()::text) OR public.is_app_admin(auth.uid()))');
SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['Anyone can delete equipment images'], 'Anyone can delete equipment images', 'DELETE', 'bucket_id = ''equipment-images'' AND (owner_id = (SELECT auth.uid()::text) OR public.is_app_admin(auth.uid()))');
SELECT pg_temp.rbf_replace_policy('storage.objects', ARRAY['Authenticated_user_can_upload_to_plan_documents'], 'Authenticated_user_can_upload_to_plan_documents', 'INSERT', NULL, 'bucket_id = ''plan_documents'' AND owner_id = (SELECT auth.uid()::text)');
