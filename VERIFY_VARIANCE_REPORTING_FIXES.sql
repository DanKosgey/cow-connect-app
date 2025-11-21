-- Verification Script for Variance Reporting Fixes
-- Run this script in your Supabase SQL Editor to verify that all fixes are properly applied

-- 1. Check that the get_all_collectors_summary function exists
SELECT 
    proname as function_name,
    probin as function_definition
FROM pg_proc 
WHERE proname = 'get_all_collectors_summary';

-- 2. Check the function parameters
SELECT 
    proname,
    proargnames as parameter_names,
    proargtypes as parameter_types
FROM pg_proc 
WHERE proname = 'get_all_collectors_summary';

-- 3. Test calling the function with a sample date
SELECT * FROM public.get_all_collectors_summary('2025-11-18') LIMIT 5;

-- 4. Check that collector_performance table exists
SELECT 
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'collector_performance';

-- 5. Check collector_performance table structure
\d collector_performance

-- 6. Check that collector_daily_summaries table exists
SELECT 
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'collector_daily_summaries';

-- 7. Check collector_daily_summaries table structure
\d collector_daily_summaries

-- 8. Check that RLS is enabled on collector_performance table
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'collector_performance';

-- 9. Check RLS policies on collector_performance table
SELECT 
    polname as policy_name,
    polpermissive as permissive,
    polroles as roles,
    polqual as using_clause,
    polwithcheck as with_check_clause
FROM pg_policy 
WHERE polrelid = 'collector_performance'::regclass;

-- 10. Check that RLS is enabled on collector_daily_summaries table
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'collector_daily_summaries';

-- 11. Check RLS policies on collector_daily_summaries table
SELECT 
    polname as policy_name,
    polpermissive as permissive,
    polroles as roles,
    polqual as using_clause,
    polwithcheck as with_check_clause
FROM pg_policy 
WHERE polrelid = 'collector_daily_summaries'::regclass;

-- 12. Check profiles table structure to verify the correct column names
\d profiles

-- 13. Check staff table structure
\d staff

-- 14. Verify the JOIN between staff and profiles works correctly
SELECT 
    s.id as staff_id,
    s.user_id,
    p.id as profile_id,
    p.full_name
FROM staff s
JOIN profiles p ON s.user_id = p.id
LIMIT 5;

-- 15. Check if there are any collections for testing
SELECT 
    COUNT(*) as total_collections,
    MIN(collection_date) as earliest_date,
    MAX(collection_date) as latest_date
FROM collections;

-- 16. Check if there are any milk approvals for testing
SELECT 
    COUNT(*) as total_approvals,
    MIN(approved_at) as earliest_approval,
    MAX(approved_at) as latest_approval
FROM milk_approvals;

-- 17. Test the function with a date that has actual data (if available)
-- Replace '2025-11-18' with an actual date from your data
SELECT 
    collector_id,
    collector_name,
    total_collections,
    total_liters_collected
FROM public.get_all_collectors_summary('2025-11-18')
ORDER BY total_liters_collected DESC;

-- 18. Check collector_performance table data (if any exists)
SELECT 
    staff_id,
    period_start,
    period_end,
    total_collections,
    performance_score
FROM collector_performance
ORDER BY period_start DESC
LIMIT 5;

-- 19. Check collector_daily_summaries table data (if any exists)
SELECT 
    collector_id,
    collection_date,
    total_collections,
    total_liters_collected
FROM collector_daily_summaries
ORDER BY collection_date DESC
LIMIT 5;

-- 20. Verify that the function can be called by authenticated users
-- This would typically be tested through the application, but you can check permissions:
SELECT 
    proname,
    proacl
FROM pg_proc 
WHERE proname = 'get_all_collectors_summary';