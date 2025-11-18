-- Comprehensive fix for all missing tables and columns
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

-- 5. Ensure collector_performance table exists
CREATE TABLE IF NOT EXISTS public.collector_performance (
  id BIGSERIAL PRIMARY KEY,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_collections INTEGER DEFAULT 0,
  total_liters_collected NUMERIC(10,2) DEFAULT 0,
  total_liters_received NUMERIC(10,2) DEFAULT 0,
  total_variance NUMERIC(10,2) DEFAULT 0,
  average_variance_percentage NUMERIC(5,2) DEFAULT 0,
  positive_variances INTEGER DEFAULT 0,
  negative_variances INTEGER DEFAULT 0,
  total_penalty_amount NUMERIC(10,2) DEFAULT 0,
  performance_score NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, period_start, period_end)
);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_points_location 
ON public.collection_points 
USING gist(location);

CREATE INDEX IF NOT EXISTS idx_collection_points_active 
ON public.collection_points (active);

CREATE INDEX IF NOT EXISTS idx_variance_penalty_config_active 
ON public.variance_penalty_config (is_active);

CREATE INDEX IF NOT EXISTS idx_collector_performance_staff_id 
ON public.collector_performance (staff_id);

CREATE INDEX IF NOT EXISTS idx_collector_performance_period 
ON public.collector_performance (period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_collector_performance_score 
ON public.collector_performance (performance_score);

-- 7. Add sample data for variance penalty config
INSERT INTO public.variance_penalty_config 
  (variance_type, min_variance_percentage, max_variance_percentage, penalty_rate_per_liter, is_active)
VALUES 
  ('negative', 0.1, 5, 0.5, true),
  ('negative', 5.1, 10, 1.0, true),
  ('negative', 10.1, 100, 2.0, true)
ON CONFLICT DO NOTHING;

-- 8. Add RLS policies for collection_points
ALTER TABLE public.collection_points ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view collection points
CREATE POLICY "Collection points are viewable by authenticated users"
ON public.collection_points FOR SELECT
TO authenticated
USING (true);

-- Allow admins to insert collection points
CREATE POLICY "Collection points are insertable by admins"
ON public.collection_points FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- Allow admins to update collection points
CREATE POLICY "Collection points are updatable by admins"
ON public.collection_points FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- 9. Add RLS policies for variance_penalty_config
ALTER TABLE public.variance_penalty_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active penalty configs
CREATE POLICY "Variance penalty configs are viewable by authenticated users"
ON public.variance_penalty_config FOR SELECT
TO authenticated
USING (true);

-- Allow admins to manage penalty configs
CREATE POLICY "Variance penalty configs are manageable by admins"
ON public.variance_penalty_config FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- 10. Add RLS policies for collector_performance
ALTER TABLE public.collector_performance ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all performance records
CREATE POLICY "Admins can view all collector performance records" 
ON public.collector_performance 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- Allow admins to insert performance records
CREATE POLICY "Admins can insert collector performance records" 
ON public.collector_performance 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- Allow admins to update performance records
CREATE POLICY "Admins can update collector performance records" 
ON public.collector_performance 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- Allow admins to delete performance records
CREATE POLICY "Admins can delete collector performance records" 
ON public.collector_performance 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- 11. Grant permissions
GRANT ALL ON public.collection_points TO authenticated;
GRANT ALL ON public.variance_penalty_config TO authenticated;
GRANT ALL ON public.collector_performance TO authenticated;

-- 12. Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';