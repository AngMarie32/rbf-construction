-- Safety meeting (toolbox talk) log per project.

CREATE TABLE IF NOT EXISTS public.safety_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time text,
  duration_minutes integer,
  meeting_type text NOT NULL DEFAULT 'Toolbox Talk',
  topic text NOT NULL,
  conducted_by text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  attendees text[] NOT NULL DEFAULT '{}',
  hazards_discussed text NOT NULL DEFAULT '',
  corrective_actions text NOT NULL DEFAULT '',
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS safety_meetings_project_idx ON public.safety_meetings(project_id, meeting_date DESC);

ALTER TABLE public.safety_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "safety_meetings_access" ON public.safety_meetings;
CREATE POLICY "safety_meetings_access" ON public.safety_meetings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
DROP TRIGGER IF EXISTS safety_meetings_updated ON public.safety_meetings;
CREATE TRIGGER safety_meetings_updated BEFORE UPDATE ON public.safety_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
