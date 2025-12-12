-- Migration: 20251212001000_fix_invitations_rls_policies.sql
-- Description: Fix RLS policies for invitations table to avoid recursion
-- This fixes the issue where invitations RLS policies were causing recursion by checking user_roles table directly

BEGIN;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete their invitations" ON public.invitations;

-- Create new policies using the secure function to avoid recursion
-- For invitations, we need to check if the current user is an admin
-- We'll use a simpler approach that avoids direct user_roles queries
CREATE POLICY "Admins can create invitations" 
  ON public.invitations FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'admin'
    )
  );

CREATE POLICY "Admins can update their invitations" 
  ON public.invitations FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'admin'
    )
  );

CREATE POLICY "Admins can delete their invitations" 
  ON public.invitations FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'admin'
    )
  );

-- Ensure proper permissions
GRANT ALL ON public.invitations TO authenticated;

COMMIT;

-- Verification queries
-- Check that the policies were created
SELECT polname FROM pg_policy WHERE polrelid = 'invitations'::regclass;