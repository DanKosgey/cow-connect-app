BEGIN;

-- 1. Redefine the function to be strictly non-recursive via SECURITY DEFINER
-- This is critical: SECURITY DEFINER makes it run with the owner's permissions (postgres),
-- bypassing RLS on the user_roles table, preventing the infinite loop.
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_id uuid)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  _role text;
BEGIN
  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = $1
  LIMIT 1;
  
  RETURN _role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role_secure(uuid) TO authenticated;

-- 2. Drop problem policies on user_roles
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "User roles are viewable by users who created them" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view user roles for staff management" ON public.user_roles;

-- 3. Create the simplified, non-recursive policy for user_roles
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  public.get_user_role_secure(auth.uid()) = 'admin'
  OR
  auth.uid() = user_id
);

-- 4. Fix Farmers policies (using the secure function)
DROP POLICY IF EXISTS "farmers_admin_all" ON farmers;
DROP POLICY IF EXISTS "farmers_read_own" ON farmers;

CREATE POLICY "farmers_admin_all" ON farmers FOR ALL TO authenticated USING (
    public.get_user_role_secure(auth.uid()) = 'admin'
);
CREATE POLICY "farmers_read_own" ON farmers FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.get_user_role_secure(auth.uid()) = 'admin'
);

-- 5. Fix Staff policies (using the secure function)
DROP POLICY IF EXISTS "staff_admin_all" ON staff;
DROP POLICY IF EXISTS "staff_read_own" ON staff;

CREATE POLICY "staff_admin_all" ON staff FOR ALL TO authenticated USING (
    public.get_user_role_secure(auth.uid()) = 'admin'
);
CREATE POLICY "staff_read_own" ON staff FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.get_user_role_secure(auth.uid()) = 'admin'
);

COMMIT;
