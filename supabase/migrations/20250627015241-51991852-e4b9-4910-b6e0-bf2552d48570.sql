
-- Create bid_settings table for storing bid configuration per project
CREATE TABLE public.bid_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  markup_percentage NUMERIC DEFAULT 15,
  contingency_percentage NUMERIC DEFAULT 5,
  include_tax BOOLEAN DEFAULT true,
  tax_percentage NUMERIC DEFAULT 8.5,
  round_to_nearest NUMERIC DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.bid_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for bid_settings
CREATE POLICY "Users can view bid settings" 
  ON public.bid_settings 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create bid settings" 
  ON public.bid_settings 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update bid settings" 
  ON public.bid_settings 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete bid settings" 
  ON public.bid_settings 
  FOR DELETE 
  USING (true);
