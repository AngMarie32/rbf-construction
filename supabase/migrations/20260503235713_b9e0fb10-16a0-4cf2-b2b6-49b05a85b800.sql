-- Reusable recipient groups for e-sign
CREATE TABLE IF NOT EXISTS public.esign_recipient_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  name text NOT NULL,
  description text,
  members jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.esign_recipient_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esign_groups_select_authenticated"
  ON public.esign_recipient_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "esign_groups_insert_own"
  ON public.esign_recipient_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "esign_groups_update_own"
  ON public.esign_recipient_groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "esign_groups_delete_own"
  ON public.esign_recipient_groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE TRIGGER trg_esign_groups_updated_at
  BEFORE UPDATE ON public.esign_recipient_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_esign_groups_created_by ON public.esign_recipient_groups(created_by);