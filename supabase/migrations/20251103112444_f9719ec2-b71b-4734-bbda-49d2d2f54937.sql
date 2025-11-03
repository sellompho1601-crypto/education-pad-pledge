-- Allow admins to view all certificates
CREATE POLICY "Admins can view all certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates' 
  AND has_role(auth.uid(), 'admin')
);