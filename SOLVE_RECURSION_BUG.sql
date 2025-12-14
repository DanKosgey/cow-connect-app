/*
URGENT FIX FOR INFINITE RECURSION ERROR ("user_roles" policy)

Currently, your application is crashing/looping because of a "recursion" error in the database security policies.
Your local migration files have not been applied because of conflicts with older migrations (e.g., 'Agrovet staff' policies already existing).

To fix the dashboard IMMEDIATELY, please:
1. Go to your Supabase Dashboard (https://supabase.com/dashboard/project/oevxapmcmcaxpaluehyg)
2. Go to the SQL Editor.
3. Paste the following SQL code and run it.
*/

BEGIN;

--------------------------------------------------------------------------------
-- 1. FIX THE SECURE FUNCTION (Ensure it bypasses RLS)
--------------------------------------------------------------------------------
-- DROP the function first because changing parameter names in CREATE OR REPLACE is not allowed.
DROP FUNCTION IF EXISTS public.get_user_role_secure(uuid);

-- We redefine this function with SECURITY DEFINER so it runs as the system (postgres),
-- avoiding the infinite loop when it queries the user_roles table.
CREATE OR REPLACE FUNCTION public.get_user_role_secure(p_user_id uuid)
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
  WHERE public.user_roles.user_id = p_user_id
  LIMIT 1;
  
  RETURN _role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role_secure(uuid) TO authenticated;

--------------------------------------------------------------------------------
-- 2. FIX THE POLICIES
--------------------------------------------------------------------------------

-- Fix User Roles table policies
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "User roles are viewable by users who created them" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view user roles for staff management" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view user roles" ON public.user_roles;

CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  public.get_user_role_secure(auth.uid()) = 'admin'
  OR
  auth.uid() = public.user_roles.user_id
);

-- Fix Farmers policies
DROP POLICY IF EXISTS "farmers_admin_all" ON farmers;
DROP POLICY IF EXISTS "farmers_read_own" ON farmers;

CREATE POLICY "farmers_admin_all" ON farmers FOR ALL TO authenticated USING (
    public.get_user_role_secure(auth.uid()) = 'admin'
);
CREATE POLICY "farmers_read_own" ON farmers FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.get_user_role_secure(auth.uid()) = 'admin'
);

-- Fix Staff policies
DROP POLICY IF EXISTS "staff_admin_all" ON staff;
DROP POLICY IF EXISTS "staff_read_own" ON staff;

CREATE POLICY "staff_admin_all" ON staff FOR ALL TO authenticated USING (
    public.get_user_role_secure(auth.uid()) = 'admin'
);
CREATE POLICY "staff_read_own" ON staff FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.get_user_role_secure(auth.uid()) = 'admin'
);

COMMIT;
