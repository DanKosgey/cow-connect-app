-- Test the optimized user role RPC function
-- Replace 'your-user-id-here' with an actual user ID from your database

-- Test the new optimized function
SELECT get_user_role_optimized('your-user-id-here') as optimized_role;

-- Compare with the old function
SELECT get_user_role_secure('your-user-id-here') as secure_role;

-- Test the view directly
SELECT * FROM user_roles_view WHERE user_id = 'your-user-id-here';

-- Check if the index was created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_roles'
  AND indexname LIKE '%user_id_active%';