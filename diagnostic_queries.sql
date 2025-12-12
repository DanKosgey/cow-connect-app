-- Diagnostic Queries for Specific Users

-- 1. Check if these users exist in auth.users
SELECT 
  id, 
  email,
  created_at
FROM auth.users 
WHERE id IN (
  'e2198455-c7f2-4613-adb2-90c488f212a2',
  '73c2cc7c-f027-400a-bf74-2c9d5c8d64d6',
  '5aa78ad0-7c81-4b4e-946a-29ba3081b193',
  'eec68d01-fb71-4381-b06d-ffb593b3f21e',
  '5c8ada73-d476-42c5-8ef8-667dc36a4324'
)
ORDER BY email;

-- 2. Check if these users exist in profiles
SELECT 
  id, 
  email,
  created_at
FROM profiles 
WHERE id IN (
  'e2198455-c7f2-4613-adb2-90c488f212a2',
  '73c2cc7c-f027-400a-bf74-2c9d5c8d64d6',
  '5aa78ad0-7c81-4b4e-946a-29ba3081b193',
  'eec68d01-fb71-4381-b06d-ffb593b3f21e',
  '5c8ada73-d476-42c5-8ef8-667dc36a4324'
)
ORDER BY email;

-- 3. Check if these users have roles in user_roles
SELECT 
  ur.user_id,
  p.email,
  ur.role,
  ur.active,
  ur.created_at
FROM user_roles ur
LEFT JOIN profiles p ON ur.user_id = p.id
WHERE ur.user_id IN (
  'e2198455-c7f2-4613-adb2-90c488f212a2',
  '73c2cc7c-f027-400a-bf74-2c9d5c8d64d6',
  '5aa78ad0-7c81-4b4e-946a-29ba3081b193',
  'eec68d01-fb71-4381-b06d-ffb593b3f21e',
  '5c8ada73-d476-42c5-8ef8-667dc36a4324'
)
ORDER BY p.email, ur.role;

-- 4. Check for orphaned user_roles (user_id not in auth.users)
SELECT 
  ur.user_id,
  ur.role,
  ur.active
FROM user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
WHERE au.id IS NULL;

-- 5. Check for auth.users without profiles
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 6. Check for profiles without user_roles
SELECT 
  p.id,
  p.email,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id AND ur.active = true
WHERE ur.user_id IS NULL;

-- 7. Check if handle_new_user function exists
SELECT 
  proname,
  provolatile,
  prosecdefiner
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 8. Check if the trigger exists
SELECT 
  tgname,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 9. Test a direct query to user_roles table for a specific user
-- Replace with an actual user ID that should have a role
SELECT 
  role,
  active,
  created_at
FROM user_roles 
WHERE user_id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e' 
  AND active = true
LIMIT 1;

-- 10. Test auth.uid() function to see if it returns the correct value
-- This would need to be run in a session with a valid user
-- SELECT auth.uid();