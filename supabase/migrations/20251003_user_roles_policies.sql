-- 2025-10-03: Add RLS policies for user_roles
-- Safe, non-destructive policies to prevent client-side role escalation.
-- Notes: This migration creates RLS policies only. Do NOT add unique constraints
-- in the same migration because existing duplicates may prevent migration from
-- being applied. Run the cleanup script in supabase/scripts/cleanup_duplicates.sql
-- before adding unique constraints.

-- Enable RLS on user_roles (idempotent if already enabled)
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to SELECT their own role, and admins to SELECT all
CREATE POLICY IF NOT EXISTS user_roles_select_own_or_admin ON public.user_roles
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow INSERT: users may insert their own user_roles only for 'farmer'; admin may insert any
CREATE POLICY IF NOT EXISTS user_roles_insert_self_or_admin ON public.user_roles
  FOR INSERT
  WITH CHECK (
    (
      user_id = auth.uid()
      AND role = 'farmer'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow UPDATE only by admins (prevent users from escalating their role)
CREATE POLICY IF NOT EXISTS user_roles_update_admin_only ON public.user_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow DELETE only by admins
CREATE POLICY IF NOT EXISTS user_roles_delete_admin_only ON public.user_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Optional: later add unique constraint on user_id after cleaning duplicates
-- ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
