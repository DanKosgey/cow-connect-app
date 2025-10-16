-- Test queries to verify the correct approach for fetching staff with user roles
-- This approach works because it uses the actual database relationships

-- Query 1: Fetch staff with profile information (uses the foreign key relationship)
SELECT 
  s.id, 
  s.employee_id, 
  s.user_id,
  p.full_name, 
  p.email
FROM staff s
LEFT JOIN profiles p ON s.user_id = p.id
ORDER BY s.created_at DESC
LIMIT 10;

-- Query 2: Fetch user roles for specific user IDs (separate query)
-- In the application, we would get the user IDs from the first query result
SELECT 
  user_id, 
  role, 
  active
FROM user_roles
WHERE user_id IN (
  -- These would be the user IDs from the staff query
  'user_id_1', 
  'user_id_2', 
  'user_id_3'
);

-- Combined approach (what our application now does):
-- 1. Execute first query to get staff data
-- 2. Extract user IDs from the results
-- 3. Execute second query with those user IDs
-- 4. Combine the results in application code

-- This approach is correct because:
-- 1. staff.user_id references profiles.id (direct relationship)
-- 2. user_roles.user_id references profiles.id (direct relationship)
-- 3. But staff and user_roles don't have a direct relationship