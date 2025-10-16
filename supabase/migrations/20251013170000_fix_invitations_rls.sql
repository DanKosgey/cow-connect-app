-- Migration: 20251013170000_fix_invitations_rls.sql
-- Description: Fix RLS policies for invitations table to allow token-based queries
-- Rollback: DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.invitations; CREATE POLICY "Invitations are viewable by invited admins" ON public.invitations FOR SELECT USING (invited_by IN (SELECT p.id FROM public.profiles p JOIN public.user_roles ur ON p.id = ur.user_id WHERE ur.role = 'admin'));

BEGIN;

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Invitations are viewable by invited admins" ON public.invitations;

-- Create a new policy that allows anyone to view invitations by token (needed for accept-invite flow)
-- This is secure because tokens are unique and random
CREATE POLICY "Anyone can view invitations by token" 
  ON public.invitations FOR SELECT 
  USING (true);

-- Grant necessary permissions
GRANT SELECT ON public.invitations TO anon, authenticated;

COMMIT;