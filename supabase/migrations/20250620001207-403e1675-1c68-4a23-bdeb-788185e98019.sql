
-- Create calendar_events table for company calendar functionality
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('meeting', 'holiday', 'deadline', 'other')),
  description TEXT,
  attendees TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policy for calendar events (allow all authenticated users to manage events)
CREATE POLICY "Authenticated users can manage calendar events" 
  ON public.calendar_events 
  FOR ALL 
  USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at 
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
