-- Drop the restrictive INSERT policies
DROP POLICY IF EXISTS "Verified investors can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Verified institutions can create conversations" ON public.conversations;

-- Create a single permissive INSERT policy that allows either party to create
CREATE POLICY "Verified users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Either the investor is creating (and is verified)
  EXISTS (
    SELECT 1 
    FROM public.investors inv
    JOIN public.profiles p ON inv.user_id = p.id
    WHERE inv.id = conversations.investor_id 
      AND inv.user_id = auth.uid() 
      AND p.verification_status = 'verified'
  )
  OR
  -- Or the institution is creating (and is verified)
  EXISTS (
    SELECT 1 
    FROM public.institutions inst
    JOIN public.profiles p ON inst.user_id = p.id
    WHERE inst.id = conversations.institution_id 
      AND inst.user_id = auth.uid() 
      AND p.verification_status = 'verified'
  )
);