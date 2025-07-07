
-- Add division column to bid_items table
ALTER TABLE public.bid_items ADD COLUMN division text;

-- Set default values for existing records based on category
UPDATE public.bid_items 
SET division = CASE 
  WHEN LOWER(category) LIKE '%site%' OR LOWER(category) LIKE '%excavation%' OR LOWER(category) LIKE '%grading%' OR LOWER(category) LIKE '%landscaping%' OR LOWER(category) LIKE '%erosion%' OR LOWER(category) LIKE '%clearing%' OR LOWER(category) LIKE '%demolition%' THEN 'Site Work'
  WHEN LOWER(category) LIKE '%concrete%' OR LOWER(category) LIKE '%masonry%' OR LOWER(category) LIKE '%carpentry%' OR LOWER(category) LIKE '%framing%' OR LOWER(category) LIKE '%roofing%' OR LOWER(category) LIKE '%insulation%' OR LOWER(category) LIKE '%doors%' OR LOWER(category) LIKE '%windows%' OR LOWER(category) LIKE '%finishes%' OR LOWER(category) LIKE '%painting%' OR LOWER(category) LIKE '%flooring%' OR LOWER(category) LIKE '%mechanical%' OR LOWER(category) LIKE '%plumbing%' OR LOWER(category) LIKE '%electrical%' OR LOWER(category) LIKE '%fire%' OR LOWER(category) LIKE '%metals%' OR LOWER(category) LIKE '%thermal%' THEN 'Building'
  WHEN LOWER(category) LIKE '%general%' OR LOWER(category) LIKE '%supervision%' OR LOWER(category) LIKE '%management%' OR LOWER(category) LIKE '%labor%' OR LOWER(category) LIKE '%design%' OR LOWER(category) LIKE '%permits%' OR LOWER(category) LIKE '%bonds%' OR LOWER(category) LIKE '%insurance%' THEN 'General Conditions'
  ELSE 'Other'
END
WHERE division IS NULL;
