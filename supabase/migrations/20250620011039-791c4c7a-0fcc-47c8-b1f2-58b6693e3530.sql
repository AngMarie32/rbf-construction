
-- Add recurring fields to calendar_events table
ALTER TABLE public.calendar_events 
ADD COLUMN recurring_type TEXT DEFAULT 'none' CHECK (recurring_type IN ('none', 'daily', 'weekly', 'monthly')),
ADD COLUMN recurring_days INTEGER[] DEFAULT NULL;

-- Update existing records to have the default value
UPDATE public.calendar_events 
SET recurring_type = 'none' 
WHERE recurring_type IS NULL;
