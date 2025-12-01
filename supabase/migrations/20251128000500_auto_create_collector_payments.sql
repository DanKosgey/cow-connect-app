-- Migration: 20251128000500_auto_create_collector_payments.sql
-- Description: Automatically create collector payment records for approved collections
-- This will create payment records for collectors based on their approved collections

BEGIN;

-- Create a function to generate collector payment records
CREATE OR REPLACE FUNCTION generate_collector_payments()
RETURNS TABLE(
    collector_id UUID,
    period_start DATE,
    period_end DATE,
    total_collections INTEGER,
    total_liters NUMERIC(10,2),
    rate_per_liter NUMERIC(10,2),
    total_earnings NUMERIC(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.staff_id as collector_id,
        MIN(c.collection_date::DATE) as period_start,
        MAX(c.collection_date::DATE) as period_end,
        COUNT(c.id)::INTEGER as total_collections,
        SUM(c.liters)::NUMERIC(10,2) as total_liters,
        -- Get the current collector rate
        COALESCE((
            SELECT rate_per_liter 
            FROM collector_rates 
            WHERE is_active = true 
            ORDER BY effective_from DESC 
            LIMIT 1
        ), 0.00)::NUMERIC(10,2) as rate_per_liter,
        -- Calculate total earnings
        (SUM(c.liters) * COALESCE((
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
    GROUP BY c.staff_id;
END;
$$ LANGUAGE plpgsql;

-- Create collector payment records for approved collections
INSERT INTO collector_payments (
    collector_id,
    period_start,
    period_end,
    total_collections,
    total_liters,
    rate_per_liter,
    total_earnings,
    status
)
SELECT 
    collector_id,
    period_start,
    period_end,
    total_collections,
    total_liters,
    rate_per_liter,
    total_earnings,
    'pending' as status
FROM generate_collector_payments()
WHERE total_collections > 0;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that collector payments were created
SELECT 
    COUNT(*) as total_payments_created,
    SUM(total_earnings) as total_earnings_generated
FROM collector_payments;

-- Check some sample data
SELECT 
    cp.id,
    s.id as staff_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    cp.total_collections,
    cp.total_liters,
    cp.rate_per_liter,
    cp.total_earnings,
    cp.status
FROM collector_payments cp
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
ORDER BY cp.created_at DESC
LIMIT 10;