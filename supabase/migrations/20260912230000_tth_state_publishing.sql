-- =====================================================================
-- TraderTaxHQ — publish researched state positions to the public site
--
-- Research done once for a client becomes a public page. The firm writes
-- the position privately, then chooses to publish a client-safe summary of
-- it; nothing is public until someone deliberately makes it so.
-- =====================================================================

ALTER TABLE public.tth_state_positions
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  -- Deliberately separate from `position`: the internal note may reference a
  -- specific client's facts, and must never be published by accident.
  ADD COLUMN IF NOT EXISTS public_summary text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tth_state_positions_published
  ON public.tth_state_positions(state_code)
  WHERE is_published = true;

-- Guard the obvious mistake: a row cannot be published without a summary
-- written specifically for publication.
ALTER TABLE public.tth_state_positions
  ADD CONSTRAINT tth_state_positions_publish_requires_summary
  CHECK (is_published = false OR (public_summary IS NOT NULL AND length(btrim(public_summary)) > 0));
