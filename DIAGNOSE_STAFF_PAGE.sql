-- Diagnostic query to understand why staff page is showing incorrect status
-- This replicates the exact queries the frontend is making

-- 1. Get staff data with profiles (similar to what frontend does)
SELECT 
  s.id,
  s.user_id,
  s.employee_id,
  p.full_name,
  p.email
FROM staff s
JOIN profiles p ON s.user_id = p.id
ORDER BY s.created_at DESC
LIMIT 10;

-- 2. Get user roles for these specific staff members
SELECT 
  s.id as staff_id,
  s.user_id,
  p.full_name,
  ur.role,
  ur.active
FROM staff s
JOIN profiles p ON s.user_id = p.id
LEFT JOIN user_roles ur ON s.user_id = ur.user_id
ORDER BY s.created_at DESC, ur.role;

-- 3. Check specifically for the users mentioned in the data
-- collector2 (user_id: 73c2cc7c-f027-400a-bf74-2c9d5c8d64d6)
SELECT 
  'collector2' as user_check,
  ur.role,
  ur.active
FROM user_roles ur
WHERE ur.user_id = '73c2cc7c-f027-400a-bf74-2c9d5c8d64d6';

-- staff2 (user_id: e1119884-4e7a-480e-a6a7-e23fb78a37c8)
SELECT 
  'staff2' as user_check,
  ur.role,
  ur.active
FROM user_roles ur
WHERE ur.user_id = 'e1119884-4e7a-480e-a6a7-e23fb78a37c8';

-- collector1 (user_id: e7709de4-3161-4db3-b94b-fef93878f284)
SELECT 
  'collector1' as user_check,
  ur.role,
  ur.active
FROM user_roles ur
WHERE ur.user_id = 'e7709de4-3161-4db3-b94b-fef93878f284';

-- 4. Check if there are any RLS policies preventing access to user_roles
SELECT 
  polname,
  polrelid::regclass as table_name
FROM pg_policy 
WHERE polname ILIKE '%user_roles%'
ORDER BY polname;

-- 5. Check current user context (would need to be run as the actual user)
-- SELECT auth.uid() as current_user_id;