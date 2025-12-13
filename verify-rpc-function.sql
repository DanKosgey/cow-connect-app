-- Verify the optimized user role RPC function works correctly
-- Replace 'YOUR_USER_ID_HERE' with an actual user ID from your database

-- Test 1: Check if the function exists
SELECT proname, proargnames, prorettype 
FROM pg_proc 
WHERE proname = 'get_user_role_optimized';

-- Test 2: Call the function with a real user ID
-- SELECT get_user_role_optimized('YOUR_USER_ID_HERE'::uuid) as role_result;

-- Test 3: Check the view
-- SELECT * FROM user_roles_view WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;

-- Test 4: Check permissions
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'get_user_role_optimized';

-- Test 5: Check view permissions
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'user_roles_view';

-- Test 6: Verify the index exists
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_roles'
  AND indexname = 'idx_user_roles_user_id_active';