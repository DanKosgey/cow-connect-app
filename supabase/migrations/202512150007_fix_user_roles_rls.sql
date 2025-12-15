-- Migration: 202512150007_fix_user_roles_rls.sql
-- Description: Fix RLS policies for user_roles table to allow proper role assignment
-- This fixes the issue where the application was failing to auto-assign roles due to RLS policy violations

BEGIN;

-- Ensure RLS is enabled on user_roles table
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage user roles" ON public.user_roles;

-- Create comprehensive policies for user_roles table

-- 1. Allow users to insert their own role assignments
-- This is needed during signup/auto-assignment
CREATE POLICY "Users can insert their own roles" 
  ON public.user_roles FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- 2. Allow users to view their own roles
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles FOR SELECT 
  USING (user_id = auth.uid());

-- 3. Allow users to update their own roles (for completeness)
CREATE POLICY "Users can update their own roles" 
  ON public.user_roles FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Allow users to delete their own roles (for completeness)
CREATE POLICY "Users can delete their own roles" 
  ON public.user_roles FOR DELETE 
  USING (user_id = auth.uid());

-- 5. Allow service role to manage user roles (needed for invitation flow and backend operations)
CREATE POLICY "Service role can manage user roles" 
  ON public.user_roles FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that all policies were created
SELECT polname, polrelid::regclass, polcmd, polroles, polqual, polwithcheck
FROM pg_policy
WHERE polrelid = 'user_roles'::regclass
ORDER BY polname;

-- Test inserting a role for the current user (should work after applying this migration)
-- INSERT INTO public.user_roles (user_id, role, active)
-- VALUES (auth.uid(), 'staff', true);