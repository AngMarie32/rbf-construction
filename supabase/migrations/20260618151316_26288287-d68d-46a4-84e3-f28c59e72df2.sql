CREATE TABLE public.blueprint_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  selected_categories text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  notes text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_analyses TO authenticated;
GRANT ALL ON public.blueprint_analyses TO service_role;

ALTER TABLE public.blueprint_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blueprint analyses"
  ON public.blueprint_analyses
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_blueprint_analyses_updated
  BEFORE UPDATE ON public.blueprint_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();