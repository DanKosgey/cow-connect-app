-- Test query to verify staff data fetching for Admin Dashboard
-- This query should work without errors

SELECT 
  s.id, 
  s.employee_id, 
  s.user_id,
  p.full_name, 
  p.email
FROM staff s
LEFT JOIN profiles p ON s.user_id = p.id
ORDER BY s.created_at DESC
LIMIT 100;