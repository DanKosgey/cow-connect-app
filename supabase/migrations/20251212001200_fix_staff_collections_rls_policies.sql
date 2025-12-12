-- Migration: 20251212001200_fix_staff_collections_rls_policies.sql
-- Description: Fix RLS policies for staff collections access to avoid recursion
-- This fixes the issue where staff collections RLS policies were causing recursion by checking user_roles table directly

BEGIN;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "collections_select_by_staff" ON public.collections;
DROP POLICY IF EXISTS "collections_update_by_staff" ON public.collections;

-- Create new policies using the secure function to avoid recursion
CREATE POLICY "collections_select_by_staff" 
  ON public.collections 
  FOR SELECT 
  USING (public.get_user_role_secure(auth.uid()) = 'staff');

CREATE POLICY "collections_update_by_staff" 
  ON public.collections 
  FOR UPDATE 
  USING (public.get_user_role_secure(auth.uid()) = 'staff');

COMMIT;

-- Verification queries
-- Check that the policies were created
SELECT polname FROM pg_policy WHERE polrelid = 'collections'::regclass;