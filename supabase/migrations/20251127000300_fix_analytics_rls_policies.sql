-- Migration: 20251127000300_fix_analytics_rls_policies.sql
-- Description: Fix RLS policies to ensure staff users can access all data needed for analytics and reporting
-- This ensures staff users can view collector performance, variance reports, and other analytics

BEGIN;

-- Fix policy for accessing staff information in analytics
DROP POLICY IF EXISTS "staff_select_by_staff" ON public.staff;
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

-- Fix policy for accessing farmer information in analytics
DROP POLICY IF EXISTS "farmers_select_by_staff" ON public.farmers;
CREATE POLICY "farmers_select_by_staff" 
  ON public.farmers 
  FOR SELECT 
  USING (
    -- Allow staff users to access all farmer records
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
    OR
    -- Allow collectors to access farmers they've collected from
    id IN (
      SELECT DISTINCT farmer_id 
      FROM public.collections 
      WHERE staff_id IN (
        SELECT id FROM public.staff WHERE user_id = auth.uid()
      )
    )
    OR
    -- Allow farmers to access their own record
    user_id = auth.uid()
  );

-- Fix policy for accessing collections in analytics
DROP POLICY IF EXISTS "collections_select_by_staff" ON public.collections;
CREATE POLICY "collections_select_by_staff" 
  ON public.collections 
  FOR SELECT 
  USING (
    -- Allow staff users to access all collections
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
    OR
    -- Allow collectors to access their own collections
    staff_id IN (
      SELECT id FROM public.staff WHERE user_id = auth.uid()
    )
    OR
    -- Allow farmers to access their own collections
    farmer_id IN (
      SELECT id FROM public.farmers WHERE user_id = auth.uid()
    )
  );

-- Fix policy for accessing milk approvals in analytics
DROP POLICY IF EXISTS "milk_approvals_select_by_staff" ON public.milk_approvals;
CREATE POLICY "milk_approvals_select_by_staff" 
  ON public.milk_approvals 
  FOR SELECT 
  USING (
    -- Allow staff users to access all approvals
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff'
      AND ur.active = true
    )
    OR
    -- Allow collectors to access approvals for their collections
    collection_id IN (
      SELECT id FROM public.collections 
      WHERE staff_id IN (
        SELECT id FROM public.staff WHERE user_id = auth.uid()
      )
    )
    OR
    -- Allow farmers to access approvals for their collections
    collection_id IN (
      SELECT id FROM public.collections 
      WHERE farmer_id IN (
        SELECT id FROM public.farmers WHERE user_id = auth.uid()
      )
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname, polrelid::regclass FROM pg_policy 
WHERE polname IN ('staff_select_by_staff', 'farmers_select_by_staff', 'collections_select_by_staff', 'milk_approvals_select_by_staff');

-- Test queries that should now work for staff users:
-- SELECT COUNT(*) FROM staff;
-- SELECT COUNT(*) FROM farmers;
-- SELECT COUNT(*) FROM collections;
-- SELECT COUNT(*) FROM milk_approvals;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Revert to previous policies
DROP POLICY IF EXISTS "staff_select_by_staff" ON public.staff;
DROP POLICY IF EXISTS "farmers_select_by_staff" ON public.farmers;
DROP POLICY IF EXISTS "collections_select_by_staff" ON public.collections;
DROP POLICY IF EXISTS "milk_approvals_select_by_staff" ON public.milk_approvals;

-- Recreate original policies (you'll need to replace with actual original policies)
-- CREATE POLICY "staff_select_by_staff" ON public.staff FOR SELECT USING (...);
-- CREATE POLICY "farmers_select_by_staff" ON public.farmers FOR SELECT USING (...);
-- CREATE POLICY "collections_select_by_staff" ON public.collections FOR SELECT USING (...);
-- CREATE POLICY "milk_approvals_select_by_staff" ON public.milk_approvals FOR SELECT USING (...);

COMMIT;
*/