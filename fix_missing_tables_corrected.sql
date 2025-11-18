-- Fix for missing tables and columns (corrected version)
-- Run this in your Supabase SQL Editor

-- 1. Create the variance_type_enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'variance_type_enum') THEN
    CREATE TYPE variance_type_enum AS ENUM ('positive', 'negative', 'none');
  END IF;
END$$;

-- 2. Add the missing collection_point_id column to collections table
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS collection_point_id uuid REFERENCES public.collection_points(id) ON DELETE SET NULL;

-- 3. Create the collection_points table if it doesn't exist
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

-- 4. Create the variance_penalty_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.variance_penalty_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variance_type variance_type_enum NOT NULL,
  min_variance_percentage numeric NOT NULL,
  max_variance_percentage numeric NOT NULL,
  penalty_rate_per_liter numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_points_location 
ON public.collection_points 
USING gist(location);

CREATE INDEX IF NOT EXISTS idx_collection_points_active 
ON public.collection_points (active);

CREATE INDEX IF NOT EXISTS idx_variance_penalty_config_active 
ON public.variance_penalty_config (is_active);

-- 6. Add sample data for variance penalty config
INSERT INTO public.variance_penalty_config 
  (variance_type, min_variance_percentage, max_variance_percentage, penalty_rate_per_liter, is_active)
VALUES 
  ('negative', 0.1, 5, 0.5, true),
  ('negative', 5.1, 10, 1.0, true),
  ('negative', 10.1, 100, 2.0, true)
ON CONFLICT DO NOTHING;

-- 7. Handle RLS policies for collection_points (drop existing first)
ALTER TABLE public.collection_points ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Collection points are viewable by authenticated users" ON public.collection_points;
DROP POLICY IF EXISTS "Collection points are insertable by admins" ON public.collection_points;
DROP POLICY IF EXISTS "Collection points are updatable by admins" ON public.collection_points;

-- Create new policies
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

CREATE POLICY "Collection points are updatable by admins"
ON public.collection_points FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- 8. Handle RLS policies for variance_penalty_config (drop existing first)
ALTER TABLE public.variance_penalty_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Variance penalty configs are viewable by authenticated users" ON public.variance_penalty_config;
DROP POLICY IF EXISTS "Variance penalty configs are manageable by admins" ON public.variance_penalty_config;

-- Create new policies
CREATE POLICY "Variance penalty configs are viewable by authenticated users"
ON public.variance_penalty_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Variance penalty configs are manageable by admins"
ON public.variance_penalty_config FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- 9. Grant permissions
GRANT ALL ON public.collection_points TO authenticated;
GRANT ALL ON public.variance_penalty_config TO authenticated;

-- 10. Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';