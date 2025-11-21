-- Migration: 20251121000700_add_staff_table_access_for_staff_users.sql
-- Description: Add RLS policies to allow staff users to access staff table
-- This ensures staff users can view collector information for approval purposes

BEGIN;

-- Create policy allowing staff users to select staff records
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

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%staff%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the policies
DROP POLICY IF EXISTS "staff_select_by_staff" ON public.staff;

COMMIT;
*/