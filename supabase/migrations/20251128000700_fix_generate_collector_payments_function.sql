-- Migration: 20251128000700_fix_generate_collector_payments_function.sql
-- Description: Fix the generate_collector_payments function to ensure it's properly registered

BEGIN;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_collector_payments();

-- Create a simplified function to generate collector payment records
CREATE OR REPLACE FUNCTION public.generate_collector_payments()
RETURNS TABLE(
    collector_id UUID,
    period_start DATE,
    period_end DATE,
    total_collections INTEGER,
    total_liters NUMERIC(10,2),
    rate_per_liter NUMERIC(10,2),
    total_earnings NUMERIC(10,2)
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.staff_id as collector_id,
        MIN(c.collection_date::DATE) as period_start,
        MAX(c.collection_date::DATE) as period_end,
        COUNT(c.id)::INTEGER as total_collections,
        COALESCE(SUM(c.liters), 0)::NUMERIC(10,2) as total_liters,
        -- Get the current collector rate
        COALESCE((
            SELECT rate_per_liter 
            FROM collector_rates 
            WHERE is_active = true 
            ORDER BY effective_from DESC 
            LIMIT 1
        ), 0.00)::NUMERIC(10,2) as rate_per_liter,
        -- Calculate total earnings
        (COALESCE(SUM(c.liters), 0) * COALESCE((
            SELECT rate_per_liter 
            FROM collector_rates 
            WHERE is_active = true 
            ORDER BY effective_from DESC 
            LIMIT 1
        ), 0.00))::NUMERIC(10,2) as total_earnings
    FROM collections c
    WHERE c.approved_for_payment = true
      AND c.status = 'Collected'
      AND NOT EXISTS (
          -- Check if a payment record already exists for this collector and period
          SELECT 1 
          FROM collector_payments cp 
          WHERE cp.collector_id = c.staff_id
            AND cp.period_start <= c.collection_date::DATE
            AND cp.period_end >= c.collection_date::DATE
      )
    GROUP BY c.staff_id
    HAVING COUNT(c.id) > 0; -- Only return records with collections
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the function was created
SELECT proname FROM pg_proc WHERE proname = 'generate_collector_payments';

-- Test the function
-- SELECT * FROM public.generate_collector_payments() LIMIT 5;