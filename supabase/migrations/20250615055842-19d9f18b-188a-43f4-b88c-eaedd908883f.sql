
-- Create a storage bucket for company assets (logos, documents, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the company-assets bucket

-- Allow public read access to all files
CREATE POLICY "Public read access for company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');
