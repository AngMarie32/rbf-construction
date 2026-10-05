ALTER TABLE public.bid_items
  ADD COLUMN IF NOT EXISTS markup_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_estimate_id uuid REFERENCES public.estimates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_estimate_line_id uuid;
ALTER TABLE public.bid_template_items
  ADD COLUMN IF NOT EXISTS quantity numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS markup_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;