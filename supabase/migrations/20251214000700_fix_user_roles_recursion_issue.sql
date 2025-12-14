-- Migration: 20251214000700_fix_user_roles_recursion_issue.sql
-- Description: Fix infinite recursion in user_roles RLS policies
-- This fixes the issue where user_roles RLS policies were causing infinite recursion 
-- by checking the user_roles table directly within the same policy

BEGIN;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view user roles for staff management" ON public.user_roles;

-- Create a simplified policy using the secure function to avoid recursion
-- The get_user_role_secure function bypasses RLS and doesn't cause recursion
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  -- Allow admins to see all roles using the secure function
  public.get_user_role_secure(auth.uid()) = 'admin'
  OR
  -- Allow users to see their own roles
  auth.uid() = user_id
);

-- Ensure proper permissions
GRANT SELECT ON public.user_roles TO authenticated;

COMMIT;

-- Verification queries
-- Check that the policies were created
SELECT polname FROM pg_policy WHERE polrelid = 'user_roles'::regclass;

-- Test that an admin user can see roles (replace 'your-admin-user-id' with actual admin user ID)
-- SELECT * FROM user_roles WHERE user_id = 'your-admin-user-id' LIMIT 5;