
-- Create equipment_alert_settings table
CREATE TABLE public.equipment_alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  alert_days_before INTEGER NOT NULL DEFAULT 7,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('maintenance', 'inspection', 'service')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for equipment_alert_settings
ALTER TABLE public.equipment_alert_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment_alert_settings
CREATE POLICY "Users can view equipment alert settings" 
  ON public.equipment_alert_settings 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create equipment alert settings" 
  ON public.equipment_alert_settings 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update equipment alert settings" 
  ON public.equipment_alert_settings 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete equipment alert settings" 
  ON public.equipment_alert_settings 
  FOR DELETE 
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_equipment_alert_settings_updated_at
  BEFORE UPDATE ON public.equipment_alert_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
