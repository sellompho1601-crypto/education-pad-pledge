-- Add attachment columns to messages table
ALTER TABLE public.messages 
ADD COLUMN attachment_url text,
ADD COLUMN attachment_type text;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to message-attachments bucket
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to read attachments
CREATE POLICY "Authenticated users can read attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);