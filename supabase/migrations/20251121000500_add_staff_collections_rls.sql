-- Migration: 20251121000500_add_staff_collections_rls.sql
-- Description: Add RLS policies to allow staff users to access collections for approval purposes
-- This fixes the issue where staff dashboard shows 0 pending reviews because staff users
-- cannot access collections that need approval

BEGIN;

-- Create policy allowing staff users to select collections for approval
CREATE POLICY "collections_select_by_staff" 
  ON public.collections 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
  );

-- Create policy allowing staff users to update collections for approval
CREATE POLICY "collections_update_by_staff" 
  ON public.collections 
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
SELECT polname FROM pg_policy WHERE polname LIKE '%collections%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the policies
DROP POLICY IF EXISTS "collections_select_by_staff" ON public.collections;
DROP POLICY IF EXISTS "collections_update_by_staff" ON public.collections;

COMMIT;
*/