-- Migration: 20251212001300_fix_staff_rls_policies.sql
-- Description: Fix RLS policies for staff table to avoid recursion
-- This fixes the issue where staff RLS policies were causing recursion by checking user_roles table directly

BEGIN;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "staff_select_own_by_collectors" ON public.staff;

-- Create new policies using the secure function to avoid recursion
CREATE POLICY "staff_select_own_by_collectors" 
  ON public.staff 
  FOR SELECT 
  USING (
    user_id = auth.uid()
    AND public.get_user_role_secure(auth.uid()) = 'collector'
  );

-- Ensure proper permissions
GRANT SELECT ON public.staff TO authenticated;

COMMIT;

-- Verification queries
-- Check that the policies were created
SELECT polname FROM pg_policy WHERE polrelid = 'staff'::regclass;