-- Fix conversation creation RLS to use stable security-definer verification helpers

DROP POLICY IF EXISTS "Verified users can create conversations" ON public.conversations;

CREATE POLICY "Verified users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  (
    public.is_verified_investor(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.investors inv
      WHERE inv.id = conversations.investor_id
        AND inv.user_id = auth.uid()
    )
  )
  OR
  (
    public.is_verified_institution(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.institutions inst
      WHERE inst.id = conversations.institution_id
        AND inst.user_id = auth.uid()
    )
  )
);
