-- Migration: 20251117000100_fix_get_user_role_function.sql
-- Description: Fix get_user_role_secure function and create missing admin role
-- This migration addresses the PostgreSQL role "admin" does not exist error

BEGIN;

-- 1. Create the missing admin role if it doesn't exist
-- This is needed for any functions that might try to SET ROLE admin
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'admin'
    ) THEN
        CREATE ROLE admin;
        RAISE NOTICE 'Created missing admin role';
    ELSE
        RAISE NOTICE 'Admin role already exists';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create admin role: %', SQLERRM;
END $$;

-- 2. Create or replace the get_user_role_secure function with proper implementation
-- This function should not use SET ROLE admin but rely on SECURITY DEFINER instead
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to run with elevated privileges
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Query the user_roles table without switching roles
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = user_id_param AND active = true;
  
  RETURN user_role;
EXCEPTION WHEN OTHERS THEN
  -- Return null if any error occurs
  RAISE NOTICE 'Error in get_user_role_secure: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- 3. Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role_secure(UUID) TO authenticated;

-- 4. Ensure RLS is enabled on user_roles table
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create or replace RLS policies for user_roles table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can read all roles" ON public.user_roles;

-- Allow users to read their own role
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow service role to read all roles (for your function)
CREATE POLICY "Service role can read all roles"
ON public.user_roles
FOR SELECT
TO service_role
USING (true);

-- 6. Grant necessary permissions
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

COMMIT;