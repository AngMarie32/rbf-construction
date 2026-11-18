DROP POLICY IF EXISTS "Company project access" ON public.proposals;
CREATE POLICY "Company project access"
ON public.proposals
FOR ALL
TO authenticated
USING (public.has_project_access(proposals.project_id))
WITH CHECK (public.has_project_access(proposals.project_id));

DROP POLICY IF EXISTS "Company project access" ON public.sov_items;
CREATE POLICY "Company project access"
ON public.sov_items
FOR ALL
TO authenticated
USING (public.has_project_access(sov_items.project_id))
WITH CHECK (public.has_project_access(sov_items.project_id));

DROP POLICY IF EXISTS "Company project access" ON public.change_orders;
CREATE POLICY "Company project access"
ON public.change_orders
FOR ALL
TO authenticated
USING (public.has_project_access(change_orders.project_id))
WITH CHECK (public.has_project_access(change_orders.project_id));

DROP POLICY IF EXISTS "Company project access" ON public.payment_applications;
CREATE POLICY "Company project access"
ON public.payment_applications
FOR ALL
TO authenticated
USING (public.has_project_access(payment_applications.project_id))
WITH CHECK (public.has_project_access(payment_applications.project_id));

DROP POLICY IF EXISTS "Company project access" ON public.bid_items;
CREATE POLICY "Company project access"
ON public.bid_items
FOR ALL
TO authenticated
USING (public.has_project_access(bid_items.project_id))
WITH CHECK (public.has_project_access(bid_items.project_id));

DROP POLICY IF EXISTS "Company project access" ON public.projects;
CREATE POLICY "Company project access"
ON public.projects
FOR ALL
TO authenticated
USING (public.has_company_access(projects.company_id) OR (projects.company_id IS NULL AND public.has_any_company_access()))
WITH CHECK (public.has_company_access(projects.company_id) OR (projects.company_id IS NULL AND public.has_any_company_access()));