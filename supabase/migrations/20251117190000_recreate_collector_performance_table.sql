-- Migration: 20251117190000_recreate_collector_performance_table.sql
-- Description: Recreate collector_performance table for tracking collector performance metrics
-- Estimated time: 1 minute

BEGIN;

-- Create collector_performance table with improved schema
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_performance_staff_id ON public.collector_performance (staff_id);
CREATE INDEX IF NOT EXISTS idx_collector_performance_period ON public.collector_performance (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_collector_performance_score ON public.collector_performance (performance_score);

-- Add RLS policies
ALTER TABLE public.collector_performance ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all performance records
CREATE POLICY "Admins can view all collector performance records" 
ON public.collector_performance 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.staff s 
    JOIN public.profiles p ON s.user_id = p.id 
    WHERE s.id = staff_id AND p.role = 'admin'
  )
);

-- Allow admins to insert performance records
CREATE POLICY "Admins can insert collector performance records" 
ON public.collector_performance 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff s 
    JOIN public.profiles p ON s.user_id = p.id 
    WHERE s.id = staff_id AND p.role = 'admin'
  )
);

-- Allow admins to update performance records
CREATE POLICY "Admins can update collector performance records" 
ON public.collector_performance 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.staff s 
    JOIN public.profiles p ON s.user_id = p.id 
    WHERE s.id = staff_id AND p.role = 'admin'
  )
);

-- Allow admins to delete performance records
CREATE POLICY "Admins can delete collector performance records" 
ON public.collector_performance 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.staff s 
    JOIN public.profiles p ON s.user_id = p.id 
    WHERE s.id = staff_id AND p.role = 'admin'
  )
);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that table was created
SELECT table_name FROM information_schema.tables WHERE table_name = 'collector_performance';

-- Check that columns were created
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'collector_performance' ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'collector_performance';

-- Check that RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'collector_performance';