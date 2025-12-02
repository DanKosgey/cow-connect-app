-- Migration: 20251201009_reset_extreme_penalties.sql
-- Description: Reset extreme penalty amounts that are clearly incorrect (over Ksh 10,000)

BEGIN;

-- First, let's identify and log the extreme penalty records before resetting them
-- This will help us understand what went wrong
CREATE TEMP TABLE extreme_penalty_log AS
SELECT 
    cp.id as payment_id,
    cp.collector_id,
    s.user_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    cp.total_earnings,
    cp.total_penalties,
    cp.adjusted_earnings,
    -- Count of collections in this period for this collector
    (SELECT COUNT(*) 
     FROM collections c 
     WHERE c.staff_id = cp.collector_id 
       AND c.collection_date::DATE BETWEEN cp.period_start AND cp.period_end
       AND c.approved_for_payment = true
       AND c.status = 'Collected') as actual_collection_count,
    -- Count of penalties that contributed to this amount
    (SELECT COUNT(*)
     FROM milk_approvals ma
     JOIN collections c ON ma.collection_id = c.id
     WHERE c.staff_id = cp.collector_id
       AND ma.approved_at::DATE BETWEEN cp.period_start AND cp.period_end
       AND ma.penalty_amount IS NOT NULL
       AND ma.penalty_amount > 0) as penalty_record_count
FROM collector_payments cp
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE cp.total_penalties > 10000; -- Extreme penalties over Ksh 10,000

-- Log the findings (this can be queried after the migration runs)
-- SELECT * FROM extreme_penalty_log;

-- Reset extreme penalty amounts to 0 and recalculate properly
UPDATE collector_payments 
SET 
    total_penalties = 0,
    adjusted_earnings = total_earnings
WHERE total_penalties > 10000;

-- Now recalculate penalties properly for all payments
-- This will ensure we're calculating penalties correctly based on actual collections
UPDATE collector_payments cp
SET 
    total_penalties = calculated_penalties.total_penalties,
    adjusted_earnings = GREATEST(0, cp.total_earnings - calculated_penalties.total_penalties)
FROM (
    SELECT 
        cp_inner.id as payment_id,
        COALESCE(
            (SELECT COALESCE(SUM(ma.penalty_amount), 0)
             FROM milk_approvals ma
             JOIN collections c ON ma.collection_id = c.id
             WHERE c.staff_id = cp_inner.collector_id
               AND ma.approved_at::DATE BETWEEN cp_inner.period_start AND cp_inner.period_end
               AND ma.penalty_amount IS NOT NULL), 
            0
        )::NUMERIC(10,2) as total_penalties
    FROM collector_payments cp_inner
) calculated_penalties
WHERE cp.id = calculated_penalties.payment_id;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that extreme penalties were reset
-- SELECT 
--     COUNT(*) as extreme_penalties_remaining
-- FROM collector_payments 
-- WHERE total_penalties > 10000;

-- Check the distribution of penalty amounts
-- SELECT 
--     COUNT(*) FILTER (WHERE total_penalties = 0) as zero_penalties,
--     COUNT(*) FILTER (WHERE total_penalties > 0 AND total_penalties <= 100) as low_penalties,
--     COUNT(*) FILTER (WHERE total_penalties > 100 AND total_penalties <= 500) as medium_penalties,
--     COUNT(*) FILTER (WHERE total_penalties > 500 AND total_penalties <= 1000) as high_penalties,
--     COUNT(*) FILTER (WHERE total_penalties > 1000) as very_high_penalties,
--     MAX(total_penalties) as max_penalty,
--     AVG(total_penalties) as avg_penalty
-- FROM collector_payments;

-- Check sample corrected data
-- SELECT 
--     id,
--     collector_id,
--     period_start,
--     period_end,
--     total_earnings,
--     total_penalties,
--     adjusted_earnings,
--     status
-- FROM collector_payments
-- WHERE total_penalties > 0
-- ORDER BY total_penalties DESC
-- LIMIT 10;