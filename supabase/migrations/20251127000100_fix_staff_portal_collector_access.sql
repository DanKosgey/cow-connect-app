-- Migration: 20251127000100_fix_staff_portal_collector_access.sql
-- Description: Fix RLS policies to allow staff users to access all staff records for milk approval purposes
-- This ensures staff users can view collector information for approval purposes

BEGIN;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "staff_select_by_staff" ON public.staff;

-- Create updated policy allowing staff users to select all staff records
-- This is needed for the milk approval portal to show collector names
CREATE POLICY "staff_select_by_staff" 
  ON public.staff 
  FOR SELECT 
  USING (
    -- Allow staff users to access all staff records
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
    OR
    -- Also allow collectors to access their own record
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'collector'
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname = 'staff_select_by_staff';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Revert to previous policy
DROP POLICY IF EXISTS "staff_select_by_staff" ON public.staff;

-- Recreate the original policy
CREATE POLICY "staff_select_by_staff" 
  ON public.staff 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
  );

COMMIT;
*/