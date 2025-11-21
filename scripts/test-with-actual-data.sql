-- Test script to verify the batch approval function with actual data
-- Replace the placeholder IDs with actual IDs from your database

-- First, find actual staff IDs by running:
-- \i scripts/find-test-staff-ids.sql

-- Then replace these placeholders with actual IDs:
-- :staff_id - A staff member with 'staff' role
-- :collector_id - A staff member with 'collector' role  
-- :collection_date - A date with actual collections

-- Example of how to call the function with actual data:
/*
SELECT * FROM public.batch_approve_collector_collections(
    'ACTUAL_STAFF_ID_HERE',      -- Replace with actual staff ID
    'ACTUAL_COLLECTOR_ID_HERE',  -- Replace with actual collector ID
    '2025-11-20',                -- Replace with actual date
    1000                         -- Total received liters
);
*/

-- To test with your actual data, first find the IDs:
-- 1. Run scripts/find-test-staff-ids.sql to get actual staff/collector IDs
-- 2. Find a date with unapproved collections
-- 3. Replace the placeholders above with actual values
-- 4. Run the function call

-- Example verification queries after running the function:

-- Check that milk approvals were created
SELECT 
    ma.id,
    ma.collection_id,
    ma.staff_id,
    ma.company_received_liters,
    ma.variance_liters,
    ma.variance_percentage,
    ma.variance_type,
    ma.penalty_amount,
    c.liters as collected_liters
FROM public.milk_approvals ma
JOIN public.collections c ON ma.collection_id = c.id
WHERE ma.staff_id = 'ACTUAL_STAFF_ID_HERE'  -- Replace with actual staff ID
ORDER BY ma.created_at DESC
LIMIT 10;

-- Check that collections were marked as approved
SELECT 
    id,
    liters,
    staff_id,
    approved_for_company,
    company_approval_id
FROM public.collections
WHERE staff_id = 'ACTUAL_COLLECTOR_ID_HERE'  -- Replace with actual collector ID
AND collection_date::date = '2025-11-20'     -- Replace with actual date
ORDER BY created_at DESC;

-- Check that collector performance metrics were updated
SELECT 
    cp.id,
    cp.staff_id,
    cp.period_start,
    cp.period_end,
    cp.total_collections,
    cp.total_liters_collected,
    cp.total_liters_received,
    cp.total_variance,
    cp.total_penalty_amount
FROM public.collector_performance cp
WHERE cp.staff_id = 'ACTUAL_COLLECTOR_ID_HERE'  -- Replace with actual collector ID
ORDER BY cp.created_at DESC
LIMIT 5;

-- Verification that the proportional distribution works correctly:
-- If you have collections with:
-- Collection A: 200L collected
-- Collection B: 300L collected
-- Total collected: 500L
-- Total received: 450L
--
-- Then after approval:
-- Collection A should have received: (200/500) * 450 = 180L
-- Collection B should have received: (300/500) * 450 = 270L
-- Total received: 450L (matches input)