-- 2025-10-04: Replace user_roles policy subselects with calls to is_user_admin to avoid recursion

-- Recreate SELECT policy
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_own_or_admin ON public.user_roles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_user_admin(auth.uid()::uuid)
  );

-- Recreate INSERT policy
DROP POLICY IF EXISTS user_roles_insert_self_or_admin ON public.user_roles;
CREATE POLICY user_roles_insert_self_or_admin ON public.user_roles
  FOR INSERT
  WITH CHECK (
    (
      user_id = auth.uid()
      AND role = 'farmer'
    )
    OR public.is_user_admin(auth.uid()::uuid)
  );

-- Recreate UPDATE policy
DROP POLICY IF EXISTS user_roles_update_admin_only ON public.user_roles;
CREATE POLICY user_roles_update_admin_only ON public.user_roles
  FOR UPDATE
  USING (
    public.is_user_admin(auth.uid()::uuid)
  )
  WITH CHECK (
    public.is_user_admin(auth.uid()::uuid)
  );

-- Recreate DELETE policy
DROP POLICY IF EXISTS user_roles_delete_admin_only ON public.user_roles;
CREATE POLICY user_roles_delete_admin_only ON public.user_roles
  FOR DELETE
  USING (
    public.is_user_admin(auth.uid()::uuid)
  );
