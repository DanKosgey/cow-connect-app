-- Migration: 20251117000200_consolidate_user_roles_policies.sql
-- Description: Consolidate and fix user_roles table RLS policies to prevent conflicts
-- This migration ensures all necessary policies are in place without conflicts

BEGIN;

-- Ensure RLS is enabled on user_roles table
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to prevent conflicts
-- This is a clean slate approach to avoid policy conflicts
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

-- Create comprehensive policies for user_roles table

-- 1. Allow users to insert their own role assignments (needed during invitation acceptance)
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
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

COMMIT;