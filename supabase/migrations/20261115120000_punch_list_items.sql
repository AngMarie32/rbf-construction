-- Punch list items were only kept in browser memory and vanished on reload. Store them.

CREATE TABLE IF NOT EXISTS public.punch_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  trade text NOT NULL DEFAULT 'General',
  priority text NOT NULL DEFAULT 'Medium',      -- Low | Medium | High | Critical
  status text NOT NULL DEFAULT 'Open',          -- Open | In Progress | Completed | Verified
  assigned_to text NOT NULL DEFAULT '',
  due_date date,
  completed_at timestamptz,
  verified_at timestamptz,
  notes text,
  photo_paths text[] NOT NULL DEFAULT '{}',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS punch_list_items_project_idx ON public.punch_list_items(project_id);

ALTER TABLE public.punch_list_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "punch_list_items_access" ON public.punch_list_items;
CREATE POLICY "punch_list_items_access" ON public.punch_list_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.company_id IS NULL OR public.has_company_access(p.company_id))));
DROP TRIGGER IF EXISTS punch_list_items_updated ON public.punch_list_items;
CREATE TRIGGER punch_list_items_updated BEFORE UPDATE ON public.punch_list_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Private bucket for punch list photos (viewed through signed links)
INSERT INTO storage.buckets (id, name, public) VALUES ('punch-photos', 'punch-photos', false)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "punch_photos_read" ON storage.objects;
DROP POLICY IF EXISTS "punch_photos_write" ON storage.objects;
DROP POLICY IF EXISTS "punch_photos_delete" ON storage.objects;
CREATE POLICY "punch_photos_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'punch-photos');
CREATE POLICY "punch_photos_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'punch-photos');
CREATE POLICY "punch_photos_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'punch-photos');

NOTIFY pgrst, 'reload schema';
