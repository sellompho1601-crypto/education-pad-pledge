-- Allow admins to download certificates (needed for createSignedUrl)
CREATE POLICY "Admins can download all certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates' 
  AND has_role(auth.uid(), 'admin')
);