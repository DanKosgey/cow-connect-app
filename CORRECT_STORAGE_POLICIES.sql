-- Correct Storage Policies for collection-photos bucket
-- Run these commands in your Supabase SQL Editor

-- First, check if RLS is enabled on storage.objects
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'objects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');

-- If RLS is not enabled, enable it:
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for collection-photos bucket
CREATE POLICY "Public Access to Collection Photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'collection-photos');

CREATE POLICY "Authenticated Collectors Can Upload Photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'collection-photos');

CREATE POLICY "Collectors Can Update Their Photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'collection-photos' AND auth.uid() = owner_id);

CREATE POLICY "Collectors Can Delete Their Photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'collection-photos' AND auth.uid() = owner_id);

-- Also make the bucket public so photos can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'collection-photos';

-- Verification queries
-- Check that policies were created
SELECT name, bucket_id, operation, definition 
FROM storage.policies 
WHERE bucket_id = 'collection-photos';

-- Check that the bucket is now public
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'collection-photos';