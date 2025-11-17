-- Test Script: VERIFY_ADMIN_ACCESS.sql
-- Description: Verify that admin users can access all required tables after applying fixes
-- Run this script in Supabase SQL Editor as the admin user to verify access

-- Test 1: Verify admin user exists and has admin role
SELECT u.id, u.email, ur.role, ur.active
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@g.com'
AND ur.role = 'admin' AND ur.active = true;

-- Test 2: Test is_admin function
SELECT public.is_admin() as is_current_user_admin;

-- Test 3: Test get_user_role_secure function
SELECT get_user_role_secure(auth.uid()) as current_user_role;

-- Test 4: Test get_current_user_role function
SELECT get_current_user_role() as current_role;

-- Test 5: Try to select from collections table (should work for admin)
SELECT COUNT(*) as collections_count FROM collections;

-- Test 6: Try to select from farmers table (should work for admin)
SELECT COUNT(*) as farmers_count FROM farmers;

-- Test 7: Try to select from staff table (should work for admin)
SELECT COUNT(*) as staff_count FROM staff;

-- Test 8: Try to select from pending_farmers table (should work for admin)
SELECT COUNT(*) as pending_farmers_count FROM pending_farmers;

-- Test 9: Try to insert a test record into collections (should work for admin)
-- Uncomment the following lines to test insert permissions
-- INSERT INTO collections (collection_id, farmer_id, liters, rate_per_liter, total_amount)
-- VALUES ('test-collection-' || gen_random_uuid(), (SELECT id FROM farmers LIMIT 1), 10.5, 50.0, 525.0);

-- Test 10: Check RLS policies
SELECT polname, relname 
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname IN ('collections', 'farmers', 'staff', 'pending_farmers')
AND polname LIKE '%Admin%'
ORDER BY pc.relname, polname;

-- Test 11: Check function permissions
SELECT proname, provolatile, prosecdef 
FROM pg_proc 
WHERE proname IN ('get_user_role_secure', 'get_current_user_role', 'is_admin');

-- Test 12: Check table permissions
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('collections', 'farmers', 'staff', 'pending_farmers')
AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;