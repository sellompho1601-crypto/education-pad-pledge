-- Allow verified investors to view institution profiles (for messaging)
CREATE POLICY "Verified investors can view institution profiles"
ON public.profiles
FOR SELECT
USING (
  user_type = 'institution' AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
      AND p.user_type = 'investor' 
      AND p.verification_status = 'verified'
  )
);

-- Allow verified institutions to view investor profiles (for messaging)
CREATE POLICY "Verified institutions can view investor profiles"
ON public.profiles
FOR SELECT
USING (
  user_type = 'investor' AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
      AND p.user_type = 'institution' 
      AND p.verification_status = 'verified'
  )
);
