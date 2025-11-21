-- Verification script to check the batch approval function is working correctly
-- This script checks the function signature and tests error handling

-- First, check that the function exists with the correct signature
SELECT 
    proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname = 'batch_approve_collector_collections'
AND n.nspname = 'public';

-- Check that the function has the correct parameter name (should show p_total_received_liters)
SELECT proname, pg_get_function_arguments(p.oid) 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname = 'batch_approve_collector_collections'
AND n.nspname = 'public';

-- Test error handling - this should show proper error messages
-- Test 1: NULL staff ID
SELECT * FROM public.batch_approve_collector_collections(
    NULL,  -- NULL staff ID should trigger error
    '00000000-0000-0000-0000-000000000000',
    '2025-01-01',
    1000
);

-- Test 2: NULL collector ID
SELECT * FROM public.batch_approve_collector_collections(
    '00000000-0000-0000-0000-000000000000',
    NULL,  -- NULL collector ID should trigger error
    '2025-01-01',
    1000
);

-- Test 3: NULL date
SELECT * FROM public.batch_approve_collector_collections(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    NULL,  -- NULL date should trigger error
    1000
);

-- Test 4: Negative liters
SELECT * FROM public.batch_approve_collector_collections(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '2025-01-01',
    -100  -- Negative liters should trigger error
);

-- Test 5: Valid call but no collections found (this should return "No collections found")
SELECT * FROM public.batch_approve_collector_collections(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    '2025-01-01',
    1000
);

-- Check that the function properly validates staff roles
-- This would require actual staff records with proper roles in the database

-- Summary: The function is working correctly if:
-- 1. It has the correct signature with p_total_received_liters parameter
-- 2. It properly validates inputs and provides meaningful error messages
-- 3. It handles edge cases appropriately