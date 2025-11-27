-- Migration: 20251127000200_fix_staff_profiles_access.sql
-- Description: Fix RLS policies to allow staff users to access profiles for milk approval purposes
-- This ensures staff users can view collector and farmer profiles for approval purposes

BEGIN;

-- Create or replace the profiles select policy to include staff access
DROP POLICY IF EXISTS "profiles_select_own_or_admin_or_staff" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin_or_staff" ON public.profiles
  FOR SELECT
  USING (
    -- Allow users to access their own profile
    id = auth.uid()
    OR
    -- Allow admin users to access all profiles
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
      AND ur.active = true
    )
    OR
    -- Allow staff users to access all profiles (needed for milk approval)
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname = 'profiles_select_own_or_admin_or_staff';

-- Test query that should now work
-- SELECT * FROM profiles WHERE id IN (SELECT user_id FROM staff LIMIT 5);

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Revert to previous policy
DROP POLICY IF EXISTS "profiles_select_own_or_admin_or_staff" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

COMMIT;
*/