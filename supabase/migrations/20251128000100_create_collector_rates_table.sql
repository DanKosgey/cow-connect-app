-- Migration: 20251128000100_create_collector_rates_table.sql
-- Description: Create collector_rates table for tracking collector payment rates per liter
-- Estimated time: 1 minute

BEGIN;

-- Create collector_rates table
CREATE TABLE IF NOT EXISTS public.collector_rates (
  id BIGSERIAL PRIMARY KEY,
  rate_per_liter NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_rates_active ON public.collector_rates (is_active);
CREATE INDEX IF NOT EXISTS idx_collector_rates_effective_from ON public.collector_rates (effective_from);

-- Add RLS policies
ALTER TABLE public.collector_rates ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all collector rates
CREATE POLICY "Admins can view all collector rates" 
ON public.collector_rates 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to insert collector rates
CREATE POLICY "Admins can insert collector rates" 
ON public.collector_rates 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to update collector rates
CREATE POLICY "Admins can update collector rates" 
ON public.collector_rates 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to delete collector rates
CREATE POLICY "Admins can delete collector rates" 
ON public.collector_rates 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Create function to get current collector rate
-- DEPRECATED: Using direct database queries instead of RPC functions for better reliability
-- CREATE OR REPLACE FUNCTION public.get_current_collector_rate()
-- RETURNS NUMERIC(10,2)
-- LANGUAGE plpgsql AS $$
-- DECLARE
--   v_rate NUMERIC(10,2);
-- BEGIN
--   SELECT rate_per_liter INTO v_rate
--   FROM public.collector_rates
--   WHERE is_active = true
--   ORDER BY effective_from DESC
--   LIMIT 1;
--   
--   RETURN COALESCE(v_rate, 0.00);
-- END;
-- $$;

-- Grant execute permission to authenticated users
-- DEPRECATED: Using direct database queries instead of RPC functions for better reliability
-- GRANT EXECUTE ON FUNCTION public.get_current_collector_rate TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that table was created
SELECT table_name FROM information_schema.tables WHERE table_name = 'collector_rates';

-- Check that columns were created
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'collector_rates' ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'collector_rates';

-- Check that RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'collector_rates';

-- Check that policies were created
SELECT policyname FROM pg_policy WHERE polrelid = 'collector_rates'::regclass;

-- Test the function
-- DEPRECATED: Using direct database queries instead of RPC functions for better reliability
-- SELECT public.get_current_collector_rate();