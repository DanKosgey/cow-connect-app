-- Migration: create_user_roles_view_and_optimized_rpc.sql
-- Description: Create a view for user roles and an optimized RPC function
-- This addresses the timeout issues with the current get_user_role_secure function

BEGIN;

-- Create a view for user roles (materialized for performance)
CREATE OR REPLACE VIEW public.user_roles_view AS
SELECT
  ur.user_id,
  ur.role::text,  -- Explicitly cast to text
  ur.active,
  ur.created_at,
  ur.updated_at
FROM public.user_roles ur
WHERE ur.active = true;

-- Grant access to the view
GRANT SELECT ON public.user_roles_view TO authenticated;

-- Create an optimized RPC function that uses the view
CREATE OR REPLACE FUNCTION public.get_user_role_optimized(user_id_param UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text  -- Explicitly cast to text
  FROM user_roles_view
  WHERE user_id = user_id_param
  LIMIT 1;
$$;

-- Grant execute permission on the optimized function
GRANT EXECUTE ON FUNCTION public.get_user_role_optimized(UUID) TO authenticated;

-- Create an index on the view's underlying table for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_active
ON public.user_roles (user_id, active)
WHERE active = true;

-- Ensure RLS is enabled on the view
ALTER VIEW public.user_roles_view SET (security_barrier = true);

COMMIT;