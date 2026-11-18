CREATE OR REPLACE FUNCTION public.has_any_company_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
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
SECURITY INVOKER
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
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    _profile_id = auth.uid() OR public.is_app_admin(auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_chat_room(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_app_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_room_id = _room_id AND cp.user_id = auth.uid()
    )
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.has_any_company_access() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_project_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_chat_room(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_company_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_chat_room(uuid) TO authenticated;

DROP POLICY IF EXISTS "Chat participant access" ON public.chat_rooms;
CREATE POLICY "Chat participant access"
ON public.chat_rooms
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR public.can_access_chat_room(chat_rooms.id));
