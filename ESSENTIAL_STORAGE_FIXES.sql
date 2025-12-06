-- Essential Storage Fixes for collection-photos bucket
-- Run these commands in your Supabase SQL Editor

-- 1. Make the bucket public so photos can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE name = 'collection-photos';

-- 2. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for collection-photos bucket
-- Policy for public access to view photos
CREATE POLICY "Public Access to Collection Photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'collection-photos');

-- Policy for authenticated users to upload photos
CREATE POLICY "Authenticated Collectors Can Upload Photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'collection-photos');

-- Policy for users to update their own photos
CREATE POLICY "Collectors Can Update Their Photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'collection-photos' AND auth.uid() = owner_id);

-- Policy for users to delete their own photos
CREATE POLICY "Collectors Can Delete Their Photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'collection-photos' AND auth.uid() = owner_id);

-- Verification queries
-- Check that the bucket is now public
SELECT name, public 
FROM storage.buckets 
WHERE name = 'collection-photos';

-- Check that RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'objects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');