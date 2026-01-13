-- Fix: Make conversation INSERT policy PERMISSIVE (RESTRICTIVE needs a PERMISSIVE to pass first)
DROP POLICY IF EXISTS "Verified users can create conversations" ON public.conversations;

CREATE POLICY "Verified users can create conversations"
ON public.conversations
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.is_verified_investor(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.investors inv
      WHERE inv.id = investor_id
        AND inv.user_id = auth.uid()
    )
  )
  OR
  (
    public.is_verified_institution(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.institutions inst
      WHERE inst.id = institution_id
        AND inst.user_id = auth.uid()
    )
  )
);