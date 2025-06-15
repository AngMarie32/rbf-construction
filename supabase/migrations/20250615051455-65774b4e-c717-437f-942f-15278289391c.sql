
-- Add email verification columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN email_verification_status TEXT DEFAULT 'none',
ADD COLUMN email_verification_code TEXT;

-- Create an index on email_verification_code for faster lookups
CREATE INDEX idx_profiles_email_verification_code ON public.profiles(email_verification_code);
