-- Migration: 99990004_fix_function_security_definer.sql
-- Description: Standardize function security definers and permissions
-- This migration ensures all security definer functions are properly implemented

BEGIN;

-- Fix get_user_role_secure function to use proper SECURITY DEFINER without SET ROLE
-- Drop the potentially problematic function
DROP FUNCTION IF EXISTS get_user_role_secure(uuid);

-- Create a clean SECURITY DEFINER version that bypasses RLS completely
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

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role_secure(UUID) TO authenticated;

-- Ensure RLS is enabled on user_roles table
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies for user_roles table
-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Allow secure function access" ON public.user_roles;

-- Allow users to read their own roles
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow the secure function to work (bypasses RLS)
CREATE POLICY "Allow secure function access"
ON public.user_roles
FOR SELECT
USING (true);

-- Grant necessary permissions
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

COMMIT;

-- Verification queries
-- Check that the function exists
SELECT proname, provolatile, prosecuritydefiner FROM pg_proc WHERE proname = 'get_user_role_secure';

-- Check that policies exist
SELECT polname FROM pg_policy WHERE polrelid = 'user_roles'::regclass;