-- Migration: Create Milk Collections Storage Bucket
-- Purpose: Set up Supabase Storage bucket for milk collection photos

-- Create storage bucket for milk collection photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('milk-collections', 'milk-collections', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can upload to milk-collections
CREATE POLICY "Authenticated users can upload milk collection photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'milk-collections');

-- Policy: Anyone can view milk collection photos (public bucket)
CREATE POLICY "Anyone can view milk collection photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'milk-collections');

-- Policy: Staff can delete milk collection photos
CREATE POLICY "Staff can delete milk collection photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'milk-collections' AND
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.user_id = auth.uid()
  )
);

-- Add comment
COMMENT ON TABLE storage.objects IS 
'Storage for milk collection verification photos. Public read access, authenticated upload.';
