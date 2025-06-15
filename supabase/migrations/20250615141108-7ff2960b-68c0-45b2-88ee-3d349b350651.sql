
-- Add new columns for enhanced equipment tracking
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS project_assignment_id UUID REFERENCES projects(id);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS depreciation_rate NUMERIC DEFAULT 10.0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS total_hours_used NUMERIC DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS specifications JSONB;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS last_inspection_date DATE;

-- Create equipment reservations table
CREATE TABLE IF NOT EXISTS equipment_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Reserved',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create equipment usage logs table
CREATE TABLE IF NOT EXISTS equipment_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  hours_used NUMERIC,
  operator_name TEXT,
  fuel_consumed NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment alerts table
CREATE TABLE IF NOT EXISTS equipment_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'maintenance_due', 'insurance_expiry', 'inspection_due'
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  due_date DATE,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_project_assignment ON equipment(project_assignment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_reservations_dates ON equipment_reservations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_equipment_id ON equipment_usage_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_alerts_equipment_id ON equipment_alerts(equipment_id);

-- Add triggers for automatic updates
CREATE OR REPLACE FUNCTION update_equipment_total_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE equipment 
    SET total_hours_used = (
      SELECT COALESCE(SUM(hours_used), 0) 
      FROM equipment_usage_logs 
      WHERE equipment_id = NEW.equipment_id
    )
    WHERE id = NEW.equipment_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_equipment_hours
  AFTER INSERT OR UPDATE OF hours_used ON equipment_usage_logs
  FOR EACH ROW EXECUTE FUNCTION update_equipment_total_hours();

-- Function to generate equipment alerts
CREATE OR REPLACE FUNCTION generate_equipment_alerts()
RETURNS void AS $$
BEGIN
  -- Clear existing unacknowledged alerts
  DELETE FROM equipment_alerts WHERE is_acknowledged = FALSE;
  
  -- Generate maintenance due alerts
  INSERT INTO equipment_alerts (equipment_id, alert_type, message, severity, due_date)
  SELECT 
    e.id,
    'maintenance_due',
    'Maintenance due for ' || e.name,
    CASE 
      WHEN ml.next_due < CURRENT_DATE THEN 'high'
      WHEN ml.next_due <= CURRENT_DATE + INTERVAL '7 days' THEN 'medium'
      ELSE 'low'
    END,
    ml.next_due
  FROM equipment e
  JOIN maintenance_logs ml ON e.id = ml.equipment_id
  WHERE ml.next_due IS NOT NULL 
    AND ml.next_due <= CURRENT_DATE + INTERVAL '30 days';
    
  -- Generate insurance expiry alerts
  INSERT INTO equipment_alerts (equipment_id, alert_type, message, severity, due_date)
  SELECT 
    id,
    'insurance_expiry',
    'Insurance expiring for ' || name,
    CASE 
      WHEN insurance_expiry < CURRENT_DATE THEN 'high'
      WHEN insurance_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'medium'
      ELSE 'low'
    END,
    insurance_expiry
  FROM equipment 
  WHERE insurance_expiry IS NOT NULL 
    AND insurance_expiry <= CURRENT_DATE + INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE equipment_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_alerts ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (assuming users should see all equipment data)
CREATE POLICY "Allow all operations on equipment_reservations" ON equipment_reservations FOR ALL USING (true);
CREATE POLICY "Allow all operations on equipment_usage_logs" ON equipment_usage_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on equipment_alerts" ON equipment_alerts FOR ALL USING (true);
