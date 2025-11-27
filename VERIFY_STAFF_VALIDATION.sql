-- ============================================
-- VERIFY_STAFF_VALIDATION.sql
-- Script to verify that staff validation is working correctly
-- ============================================

-- ============================================
-- 1. Test staff validation function
-- ============================================
SELECT 
    'Staff validation function exists' as test,
    EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'validate_staff_membership'
    ) as result;

-- ============================================
-- 2. Test staff ID conversion function
-- ============================================
SELECT 
    'Staff ID conversion function exists' as test,
    EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'get_staff_id_from_user'
    ) as result;

-- ============================================
-- 3. Check constraints
-- ============================================
SELECT 
    'Staff user_id foreign key constraint' as test,
    EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'staff_user_id_fkey'
    ) as result;

SELECT 
    'Milk approvals staff_id foreign key constraint' as test,
    EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'milk_approvals_staff_id_fkey'
    ) as result;

-- ============================================
-- 4. Check indexes
-- ============================================
SELECT 
    'Staff user_id index' as test,
    EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_staff_user_id'
    ) as result;

SELECT 
    'Milk approvals staff_id index' as test,
    EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_milk_approvals_staff_id'
    ) as result;

-- ============================================
-- 5. Test with sample data
-- ============================================

-- Get a sample staff user ID
SELECT 
    'Sample staff user ID' as test,
    user_id as result
FROM staff 
LIMIT 1;

-- Get a sample non-staff user ID (if exists)
SELECT 
    'Sample non-staff user ID' as test,
    ur.user_id as result
FROM user_roles ur
WHERE ur.user_id NOT IN (SELECT user_id FROM staff)
AND ur.role != 'staff'
LIMIT 1;

-- ============================================
-- 6. Test the functions with real data
-- ============================================

-- Test validation with a staff user (replace with actual staff user ID)
-- SELECT public.validate_staff_membership('actual-staff-user-id');

-- Test validation with a non-staff user (replace with actual non-staff user ID)
-- SELECT public.validate_staff_membership('non-staff-user-id');

-- Test staff ID conversion with a staff user (replace with actual staff user ID)
-- SELECT public.get_staff_id_from_user('actual-staff-user-id');

-- Test staff ID conversion with a non-staff user (this should fail)
-- SELECT public.get_staff_id_from_user('non-staff-user-id');

-- ============================================
-- 7. Summary
-- ============================================
SELECT 
    'All validation tests completed' as summary,
    'Check results above to verify staff validation is working' as note;