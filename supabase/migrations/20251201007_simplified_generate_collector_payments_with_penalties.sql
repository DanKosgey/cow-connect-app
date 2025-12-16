-- Migration: 20251201007_simplified_generate_collector_payments_with_penalties.sql
-- Description: Simplified function to generate collector payments with penalty calculations
-- Estimated time: 1 minute

BEGIN;

-- Create or replace the function to generate collector payments
CREATE OR REPLACE FUNCTION public.generate_collector_payments()
RETURNS TABLE(
    collector_id UUID,
    period_start DATE,
    period_end DATE,
    total_collections INTEGER,
    total_liters NUMERIC(10,2),
    rate_per_liter NUMERIC(10,2),
    total_earnings NUMERIC(10,2),
    total_penalties NUMERIC(10,2),
    adjusted_earnings NUMERIC(10,2)
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH filtered_collectors AS (
        SELECT 
            c.staff_id,
            MIN(c.collection_date::DATE) as min_date,
            MAX(c.collection_date::DATE) as max_date,
            COUNT(c.id) as collection_count,
            SUM(c.liters) as total_liter
        FROM collections c
        WHERE c.approved_for_payment = true
          AND c.status = 'Collected'
          AND NOT EXISTS (
              SELECT 1 
              FROM collector_payments cp 
              WHERE cp.collector_id = c.staff_id
                AND cp.period_start <= c.collection_date::DATE
                AND cp.period_end >= c.collection_date::DATE
          )
        GROUP BY c.staff_id
    ),
    rates AS (
        SELECT COALESCE((
            SELECT rate_per_liter 
            FROM collector_rates 
            WHERE effective_date <= NOW() 
            ORDER BY effective_date DESC 
            LIMIT 1
        ), 3.00) as current_rate
    ),
    collector_penalties AS (
        SELECT 
            c.staff_id,
            COALESCE(SUM(CASE WHEN ma.penalty_status = 'pending' THEN ma.penalty_amount ELSE 0 END), 0)::NUMERIC(10,2) as total_penalty
        FROM collections c
        LEFT JOIN milk_approvals ma ON c.id = ma.collection_id
        WHERE c.approved_for_payment = true
          AND c.status = 'Collected'
          AND ma.penalty_amount IS NOT NULL
        GROUP BY c.staff_id
    )
    SELECT 
        fc.staff_id as collector_id,
        fc.min_date as period_start,
        fc.max_date as period_end,
        fc.collection_count::INTEGER as total_collections,
        fc.total_liter::NUMERIC(10,2) as total_liters,
        r.current_rate::NUMERIC(10,2) as rate_per_liter,
        (fc.total_liter * r.current_rate)::NUMERIC(10,2) as total_earnings,
        COALESCE(cp.total_penalty, 0)::NUMERIC(10,2) as total_penalties,
        GREATEST(0, (fc.total_liter * r.current_rate) - COALESCE(cp.total_penalty, 0))::NUMERIC(10,2) as adjusted_earnings
    FROM filtered_collectors fc
    CROSS JOIN rates r
    LEFT JOIN collector_penalties cp ON fc.staff_id = cp.staff_id
    WHERE fc.collection_count > 0;
END;
$$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the function was created
-- SELECT proname FROM pg_proc WHERE proname = 'generate_collector_payments';

-- Test the function
-- SELECT * FROM public.generate_collector_payments() LIMIT 5;