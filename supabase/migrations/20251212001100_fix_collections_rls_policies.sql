-- Migration: 20251212001100_fix_collections_rls_policies.sql
-- Description: Fix RLS policies for collections table to avoid recursion
-- This fixes the issue where collections RLS policies were causing recursion by checking user_roles table directly

BEGIN;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "collections_select_by_collectors" ON public.collections;
DROP POLICY IF EXISTS "collections_insert_by_collectors" ON public.collections;
DROP POLICY IF EXISTS "collections_update_by_collectors" ON public.collections;

-- Create new policies using the secure function to avoid recursion
-- For collections, we need to check if the current user is a collector
CREATE POLICY "collections_select_by_collectors" 
  ON public.collections 
  FOR SELECT 
  USING (
    staff_id IN (
      SELECT s.id FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'collector'
    )
  );

CREATE POLICY "collections_insert_by_collectors" 
  ON public.collections 
  FOR INSERT 
  WITH CHECK (
    staff_id IN (
      SELECT s.id FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'collector'
    )
  );

CREATE POLICY "collections_update_by_collectors" 
  ON public.collections 
  FOR UPDATE 
  USING (
    staff_id IN (
      SELECT s.id FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'collector'
    )
  );

-- Ensure proper permissions
GRANT SELECT, INSERT, UPDATE ON public.collections TO authenticated;

COMMIT;

-- Verification queries
-- Check that the policies were created
SELECT polname FROM pg_policy WHERE polrelid = 'collections'::regclass;