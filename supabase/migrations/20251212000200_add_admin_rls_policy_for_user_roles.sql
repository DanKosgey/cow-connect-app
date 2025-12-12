-- Migration: 20251212000200_add_admin_rls_policy_for_user_roles.sql
-- Description: Add RLS policy to allow admins to view all user roles
-- This fixes the issue where admins couldn't fetch user roles for authentication

BEGIN;

-- Ensure RLS is enabled on user_roles table
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;

-- Create policy allowing admins to view all user roles
-- FIXED: Simplified to avoid recursion
CREATE POLICY "Admins can view all user roles" 
  ON public.user_roles FOR SELECT 
  USING (
    -- Allow admins to see all roles
    -- Use a simpler approach to avoid recursion
    public.get_user_role_secure(auth.uid()) = 'admin'
  );

-- Make sure the "Users can read own role" policy exists
-- This is needed for regular users to see their own roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'user_roles'::regclass 
    AND polname = 'Users can read own role'
  ) THEN
    CREATE POLICY "Users can read own role"
    ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT ON public.user_roles TO authenticated;

COMMIT;

-- Verification queries
-- Check that the policies were created
SELECT polname FROM pg_policy WHERE polrelid = 'user_roles'::regclass AND polname = 'Admins can view all user roles';

-- Check that an admin user can see roles
-- This would need to be run with a valid admin user ID
-- SELECT * FROM user_roles WHERE user_id = 'your-admin-user-id' LIMIT 5;