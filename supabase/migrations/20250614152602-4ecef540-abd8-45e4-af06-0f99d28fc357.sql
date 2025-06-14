
-- Create a new bucket for plan documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('plan_documents', 'plan_documents', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts during re-runs
DROP POLICY IF EXISTS "Public_read_access_for_plan_documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated_user_can_upload_to_plan_documents" ON storage.objects;
DROP POLICY IF EXISTS "User_can_update_own_files_in_plan_documents" ON storage.objects;
DROP POLICY IF EXISTS "User_can_delete_own_files_in_plan_documents" ON storage.objects;

-- Create policies for the plan_documents bucket

-- Allow public read access to all files. The AI function needs this to read the PDF.
CREATE POLICY "Public_read_access_for_plan_documents"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'plan_documents' );

-- Allow any authenticated user to upload files.
CREATE POLICY "Authenticated_user_can_upload_to_plan_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'plan_documents' );

-- Allow users to update their own files.
CREATE POLICY "User_can_update_own_files_in_plan_documents"
ON storage.objects FOR UPDATE
TO authenticated
USING ( auth.uid() = owner AND bucket_id = 'plan_documents' );

-- Allow users to delete their own files.
CREATE POLICY "User_can_delete_own_files_in_plan_documents"
ON storage.objects FOR DELETE
TO authenticated
USING ( auth.uid() = owner AND bucket_id = 'plan_documents' );
