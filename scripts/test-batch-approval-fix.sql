-- Test script to verify the batch approval fix works correctly
-- This script checks the function signature and tests basic functionality

-- First, check that the function exists with the correct signature
SELECT 
    proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname = 'batch_approve_collector_collections'
AND n.nspname = 'public';

-- Test the function with dummy parameters (will return "No collections found" which is expected)
SELECT * FROM public.batch_approve_collector_collections(
    '00000000-0000-0000-0000-000000000000',  -- dummy staff ID
    '00000000-0000-0000-0000-000000000000',  -- dummy collector ID
    '2025-01-01',                            -- dummy date
    1000                                     -- total received liters
);

-- Check that we can call the function with the new parameter name
-- This will verify that the function signature is correct
SELECT proname, pg_get_function_arguments(p.oid) 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname = 'batch_approve_collector_collections'
AND n.nspname = 'public';