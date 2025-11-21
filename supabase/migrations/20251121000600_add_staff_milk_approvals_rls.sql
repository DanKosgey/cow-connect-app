-- Migration: 20251121000600_add_staff_milk_approvals_rls.sql
-- Description: Add RLS policies to allow staff users to access milk_approvals table
-- This ensures staff users can properly view approval data in the dashboard

BEGIN;

-- Create policy allowing staff users to select milk approvals
CREATE POLICY "milk_approvals_select_by_staff" 
  ON public.milk_approvals 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
  );

-- Create policy allowing staff users to insert milk approvals
CREATE POLICY "milk_approvals_insert_by_staff" 
  ON public.milk_approvals 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
  );

-- Create policy allowing staff users to update milk approvals
CREATE POLICY "milk_approvals_update_by_staff" 
  ON public.milk_approvals 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%milk_approvals%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the policies
DROP POLICY IF EXISTS "milk_approvals_select_by_staff" ON public.milk_approvals;
DROP POLICY IF EXISTS "milk_approvals_insert_by_staff" ON public.milk_approvals;
DROP POLICY IF EXISTS "milk_approvals_update_by_staff" ON public.milk_approvals;

COMMIT;
*/