-- SQL Query to diagnose collection points issues
-- Run this in your Supabase SQL Editor dashboard

-- 1. First, check if the collection_points table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'collection_points';

-- 2. Check the structure of the collections table to see if collection_point_id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'collections' AND column_name = 'collection_point_id';

-- 3. If the column doesn't exist, add it to the collections table
-- Uncomment the following lines if you need to add the column:
-- ALTER TABLE public.collections 
-- ADD COLUMN IF NOT EXISTS collection_point_id uuid REFERENCES public.collection_points(id) ON DELETE SET NULL;

-- 4. Create the collection_points table if it doesn't exist
-- Uncomment the following lines to create the table:
/*
CREATE TABLE IF NOT EXISTS public.collection_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location geography(Point,4326), -- For GPS coordinates
  address text,
  contact_person text,
  contact_phone text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_points_location 
ON public.collection_points 
USING gist(location);

CREATE INDEX IF NOT EXISTS idx_collection_points_active 
ON public.collection_points (active);

-- Add RLS policies (adjust as needed based on your security requirements)
ALTER TABLE public.collection_points ENABLE ROW LEVEL SECURITY;

-- Example policy - adjust according to your needs
CREATE POLICY "Collection points are viewable by authenticated users"
ON public.collection_points FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Collection points are insertable by admins"
ON public.collection_points FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- Grant permissions
GRANT ALL ON public.collection_points TO authenticated;
*/

-- 5. Refresh the PostgREST schema cache to recognize the new table/column
NOTIFY pgrst, 'reload schema';