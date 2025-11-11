-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Verified users can create conversations" ON public.conversations;

-- Create a simpler, more reliable policy for creating conversations
CREATE POLICY "Verified users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  -- Check if the user creating the conversation is either the investor or institution
  -- and that both parties are verified
  EXISTS (
    SELECT 1 FROM public.investors inv
    JOIN public.profiles p_inv ON inv.user_id = p_inv.id
    WHERE inv.id = conversations.investor_id
      AND p_inv.verification_status = 'verified'
      AND (inv.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.institutions inst
        JOIN public.profiles p_inst ON inst.user_id = p_inst.id
        WHERE inst.id = conversations.institution_id
          AND p_inst.verification_status = 'verified'
          AND inst.user_id = auth.uid()
      ))
  )
);