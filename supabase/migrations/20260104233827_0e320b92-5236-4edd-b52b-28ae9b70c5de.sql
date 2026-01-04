-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Verified users can create conversations" ON public.conversations;

-- Recreate as PERMISSIVE policy (default behavior when RESTRICTIVE is not specified)
CREATE POLICY "Verified users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1
    FROM investors inv
    JOIN profiles p ON inv.user_id = p.id
    WHERE inv.id = conversations.investor_id
      AND inv.user_id = auth.uid()
      AND p.verification_status = 'verified'
  ))
  OR
  (EXISTS (
    SELECT 1
    FROM institutions inst
    JOIN profiles p ON inst.user_id = p.id
    WHERE inst.id = conversations.institution_id
      AND inst.user_id = auth.uid()
      AND p.verification_status = 'verified'
  ))
);