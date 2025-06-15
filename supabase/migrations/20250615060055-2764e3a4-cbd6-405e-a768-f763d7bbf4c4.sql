
-- Enable Row Level Security on company_settings table
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view company settings
CREATE POLICY "Authenticated users can view company settings"
ON public.company_settings FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert company settings
CREATE POLICY "Authenticated users can insert company settings"
ON public.company_settings FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update company settings
CREATE POLICY "Authenticated users can update company settings"
ON public.company_settings FOR UPDATE
TO authenticated
USING (true);

-- Allow public read access for company settings (for displaying company info)
CREATE POLICY "Public can view company settings"
ON public.company_settings FOR SELECT
TO public
USING (true);
