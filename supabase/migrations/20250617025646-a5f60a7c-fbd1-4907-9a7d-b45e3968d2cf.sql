
-- Add profit_margin and overhead_percentage columns to company_settings table
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS profit_margin NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead_percentage NUMERIC DEFAULT 0;
