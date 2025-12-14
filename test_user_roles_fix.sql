-- Test Script: test_user_roles_fix.sql
-- Description: Test script to verify that the user_roles recursion fix works correctly

-- Test 1: Check that policies were created correctly
SELECT polname FROM pg_policy WHERE polrelid = 'user_roles'::regclass;

-- Test 2: Check that an admin user can access user_roles (replace 'your-admin-user-id' with actual admin user ID)
-- SELECT * FROM user_roles WHERE user_id = 'your-admin-user-id' LIMIT 5;

-- Test 3: Check that a regular user can only see their own role (replace 'your-user-id' with actual user ID)
-- SELECT * FROM user_roles WHERE user_id = 'your-user-id';

-- Test 4: Check that the get_user_role_secure function works correctly (replace 'your-user-id' with actual user ID)
-- SELECT public.get_user_role_secure('your-user-id') as user_role;

-- Test 5: Check that the farmers table is accessible (as a way to test that recursion is fixed)
-- SELECT COUNT(*) as farmers_count FROM farmers LIMIT 1;

-- Test 6: Check that the staff table is accessible (as a way to test that recursion is fixed)
-- SELECT COUNT(*) as staff_count FROM staff LIMIT 1;