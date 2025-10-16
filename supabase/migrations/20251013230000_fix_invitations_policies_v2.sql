-- Migration: 20251013230000_fix_invitations_policies_v2.sql
-- Description: Fix all invitations table policies by dropping and recreating them properly
-- Rollback: No rollback needed as this fixes existing issues

BEGIN;

-- Drop all existing policies on invitations table
DROP POLICY IF EXISTS "Invitations are viewable by invited admins" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.invitations;

-- Recreate all policies with proper column references
CREATE POLICY "Invitations are viewable by invited admins" 
  ON public.invitations FOR SELECT 
  USING (
    invited_by IN (
      SELECT p.id FROM public.profiles p
      JOIN public.user_roles ur ON p.id = ur.user_id
      WHERE ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can create invitations" 
  ON public.invitations FOR INSERT 
  WITH CHECK (
    invited_by IN (
      SELECT p.id FROM public.profiles p
      JOIN public.user_roles ur ON p.id = ur.user_id
      WHERE ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can update their invitations" 
  ON public.invitations FOR UPDATE 
  USING (
    invited_by IN (
      SELECT p.id FROM public.profiles p
      JOIN public.user_roles ur ON p.id = ur.user_id
      WHERE ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete their invitations" 
  ON public.invitations FOR DELETE 
  USING (
    invited_by IN (
      SELECT p.id FROM public.profiles p
      JOIN public.user_roles ur ON p.id = ur.user_id
      WHERE ur.role = 'admin'
    )
  );

-- Recreate the token-based policy for accept-invite flow
CREATE POLICY "Anyone can view invitations by token" 
  ON public.invitations FOR SELECT 
  USING (true);

-- Grant necessary permissions
GRANT SELECT ON public.invitations TO anon, authenticated;

COMMIT;