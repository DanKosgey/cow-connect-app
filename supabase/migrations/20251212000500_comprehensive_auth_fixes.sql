-- Migration: 20251212000500_comprehensive_auth_fixes.sql
-- Description: Comprehensive fixes for authentication issues
-- This addresses RLS policies, missing indexes, and function permissions

BEGIN;

-- 1. Ensure RLS is enabled on user_roles table
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Allow secure function access" ON public.user_roles;

-- 3. Create comprehensive RLS policies for user_roles table

-- Allow users to read their own roles
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow admins to view all user roles
-- FIXED: Simplified policy to avoid recursion
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (
  -- Check if current user has admin role using the secure function to avoid recursion
  public.get_user_role_secure(auth.uid()) = 'admin'
);

-- 4. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles (active);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_active ON public.user_roles (user_id, active);

-- 5. Ensure the get_user_role_secure function exists with proper security definer
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_id_param UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER  -- This allows the function to run with elevated privileges
SET search_path = public
AS $$
  SELECT role 
  FROM user_roles 
  WHERE user_id = user_id_param 
    AND active = true
  LIMIT 1;
$$;

-- 6. Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role_secure(UUID) TO authenticated;

-- 7. Ensure proper permissions on user_roles table
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

COMMIT;

-- Verification queries
-- Check that the policies were created
SELECT polname FROM pg_policy WHERE polrelid = 'user_roles'::regclass;

-- Check that the indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'user_roles' AND indexname LIKE 'idx_user_roles%';

-- Check that the function exists
SELECT proname, prosecdefiner FROM pg_proc WHERE proname = 'get_user_role_secure';