-- Migration: 20251013220000_fix_invitations_policies.sql
-- Description: Fix ambiguous column reference in invitations table policies
-- Rollback: No rollback needed as this fixes an existing issue

BEGIN;

-- Drop existing policies that have ambiguous column references
DROP POLICY IF EXISTS "Invitations are viewable by invited admins" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete their invitations" ON public.invitations;

-- Recreate policies with proper column references
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

COMMIT;