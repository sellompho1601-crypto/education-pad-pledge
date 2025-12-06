-- Drop the existing problematic INSERT policy
DROP POLICY IF EXISTS "Verified users can create conversations" ON public.conversations;

-- Create a cleaner INSERT policy for conversations
-- Investors can create conversations if they are verified
CREATE POLICY "Verified investors can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.investors inv
    JOIN public.profiles p ON inv.user_id = p.id
    WHERE inv.id = investor_id 
      AND inv.user_id = auth.uid()
      AND p.verification_status = 'verified'
  )
);

-- Institutions can also create conversations if they are verified
CREATE POLICY "Verified institutions can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.institutions inst
    JOIN public.profiles p ON inst.user_id = p.id
    WHERE inst.id = institution_id 
      AND inst.user_id = auth.uid()
      AND p.verification_status = 'verified'
  )
);