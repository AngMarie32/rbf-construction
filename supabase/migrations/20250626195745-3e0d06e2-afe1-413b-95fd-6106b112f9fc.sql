
-- Add contingency settings to projects table
ALTER TABLE projects 
ADD COLUMN contingency_type text DEFAULT 'percentage',
ADD COLUMN contingency_value numeric DEFAULT 0;

-- Update bid_template_items to make subcategory more prominent
-- (no changes needed as subcategory already exists)

-- Add contingency settings to company_settings for defaults
ALTER TABLE company_settings
ADD COLUMN default_contingency_type text DEFAULT 'percentage',
ADD COLUMN default_contingency_value numeric DEFAULT 5;
