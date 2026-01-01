-- Add read_at timestamp column to messages table for read receipts
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on read_at
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);

-- Update existing read messages to have a read_at timestamp
UPDATE public.messages SET read_at = created_at WHERE read = true AND read_at IS NULL;