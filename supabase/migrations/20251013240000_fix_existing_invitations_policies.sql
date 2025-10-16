-- Migration: 20251013240000_fix_existing_invitations_policies.sql
-- Description: Fix existing invitations table policies that have ambiguous column references
-- This migration only drops and recreates policies that have issues, without affecting working policies

BEGIN;

-- Drop only the policies that have ambiguous column references
-- We need to be careful to only drop policies that actually exist and have the issue

-- First, try to drop the policies that are causing issues
DROP POLICY IF EXISTS "Invitations are viewable by invited admins" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete their invitations" ON public.invitations;

-- Recreate policies with proper column references
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

COMMIT;