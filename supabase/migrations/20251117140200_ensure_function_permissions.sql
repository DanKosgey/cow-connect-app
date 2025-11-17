-- Migration: 20251117140200_ensure_function_permissions.sql
-- Description: Ensure get_user_role_secure function has proper permissions
-- This migration ensures the function used in RLS policies is properly configured

BEGIN;

-- Ensure the function exists with proper security definer
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

-- Also create a simplified version without parameter for current user
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM user_roles 
  WHERE user_id = auth.uid() 
    AND active = true
  LIMIT 1;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

COMMIT;

-- Verification queries
-- Check that functions exist
SELECT proname, provolatile, prosecdef 
FROM pg_proc 
WHERE proname IN ('get_user_role_secure', 'get_current_user_role');

-- Test the function (this would need to be run with a valid user ID)
-- SELECT get_user_role_secure('eec68d01-fb71-4381-b06d-ffb593b3f21e');