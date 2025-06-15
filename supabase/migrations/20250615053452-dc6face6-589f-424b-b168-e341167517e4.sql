
-- Create a table to track role change requests
CREATE TABLE public.role_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_role text NOT NULL,
  existing_role text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id),
  admin_notes text
);

-- Enable RLS on role change requests
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view their own role requests" 
  ON public.role_change_requests 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can create their own requests
CREATE POLICY "Users can create role requests" 
  ON public.role_change_requests 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all requests
CREATE POLICY "Admins can view all role requests" 
  ON public.role_change_requests 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

-- Policy: Admins can update all requests
CREATE POLICY "Admins can update role requests" 
  ON public.role_change_requests 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

-- Create a function to handle approved role changes
CREATE OR REPLACE FUNCTION public.approve_role_change(request_id uuid, admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_record role_change_requests%ROWTYPE;
BEGIN
  -- Get the request details
  SELECT * INTO req_record
  FROM public.role_change_requests
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role change request not found or already processed';
  END IF;
  
  -- Update the user's role in profiles
  UPDATE public.profiles
  SET role = req_record.requested_role,
      updated_at = now()
  WHERE id = req_record.user_id;
  
  -- Mark the request as approved
  UPDATE public.role_change_requests
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      admin_notes = approve_role_change.admin_notes
  WHERE id = request_id;
END;
$$;
