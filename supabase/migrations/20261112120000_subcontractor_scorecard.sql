-- Per-category ratings for subcontractors (quality, schedule, price, communication, safety).
-- The overall score stays in the existing `rating` column, which the app uses for ranking.
ALTER TABLE public.subcontractors ADD COLUMN IF NOT EXISTS scorecard jsonb;
