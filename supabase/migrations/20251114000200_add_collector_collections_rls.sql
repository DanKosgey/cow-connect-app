-- Migration: 20251114000200_add_collector_collections_rls.sql
-- Description: Add RLS policies to allow collectors to access their own collections
-- Estimated time: 30 seconds

BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "collections_select_by_collectors" ON public.collections;
DROP POLICY IF EXISTS "collections_insert_by_collectors" ON public.collections;
DROP POLICY IF EXISTS "collections_update_by_collectors" ON public.collections;

-- Create policy allowing collectors to select their own collections
CREATE POLICY "collections_select_by_collectors" 
  ON public.collections 
  FOR SELECT 
  USING (
    staff_id IN (
      SELECT s.id FROM public.staff s
      JOIN public.user_roles ur ON s.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'collector'
    )
  );

-- Create policy allowing collectors to insert collections
CREATE POLICY "collections_insert_by_collectors" 
  ON public.collections 
  FOR INSERT 
  WITH CHECK (
    staff_id IN (
      SELECT s.id FROM public.staff s
      JOIN public.user_roles ur ON s.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'collector'
    )
  );

-- Create policy allowing collectors to update their own collections
CREATE POLICY "collections_update_by_collectors" 
  ON public.collections 
  FOR UPDATE 
  USING (
    staff_id IN (
      SELECT s.id FROM public.staff s
      JOIN public.user_roles ur ON s.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'collector'
    )
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.collections TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%collections%';

-- Check that collections table has proper grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'collections' 
AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE');

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the policies
DROP POLICY IF EXISTS "collections_select_by_collectors" ON public.collections;
DROP POLICY IF EXISTS "collections_insert_by_collectors" ON public.collections;
DROP POLICY IF EXISTS "collections_update_by_collectors" ON public.collections;

COMMIT;
*/