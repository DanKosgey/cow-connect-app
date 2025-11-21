-- Migration: 20251121000800_add_staff_farmers_rls.sql
-- Description: Add RLS policies to ensure staff users can access farmers table
-- This ensures staff users can view farmer information for approval purposes

BEGIN;

-- Create policy allowing staff users to select farmers
CREATE POLICY "farmers_select_by_staff" 
  ON public.farmers 
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
SELECT polname FROM pg_policy WHERE polname LIKE '%farmers%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the policies
DROP POLICY IF EXISTS "farmers_select_by_staff" ON public.farmers;

COMMIT;
*/