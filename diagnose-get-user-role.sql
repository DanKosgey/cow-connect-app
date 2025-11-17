-- ============================================================
-- COW CONNECT APP - USER ROLE SYSTEM DIAGNOSTIC
-- Run this in your Supabase SQL Editor to diagnose user role issues
-- ============================================================

-- 1. Available User Roles
SELECT 
  'Available User Roles' as check_category,
  string_agg(enumlabel, ', ' ORDER BY enumsortorder) as details
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role_enum';

-- 2. Function Status
SELECT 
  'get_user_role_secure Function' as check_category,
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE p.proname = 'get_user_role_secure' AND n.nspname = 'public'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as details;

-- 3. RLS Configuration
SELECT 
  'RLS Status' as check_category,
  CASE 
    WHEN relrowsecurity THEN 'ENABLED'
    ELSE 'DISABLED'
  END as details
FROM pg_class 
WHERE relname = 'user_roles';

-- 4. Function Test
SELECT 
  'Function Test Result' as check_category,
  COALESCE(
    public.get_user_role_secure((SELECT id FROM auth.users LIMIT 1)), 
    'NO USERS FOUND OR FUNCTION ERROR'
  ) as details;

-- 5. Role Distribution
SELECT 
  'Active Role Distribution' as check_category,
  role || ': ' || COUNT(*) as details
FROM user_roles 
WHERE active = true 
GROUP BY role 
ORDER BY COUNT(*) DESC;

-- 6. Users Without Roles
SELECT 
  'Users Without Active Roles' as check_category,
  COUNT(*)::text as details
FROM auth.users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.active = true 
WHERE ur.user_id IS NULL;

-- 7. Sample User Data
SELECT 
  'Sample User Roles' as check_category,
  u.email || ' -> ' || COALESCE(ur.role, 'NO ROLE') as details
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.active = true
LIMIT 5;

-- 8. Users with Multiple Active Roles
SELECT 
  'Users with Multiple Active Roles' as check_category,
  user_id,
  COUNT(*) AS role_count
FROM user_roles
WHERE active = true
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 9. Profile and Auth User Relationship
SELECT 
  'Profiles without auth users' AS check_category,
  COUNT(*) AS details
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL

UNION ALL

SELECT 
  'Auth users without profiles' AS check_category,
  COUNT(*) AS details
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

\echo ''
\echo '==========================================='
\echo 'DIAGNOSTIC COMPLETE'
\echo '==========================================='