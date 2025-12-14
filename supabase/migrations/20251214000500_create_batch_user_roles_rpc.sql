-- Migration: Create batch user roles RPC function
-- Description: Create an RPC function to fetch user roles for multiple users in a single call

BEGIN;

-- Create the RPC function
CREATE OR REPLACE FUNCTION public.get_user_roles_batch(user_ids UUID[])
RETURNS TABLE(user_id UUID, role TEXT, active BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id, ur.role, ur.active
  FROM public.user_roles ur
  WHERE ur.user_id = ANY(user_ids)
    AND ur.role IN ('staff', 'admin', 'collector', 'creditor');
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_roles_batch(UUID[]) TO authenticated;

COMMIT;

-- Verification query
-- SELECT * FROM get_user_roles_batch(ARRAY['user-id-1'::UUID, 'user-id-2'::UUID]);