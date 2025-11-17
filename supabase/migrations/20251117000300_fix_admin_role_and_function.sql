-- Migration: 20251117000300_fix_admin_role_and_function.sql
-- Description: Fix get_user_role_secure function to use proper SECURITY DEFINER without SET ROLE
-- This migration addresses the "permission denied to set role 'admin'" error

BEGIN;

-- 1. Drop the broken function
DROP FUNCTION IF EXISTS get_user_role_secure(uuid);

-- 2. Create a clean SECURITY DEFINER version that bypasses RLS completely
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

-- 3. Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role_secure(UUID) TO authenticated;

-- 4. Ensure RLS is enabled on user_roles table
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create a simple RLS policy that allows users to read their own roles
-- This fixes the fallback query when the function fails
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Also create a policy that allows the secure function to work (bypasses RLS)
CREATE POLICY "Allow secure function access"
ON public.user_roles
FOR SELECT
USING (true);

-- 6. Grant necessary permissions
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 7. Ensure the admin user has the correct role entry
-- First, check if the admin user exists in auth.users
DO $$
DECLARE
  admin_user_id UUID := 'eec68d01-fb71-4381-b06d-ffb593b3f21e';
  admin_exists BOOLEAN;
  role_exists BOOLEAN;
BEGIN
  -- Check if the admin user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = admin_user_id
  ) INTO admin_exists;
  
  IF admin_exists THEN
    -- Check if the user has an active admin role
    SELECT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = admin_user_id 
      AND role = 'admin' 
      AND active = true
    ) INTO role_exists;
    
    IF NOT role_exists THEN
      -- Insert the missing admin role for the user
      INSERT INTO user_roles (user_id, role, active)
      VALUES (admin_user_id, 'admin', true)
      ON CONFLICT (user_id, role) DO UPDATE
      SET active = true;
      
      RAISE NOTICE 'Created missing admin role entry for user %', admin_user_id;
    ELSE
      RAISE NOTICE 'Admin user already has active admin role';
    END IF;
  ELSE
    RAISE NOTICE 'Admin user does not exist in auth.users';
  END IF;
END $$;

COMMIT;