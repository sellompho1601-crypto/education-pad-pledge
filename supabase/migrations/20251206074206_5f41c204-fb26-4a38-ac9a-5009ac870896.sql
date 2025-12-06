-- Drop the existing investor INSERT policy
DROP POLICY IF EXISTS "Verified investors can create conversations" ON public.conversations;

-- Create a corrected policy that properly checks ownership
CREATE POLICY "Verified investors can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.investors inv
    JOIN public.profiles p ON inv.user_id = p.id
    WHERE inv.id = conversations.investor_id 
      AND inv.user_id = auth.uid() 
      AND p.verification_status = 'verified'
  )
);