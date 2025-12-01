-- Migration: 20251128001000_simplified_generate_collector_payments.sql
-- Description: Create a simplified version of generate_collector_payments that works better with RPC

BEGIN;

-- Drop the existing function
DROP FUNCTION IF EXISTS generate_collector_payments();

-- Create a simplified function with no complex queries
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
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH collector_data AS (
        SELECT 
            c.staff_id,
            MIN(c.collection_date::DATE) as min_date,
            MAX(c.collection_date::DATE) as max_date,
            COUNT(c.id) as collection_count,
            COALESCE(SUM(c.liters), 0) as total_liter
        FROM collections c
        WHERE c.approved_for_payment = true
          AND c.status = 'Collected'
        GROUP BY c.staff_id
        HAVING COUNT(c.id) > 0
    ),
    rates AS (
        SELECT COALESCE((
            SELECT rate_per_liter 
            FROM collector_rates 
            WHERE is_active = true 
            ORDER BY effective_from DESC 
            LIMIT 1
        ), 0.00) as current_rate
    ),
    filtered_collectors AS (
        SELECT 
            cd.staff_id,
            cd.min_date,
            cd.max_date,
            cd.collection_count,
            cd.total_liter
        FROM collector_data cd
        WHERE NOT EXISTS (
            SELECT 1 
            FROM collector_payments cp 
            WHERE cp.collector_id = cd.staff_id
              AND cp.period_start <= cd.min_date
              AND cp.period_end >= cd.max_date
        )
    )
    SELECT 
        fc.staff_id as collector_id,
        fc.min_date as period_start,
        fc.max_date as period_end,
        fc.collection_count::INTEGER as total_collections,
        fc.total_liter::NUMERIC(10,2) as total_liters,
        r.current_rate::NUMERIC(10,2) as rate_per_liter,
        (fc.total_liter * r.current_rate)::NUMERIC(10,2) as total_earnings
    FROM filtered_collectors fc
    CROSS JOIN rates r
    WHERE fc.collection_count > 0;
END;
$$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the function was created
SELECT proname FROM pg_proc WHERE proname = 'generate_collector_payments';

-- Test the function
-- SELECT * FROM public.generate_collector_payments() LIMIT 5;