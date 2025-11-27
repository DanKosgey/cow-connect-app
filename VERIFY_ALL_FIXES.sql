-- ============================================
-- VERIFY_ALL_FIXES.sql
-- Script to verify that all RLS policy fixes are working correctly
-- ============================================

-- ============================================
-- 1. Verify staff can access profiles
-- ============================================
SELECT 
    'Staff can access profiles' as test,
    COUNT(*) as result
FROM profiles 
WHERE id IN (
    SELECT user_id FROM staff LIMIT 5
);

-- ============================================
-- 2. Verify staff can access staff records
-- ============================================
SELECT 
    'Staff can access staff records' as test,
    COUNT(*) as result
FROM staff;

-- ============================================
-- 3. Verify staff can access farmer records
-- ============================================
SELECT 
    'Staff can access farmer records' as test,
    COUNT(*) as result
FROM farmers;

-- ============================================
-- 4. Verify staff can access collections
-- ============================================
SELECT 
    'Staff can access collections' as test,
    COUNT(*) as result
FROM collections;

-- ============================================
-- 5. Verify staff can access milk approvals
-- ============================================
SELECT 
    'Staff can access milk approvals' as test,
    COUNT(*) as result
FROM milk_approvals;

-- ============================================
-- 6. Verify staff can access collector performance
-- ============================================
SELECT 
    'Staff can access collector performance' as test,
    COUNT(*) as result
FROM collector_performance;

-- ============================================
-- 7. Test specific queries used in dashboards
-- ============================================

-- Test query for variance reports
SELECT 
    ma.id,
    ma.collection_id,
    ma.company_received_liters,
    c.liters as collected_liters,
    c.staff_id,
    s.user_id as staff_user_id,
    p.full_name as collector_name
FROM milk_approvals ma
JOIN collections c ON ma.collection_id = c.id
JOIN staff s ON c.staff_id = s.id
JOIN profiles p ON s.user_id = p.id
LIMIT 5;

-- Test query for batch approval form
SELECT 
    s.id,
    s.user_id,
    p.full_name
FROM staff s
JOIN user_roles ur ON s.user_id = ur.user_id
JOIN profiles p ON s.user_id = p.id
WHERE ur.role = 'collector' 
AND ur.active = true
ORDER BY p.full_name
LIMIT 10;

-- Test query for performance dashboard
SELECT 
    cp.*,
    s.user_id,
    p.full_name as collector_name
FROM collector_performance cp
JOIN staff s ON cp.staff_id = s.id
JOIN profiles p ON s.user_id = p.id
ORDER BY cp.performance_score DESC
LIMIT 5;

-- ============================================
-- 8. Check RLS policies
-- ============================================
SELECT 
    polname as policy_name,
    polrelid::regclass as table_name
FROM pg_policy 
WHERE polname IN (
    'profiles_select_own_or_admin_or_staff',
    'staff_select_by_staff',
    'farmers_select_by_staff',
    'collections_select_by_staff',
    'milk_approvals_select_by_staff'
)
ORDER BY polname;

-- ============================================
-- 9. Summary
-- ============================================
SELECT 
    'All tests completed' as summary,
    'Check results above to verify all access is working' as note;