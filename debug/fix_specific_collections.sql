-- Debug Script: fix_specific_collections.sql
-- Description: Fix specific collections and payment records based on the current data

-- First, let's check the current state of the collections you mentioned
SELECT 
    c.id as collection_id,
    c.collection_date,
    c.liters,
    c.staff_id,
    s.user_id,
    p.full_name as collector_name,
    c.collection_fee_status,
    c.approved_for_payment,
    c.status
FROM collections c
JOIN staff s ON c.staff_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE c.id IN ('aee5ef24-1493-4987-b804-96373037fc1f', 'e106fbe1-3c86-49da-8871-b56bf9aa035f')
ORDER BY c.collection_date DESC;

-- Check all pending collections for these collectors
SELECT 
    c.id as collection_id,
    c.collection_date,
    c.liters,
    c.staff_id,
    s.user_id,
    p.full_name as collector_name,
    c.collection_fee_status,
    c.approved_for_payment,
    c.status
FROM collections c
JOIN staff s ON c.staff_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE c.staff_id IN ('2ae103c4-0370-4b5e-9eea-6c9b7c226570', 'c3c7107b-fa9c-4554-bac8-043710042a6f')
  AND c.collection_fee_status = 'pending'
  AND c.approved_for_payment = true
  AND c.status = 'Collected'
ORDER BY c.staff_id, c.collection_date DESC;

-- Check current payment records for these collectors
SELECT 
    cp.id as payment_id,
    cp.collector_id,
    s.user_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    cp.total_collections,
    cp.total_liters,
    cp.total_earnings,
    cp.total_penalties,
    cp.adjusted_earnings,
    cp.status,
    cp.created_at
FROM collector_payments cp
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE cp.collector_id IN ('2ae103c4-0370-4b5e-9eea-6c9b7c226570', 'c3c7107b-fa9c-4554-bac8-043710042a6f')
ORDER BY cp.collector_id, cp.created_at DESC;

-- Update the specific collections to paid status
UPDATE collections 
SET collection_fee_status = 'paid'
WHERE id = 'aee5ef24-1493-4987-b804-96373037fc1f'
  AND staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
  AND liters = 50
  AND collection_fee_status = 'pending';

UPDATE collections 
SET collection_fee_status = 'paid'
WHERE id = 'e106fbe1-3c86-49da-8871-b56bf9aa035f'
  AND staff_id = 'c3c7107b-fa9c-4554-bac8-043710042a6f'
  AND liters = 10
  AND collection_fee_status = 'pending';

-- Check if there are any other pending collections for collector2 that might be causing the 460 liters issue
SELECT 
    c.id as collection_id,
    c.collection_date,
    c.liters,
    c.staff_id,
    s.user_id,
    p.full_name as collector_name,
    c.collection_fee_status,
    c.approved_for_payment,
    c.status
FROM collections c
JOIN staff s ON c.staff_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
  AND c.collection_fee_status = 'pending'
  AND c.approved_for_payment = true
  AND c.status = 'Collected'
ORDER BY c.collection_date DESC;

-- If there are other pending collections for collector2, we should update them too
UPDATE collections 
SET collection_fee_status = 'paid'
WHERE staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
  AND collection_fee_status = 'pending'
  AND approved_for_payment = true
  AND status = 'Collected';

-- Run the fix function for both collectors to ensure payment periods are correct
SELECT public.fix_payment_period_inconsistencies('2ae103c4-0370-4b5e-9eea-6c9b7c226570'::UUID);
SELECT public.fix_payment_period_inconsistencies('c3c7107b-fa9c-4554-bac8-043710042a6f'::UUID);

-- Reset any extreme penalties
UPDATE collector_payments 
SET 
    total_penalties = 0,
    adjusted_earnings = total_earnings
WHERE total_penalties > 10000;

-- Verify the fixes
SELECT 
    c.id as collection_id,
    c.collection_date,
    c.liters,
    c.staff_id,
    s.user_id,
    p.full_name as collector_name,
    c.collection_fee_status,
    c.approved_for_payment,
    c.status
FROM collections c
JOIN staff s ON c.staff_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE c.staff_id IN ('2ae103c4-0370-4b5e-9eea-6c9b7c226570', 'c3c7107b-fa9c-4554-bac8-043710042a6f')
ORDER BY c.staff_id, c.collection_date DESC;

-- Check final payment records
SELECT 
    cp.id as payment_id,
    cp.collector_id,
    s.user_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    cp.total_collections,
    cp.total_liters,
    cp.total_earnings,
    cp.total_penalties,
    cp.adjusted_earnings,
    cp.status,
    cp.created_at
FROM collector_payments cp
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE cp.collector_id IN ('2ae103c4-0370-4b5e-9eea-6c9b7c226570', 'c3c7107b-fa9c-4554-bac8-043710042a6f')
ORDER BY cp.collector_id, cp.created_at DESC;