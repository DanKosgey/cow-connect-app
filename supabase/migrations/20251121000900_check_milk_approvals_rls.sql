-- Migration: 20251121000900_check_milk_approvals_rls.sql
-- Description: Check and fix RLS policies for milk_approvals table
-- This ensures proper access control for all user roles

BEGIN;

-- Enable RLS on milk_approvals table if not already enabled
ALTER TABLE IF EXISTS public.milk_approvals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can read milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Admins can insert milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Admins can update milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Admins can delete milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can read milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can insert milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can update milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Collectors can read their milk_approvals" ON public.milk_approvals;

-- Create comprehensive policies for milk_approvals table

-- Allow admins full access
CREATE POLICY "Admins can read milk_approvals" 
  ON public.milk_approvals FOR SELECT 
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert milk_approvals" 
  ON public.milk_approvals FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update milk_approvals" 
  ON public.milk_approvals FOR UPDATE 
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete milk_approvals" 
  ON public.milk_approvals FOR DELETE 
  TO authenticated
  USING (public.is_admin());

-- Allow staff users to access milk approvals
CREATE POLICY "Staff can read milk_approvals" 
  ON public.milk_approvals FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
  );

CREATE POLICY "Staff can insert milk_approvals" 
  ON public.milk_approvals FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
  );

CREATE POLICY "Staff can update milk_approvals" 
  ON public.milk_approvals FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
  );

-- Allow collectors to read their own milk approvals (for transparency)
CREATE POLICY "Collectors can read their milk_approvals" 
  ON public.milk_approvals FOR SELECT 
  TO authenticated
  USING (
    staff_id IN (
      SELECT s.id FROM public.staff s
      JOIN public.user_roles ur ON s.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'collector'
      AND ur.active = true
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milk_approvals TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname, relname 
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'milk_approvals'
ORDER BY polname;

-- Check that milk_approvals table has proper grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'milk_approvals';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop all policies
DROP POLICY IF EXISTS "Admins can read milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Admins can insert milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Admins can update milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Admins can delete milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can read milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can insert milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can update milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Collectors can read their milk_approvals" ON public.milk_approvals;

COMMIT;
*/