-- Migration: 20251217000500_fix_collector_rate_rpc.sql
-- Description: Fix collector rate RPC function to properly fetch active collector rate
-- Estimated time: 1 minute

BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_current_collector_rate();

-- Create new improved function to get current collector rate
CREATE OR REPLACE FUNCTION public.get_current_collector_rate()
RETURNS NUMERIC(10,2)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate NUMERIC(10,2);
BEGIN
  -- First try to get the active collector rate
  SELECT rate_per_liter INTO v_rate
  FROM public.collector_rates
  WHERE is_active = true
  ORDER BY effective_from DESC
  LIMIT 1;
  
  -- If no active collector rate found, return 0.00
  RETURN COALESCE(v_rate, 0.00);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_collector_rate TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that function was created
SELECT proname, provolatile, prosecdef 
FROM pg_proc 
WHERE proname = 'get_current_collector_rate';

-- Test the function
SELECT public.get_current_collector_rate();