-- Migration: 20251013180000_fix_user_roles_rls.sql
-- Description: Fix RLS policies for user_roles table to allow proper role assignment during invitation acceptance
-- Rollback: ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

BEGIN;

-- Enable RLS on user_roles table if not already enabled
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON public.user_roles;

-- Create policy allowing users to insert their own role assignments (needed during invitation acceptance)
-- This is secure because we only allow inserting roles for the current authenticated user
CREATE POLICY "Users can insert their own roles" 
  ON public.user_roles FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Create policy allowing users to view their own roles
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles FOR SELECT 
  USING (user_id = auth.uid());

-- Create policy allowing users to update their own roles (for completeness)
CREATE POLICY "Users can update their own roles" 
  ON public.user_roles FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policy allowing users to delete their own roles (for completeness)
CREATE POLICY "Users can delete their own roles" 
  ON public.user_roles FOR DELETE 
  USING (user_id = auth.uid());

-- Create policy allowing service role to manage user roles (needed for invitation flow)
-- This allows backend operations to bypass RLS when needed
CREATE POLICY "Service role can manage user roles" 
  ON public.user_roles FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

COMMIT;