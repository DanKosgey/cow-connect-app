-- Run this in your Supabase Dashboard -> SQL Editor

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('milk-collections', 'milk-collections', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS (Row Level Security) on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. DROP existing policies (optional, to avoid conflicts if you re-run)
DROP POLICY IF EXISTS "Allow Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Reads" ON storage.objects;

-- 4. Create Policy: Allow any authenticated user (e.g. collector) to UPLOAD files
-- This fixes the "new row violates row-level security policy" error
CREATE POLICY "Allow Authenticated Uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'milk-collections');

-- 5. Create Policy: Allow Public/Authenticated Read Access
-- Needed to verify the photo in the app or admin panel
CREATE POLICY "Allow Public Reads"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'milk-collections');
