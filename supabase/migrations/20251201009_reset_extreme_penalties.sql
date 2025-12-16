-- Migration: 20251201009_reset_extreme_penalties.sql
-- Description: Reset extreme penalty amounts in collector payments to reasonable values
-- Estimated time: 2 minutes

BEGIN;

-- Reset extreme penalty amounts (> 10,000) to 0
UPDATE public.collector_payments 
SET total_penalties = 0,
    adjusted_earnings = total_earnings
WHERE total_penalties > 10000;

-- Recalculate all collector payment penalties based on actual milk approvals (only pending penalties)
UPDATE public.collector_payments cp
SET 
    total_penalties = calculated_penalties.total_penalties,
    adjusted_earnings = GREATEST(0, cp.total_earnings - calculated_penalties.total_penalties)
FROM (
    SELECT 
        cp_inner.id as payment_id,
        COALESCE(
            (SELECT COALESCE(SUM(CASE WHEN ma.penalty_status = 'pending' THEN ma.penalty_amount ELSE 0 END), 0)
             FROM public.milk_approvals ma
             JOIN public.collections c ON ma.collection_id = c.id
             WHERE c.staff_id = cp_inner.collector_id
               AND ma.approved_at::DATE BETWEEN cp_inner.period_start AND cp_inner.period_end
               AND ma.penalty_amount IS NOT NULL), 
            0
        )::NUMERIC(10,2) as total_penalties
    FROM public.collector_payments cp_inner
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