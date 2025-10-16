-- Test query to verify the fix for Staff.tsx
-- This query should work without errors

SELECT 
  s.id, 
  s.employee_id, 
  s.user_id,
  p.full_name, 
  p.email,
  ur.user_id as user_role_user_id,
  ur.role,
  ur.active
FROM staff s
LEFT JOIN profiles p ON s.user_id = p.id
LEFT JOIN user_roles ur ON s.user_id = ur.user_id
ORDER BY s.created_at DESC
LIMIT 10;