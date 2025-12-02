-- Migration: 20251201008_fix_existing_payment_records_with_penalties.sql
-- Description: Fix existing payment records by calculating and adding penalty information

BEGIN;

-- Update existing collector payment records to include penalty calculations
-- This will calculate penalties for each payment period based on the collections in that period
UPDATE collector_payments cp
SET 
    total_penalties = penalty_data.total_penalties,
    adjusted_earnings = GREATEST(0, cp.total_earnings - penalty_data.total_penalties)
FROM (
    SELECT 
        cp_inner.id as payment_id,
        COALESCE(SUM(ma.penalty_amount), 0)::NUMERIC(10,2) as total_penalties
    FROM collector_payments cp_inner
    JOIN collections c ON c.staff_id = cp_inner.collector_id
    LEFT JOIN milk_approvals ma ON c.id = ma.collection_id 
        AND ma.approved_at::DATE BETWEEN cp_inner.period_start AND cp_inner.period_end
        AND ma.penalty_amount IS NOT NULL
    WHERE c.approved_for_payment = true
      AND c.status = 'Collected'
    GROUP BY cp_inner.id
) penalty_data
WHERE cp.id = penalty_data.payment_id;

-- For any records that might not have been updated (due to no matching collections), set defaults
UPDATE collector_payments 
SET 
    total_penalties = 0,
    adjusted_earnings = total_earnings
WHERE total_penalties IS NULL OR adjusted_earnings IS NULL;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that penalties were calculated
-- SELECT 
--     COUNT(*) as total_payments,
--     COUNT(*) FILTER (WHERE total_penalties > 0) as payments_with_penalties,
--     AVG(total_penalties) as avg_penalties,
--     MAX(total_penalties) as max_penalties
-- FROM collector_payments;

-- Check sample data
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
-- ORDER BY total_penalties DESC
-- LIMIT 10;