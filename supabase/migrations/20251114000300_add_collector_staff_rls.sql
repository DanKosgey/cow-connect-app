-- Migration: 20251114000300_add_collector_staff_rls.sql
-- Description: Add RLS policies to allow collectors to access their own staff record
-- Estimated time: 30 seconds

BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "staff_select_own_by_collectors" ON public.staff;

-- Create policy allowing collectors to select their own staff record
CREATE POLICY "staff_select_own_by_collectors" 
  ON public.staff 
  FOR SELECT 
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'collector'
    )
  );

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.staff TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%staff%';

-- Check that staff table has SELECT granted to authenticated
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'staff' 
AND privilege_type = 'SELECT';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the policies
DROP POLICY IF EXISTS "staff_select_own_by_collectors" ON public.staff;

COMMIT;
*/