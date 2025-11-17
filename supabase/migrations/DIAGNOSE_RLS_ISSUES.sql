-- Diagnostic Script: DIAGNOSE_RLS_ISSUES.sql
-- Description: Diagnose current RLS policies and function issues

-- 1. Check if is_admin function exists
SELECT proname, provolatile, prosecdef 
FROM pg_proc 
WHERE proname = 'is_admin';

-- 2. Test the is_admin function if it exists
SELECT public.is_admin() as is_current_user_admin;

-- 3. Check current user info
SELECT auth.uid() as current_user_id, auth.role() as current_role;

-- 4. Check user roles for current user
SELECT user_id, role, active 
FROM user_roles 
WHERE user_id = auth.uid();

-- 5. Check RLS policies on collections table
SELECT polname, polpermissive, polroles, polcmd, polqual, polwithcheck
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'collections'
ORDER BY polname;

-- 6. Check RLS policies on pending_farmers table
SELECT polname, polpermissive, polroles, polcmd, polqual, polwithcheck
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'pending_farmers'
ORDER BY polname;

-- 7. Check if RLS is enabled on tables
SELECT relname as tablename, relrowsecurity as rls_enabled
FROM pg_class c 
JOIN pg_namespace n ON n.oid = c.relnamespace 
WHERE n.nspname = 'public' 
AND relname IN ('collections', 'farmers', 'staff', 'pending_farmers');

-- 8. Try to count records in collections (should work if admin)
SELECT COUNT(*) as collections_count FROM collections;

-- 9. Try to count records in pending_farmers (should work if admin)
SELECT COUNT(*) as pending_farmers_count FROM pending_farmers;

-- 10. Check function permissions
SELECT grantee, routine_name, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'is_admin';

-- 11. Check table permissions
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('collections', 'farmers', 'staff', 'pending_farmers')
AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;