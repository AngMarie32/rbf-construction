-- Add VIN/serial number column to equipment table
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS vin_serial_number text;