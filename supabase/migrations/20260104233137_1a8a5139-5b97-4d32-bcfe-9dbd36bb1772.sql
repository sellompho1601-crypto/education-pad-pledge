-- Create security definer function to check if user is a verified institution
CREATE OR REPLACE FUNCTION public.is_verified_institution(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND user_type = 'institution'
      AND verification_status = 'verified'
  )
$$;

-- Create security definer function to check if user is a verified investor
CREATE OR REPLACE FUNCTION public.is_verified_investor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND user_type = 'investor'
      AND verification_status = 'verified'
  )
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Verified institutions can view investor profiles" ON public.profiles;
DROP POLICY IF EXISTS "Verified investors can view institution profiles" ON public.profiles;

-- Recreate policies using the security definer functions
CREATE POLICY "Verified institutions can view investor profiles"
ON public.profiles
FOR SELECT
USING (
  user_type = 'investor' 
  AND public.is_verified_institution(auth.uid())
);

CREATE POLICY "Verified investors can view institution profiles"
ON public.profiles
FOR SELECT
USING (
  user_type = 'institution' 
  AND public.is_verified_investor(auth.uid())
);