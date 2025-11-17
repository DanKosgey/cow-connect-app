-- Migration: 20251114000100_add_collector_farmers_rls.sql
-- Description: Add RLS policies to allow collectors to access farmers data
-- Estimated time: 30 seconds

BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "farmers_select_approved_by_collectors" ON public.farmers;
DROP POLICY IF EXISTS "farmers_select_all_by_admins" ON public.farmers;

-- Create policy allowing collectors to select approved farmers
CREATE POLICY "farmers_select_approved_by_collectors" 
  ON public.farmers 
  FOR SELECT 
  USING (
    kyc_status = 'approved' 
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'collector'
    )
  );

-- Create policy allowing admins to select all farmers
CREATE POLICY "farmers_select_all_by_admins" 
  ON public.farmers 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.farmers TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%farmers%';

-- Check that farmers table has SELECT granted to authenticated
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'farmers' 
AND privilege_type = 'SELECT';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the policies
DROP POLICY IF EXISTS "farmers_select_approved_by_collectors" ON public.farmers;
DROP POLICY IF EXISTS "farmers_select_all_by_admins" ON public.farmers;

COMMIT;
*/