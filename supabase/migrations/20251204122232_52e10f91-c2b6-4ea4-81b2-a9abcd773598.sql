-- Add archived column to conversations table
ALTER TABLE public.conversations ADD COLUMN archived_by uuid[] DEFAULT '{}';

-- Add policy for updating conversations (for archiving)
CREATE POLICY "Users can update their conversations for archiving"
ON public.conversations
FOR UPDATE
USING (is_institution_in_conversation(id) OR is_investor_in_conversation(id))
WITH CHECK (is_institution_in_conversation(id) OR is_investor_in_conversation(id));