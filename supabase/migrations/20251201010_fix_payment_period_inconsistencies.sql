-- Migration: 20251201010_fix_payment_period_inconsistencies.sql
-- Description: Fix payment period inconsistencies where payment periods don't match actual collection dates

BEGIN;

-- First, let's identify payments where the period doesn't match the actual collections
-- This will help us understand what needs to be fixed
CREATE TEMP TABLE payment_inconsistencies AS
SELECT 
    cp.id as payment_id,
    cp.collector_id,
    cp.period_start as recorded_period_start,
    cp.period_end as recorded_period_end,
    actual_min_date,
    actual_max_date,
    cp.total_collections as recorded_collections,
    actual_collection_count,
    cp.total_liters as recorded_liters,
    actual_total_liters,
    ABS(cp.total_collections - actual_collection_count) as collection_diff,
    ABS(cp.total_liters - actual_total_liters) as liters_diff
FROM collector_payments cp
JOIN (
    SELECT 
        c.staff_id,
        MIN(c.collection_date::DATE) as actual_min_date,
        MAX(c.collection_date::DATE) as actual_max_date,
        COUNT(c.id) as actual_collection_count,
        COALESCE(SUM(c.liters), 0) as actual_total_liters
    FROM collections c
    WHERE c.approved_for_payment = true
      AND c.status = 'Collected'
      AND c.collection_fee_status = 'pending'
    GROUP BY c.staff_id
) actual_data ON cp.collector_id = actual_data.staff_id
WHERE cp.status = 'pending'
  AND (cp.period_start != actual_min_date 
       OR cp.period_end != actual_max_date
       OR cp.total_collections != actual_collection_count
       OR ABS(cp.total_liters - actual_total_liters) > 0.01);

-- Update payment periods to match actual collection data for pending payments
UPDATE collector_payments cp
SET 
    period_start = actual_data.actual_min_date,
    period_end = actual_data.actual_max_date,
    total_collections = actual_data.actual_collection_count,
    total_liters = actual_data.actual_total_liters,
    total_earnings = actual_data.actual_total_liters * cr.rate_per_liter,
    adjusted_earnings = GREATEST(0, (actual_data.actual_total_liters * cr.rate_per_liter) - COALESCE(cp.total_penalties, 0))
FROM (
    SELECT 
        c.staff_id,
        MIN(c.collection_date::DATE) as actual_min_date,
        MAX(c.collection_date::DATE) as actual_max_date,
        COUNT(c.id) as actual_collection_count,
        COALESCE(SUM(c.liters), 0) as actual_total_liters
    FROM collections c
    WHERE c.approved_for_payment = true
      AND c.status = 'Collected'
      AND c.collection_fee_status = 'pending'
    GROUP BY c.staff_id
) actual_data
JOIN collector_rates cr ON cr.is_active = true
WHERE cp.collector_id = actual_data.staff_id
  AND cp.status = 'pending'
  AND (cp.period_start != actual_data.actual_min_date 
       OR cp.period_end != actual_data.actual_max_date
       OR cp.total_collections != actual_data.actual_collection_count
       OR ABS(cp.total_liters - actual_data.actual_total_liters) > 0.01);

-- For any payments that still have inconsistencies, let's log them
-- This can help with debugging
CREATE TEMP TABLE remaining_inconsistencies AS
SELECT 
    cp.id as payment_id,
    cp.collector_id,
    s.user_id,
    p.full_name as collector_name,
    cp.period_start as recorded_period_start,
    cp.period_end as recorded_period_end,
    actual_min_date,
    actual_max_date,
    cp.total_collections as recorded_collections,
    actual_collection_count,
    cp.total_liters as recorded_liters,
    actual_total_liters,
    ABS(cp.total_collections - actual_collection_count) as collection_diff,
    ABS(cp.total_liters - actual_total_liters) as liters_diff
FROM collector_payments cp
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
JOIN (
    SELECT 
        c.staff_id,
        MIN(c.collection_date::DATE) as actual_min_date,
        MAX(c.collection_date::DATE) as actual_max_date,
        COUNT(c.id) as actual_collection_count,
        COALESCE(SUM(c.liters), 0) as actual_total_liters
    FROM collections c
    WHERE c.approved_for_payment = true
      AND c.status = 'Collected'
      AND c.collection_fee_status = 'pending'
    GROUP BY c.staff_id
) actual_data ON cp.collector_id = actual_data.staff_id
WHERE cp.status = 'pending'
  AND (cp.period_start != actual_min_date 
       OR cp.period_end != actual_max_date
       OR cp.total_collections != actual_collection_count
       OR ABS(cp.total_liters - actual_total_liters) > 0.01);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if there are still inconsistencies
-- SELECT * FROM remaining_inconsistencies;

-- Check the distribution of payment statuses
-- SELECT 
--     status,
--     COUNT(*) as count,
--     SUM(total_earnings) as total_earnings,
--     SUM(total_penalties) as total_penalties,
--     SUM(adjusted_earnings) as total_net_earnings
-- FROM collector_payments
-- GROUP BY status;

-- Check sample data
-- SELECT 
--     cp.id,
--     s.user_id,
--     p.full_name as collector_name,
--     cp.period_start,
--     cp.period_end,
--     cp.total_collections,
--     cp.total_liters,
--     cp.total_earnings,
--     cp.total_penalties,
--     cp.adjusted_earnings,
--     cp.status
-- FROM collector_payments cp
-- JOIN staff s ON cp.collector_id = s.id
-- JOIN profiles p ON s.user_id = p.id
-- ORDER BY cp.created_at DESC
-- LIMIT 10;