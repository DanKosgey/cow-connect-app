-- 2025-10-04: Add helper is_user_admin function as SECURITY DEFINER
-- This function checks whether a given user_id is an admin without invoking RLS policies

CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin' AND active;
  RETURN v_count > 0;
END;
$$;

-- Grant execute to anon/public so RPCs and client-side policies can call this safely
GRANT EXECUTE ON FUNCTION public.is_user_admin(uuid) TO public;
