-- Migration: 20251201012_fix_current_data_inconsistencies.sql
-- Description: Fix current data inconsistencies for the specific collections shown

BEGIN;

-- First, let's identify the specific issue with collector2
-- It shows 460 liters in payment history but only has a 50-liter pending collection
-- This suggests there may be other collections or the payment record is incorrect

-- Let's check what collections are associated with collector2
-- collector2 staff_id: 2ae103c4-0370-4b5e-9eea-6c9b7c226570

-- Update the specific collections you mentioned to paid status
-- collector2's 50-liter collection
UPDATE collections 
SET collection_fee_status = 'paid'
WHERE id = 'aee5ef24-1493-4987-b804-96373037fc1f'
  AND staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
  AND liters = 50
  AND collection_fee_status = 'pending';

-- collector1's 10-liter collection  
UPDATE collections 
SET collection_fee_status = 'paid'
WHERE id = 'e106fbe1-3c86-49da-8871-b56bf9aa035f'
  AND staff_id = 'c3c7107b-fa9c-4554-bac8-043710042a6f'
  AND liters = 10
  AND collection_fee_status = 'pending';

-- Now let's fix any payment period inconsistencies for these collectors
-- First for collector2
SELECT public.fix_payment_period_inconsistencies('2ae103c4-0370-4b5e-9eea-6c9b7c226570'::UUID);

-- Then for collector1
SELECT public.fix_payment_period_inconsistencies('c3c7107b-fa9c-4554-bac8-043710042a6f'::UUID);

-- Reset extreme penalties that are clearly wrong
UPDATE collector_payments 
SET 
    total_penalties = 0,
    adjusted_earnings = total_earnings
WHERE total_penalties > 10000;

-- Update any remaining payments to ensure they have proper adjusted earnings
UPDATE collector_payments 
SET adjusted_earnings = GREATEST(0, total_earnings - COALESCE(total_penalties, 0))
WHERE adjusted_earnings IS NULL OR adjusted_earnings != GREATEST(0, total_earnings - COALESCE(total_penalties, 0));

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the specific collections were updated
-- SELECT 
--     id,
--     collection_date,
--     liters,
--     staff_id,
--     collection_fee_status
-- FROM collections 
-- WHERE id IN ('aee5ef24-1493-4987-b804-96373037fc1f', 'e106fbe1-3c86-49da-8871-b56bf9aa035f');

-- Check current pending collections
-- SELECT 
--     c.id,
--     c.collection_date,
--     c.liters,
--     c.staff_id,
--     s.user_id,
--     p.full_name as collector_name,
--     c.collection_fee_status
-- FROM collections c
-- JOIN staff s ON c.staff_id = s.id
-- JOIN profiles p ON s.user_id = p.id
-- WHERE c.collection_fee_status = 'pending'
--   AND c.approved_for_payment = true
--   AND c.status = 'Collected'
-- ORDER BY c.collection_date DESC;

-- Check payment records
-- SELECT 
--     cp.id,
--     cp.collector_id,
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
-- ORDER BY cp.created_at DESC;