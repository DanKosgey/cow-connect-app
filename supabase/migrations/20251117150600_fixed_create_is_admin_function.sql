-- Migration: 20251117150600_fixed_create_is_admin_function.sql
-- Description: Fixed create is_admin function for RLS policy checks
-- This function can be used in RLS policies to check if the current user is an admin

BEGIN;

-- First drop any existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.is_admin();

-- Create the is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin' 
      AND ur.active = true
  );
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMIT;

-- Verification query
-- Check that function exists
SELECT proname, provolatile, prosecdef 
FROM pg_proc 
WHERE proname = 'is_admin';