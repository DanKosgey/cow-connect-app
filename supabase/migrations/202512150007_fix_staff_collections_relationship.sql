-- Migration: 202512150007_fix_staff_collections_relationship.sql
-- Description: Fix the specific relationship issue between staff and collections tables for the Collector History page
-- This addresses the "Could not find a relationship between 'collections' and 'staff'" error
-- Estimated time: 1 minute

BEGIN;

-- First, identify and fix data inconsistencies
-- Set staff_id to NULL for collections where the staff_id doesn't exist in the staff table
UPDATE public.collections 
SET staff_id = NULL 
WHERE staff_id IS NOT NULL 
AND staff_id NOT IN (SELECT id FROM public.staff);

-- Ensure the staff table has the proper structure for relationships
-- The staff table should have an id column that can be referenced by collections.staff_id
-- This should already exist from previous migrations, but we'll verify and fix if needed

-- First, ensure the staff table structure is correct
ALTER TABLE public.staff 
ALTER COLUMN id SET NOT NULL;

-- Ensure the collections table has the proper staff_id column
ALTER TABLE public.collections 
ALTER COLUMN staff_id DROP NOT NULL; -- staff_id can be NULL as per the original schema

-- Explicitly define the foreign key relationship with proper constraint naming
-- Drop any existing problematic constraints first
ALTER TABLE public.collections 
DROP CONSTRAINT IF EXISTS collections_staff_id_fkey,
DROP CONSTRAINT IF EXISTS fk_collections_staff,
DROP CONSTRAINT IF EXISTS fk_collections_staff_id;

-- Create the proper foreign key constraint
ALTER TABLE public.collections 
ADD CONSTRAINT fk_collections_staff_id 
FOREIGN KEY (staff_id) 
REFERENCES public.staff(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Also ensure the relationship from staff to profiles is intact
ALTER TABLE public.staff 
DROP CONSTRAINT IF EXISTS staff_user_id_fkey,
DROP CONSTRAINT IF EXISTS fk_staff_user;

ALTER TABLE public.staff
ADD CONSTRAINT fk_staff_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Ensure RLS policies allow the necessary access
-- Make sure staff can read collections data for the Collector History page
DROP POLICY IF EXISTS "Staff can access collection data for history" ON public.collections;
CREATE POLICY "Staff can access collection data for history" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (
    -- Staff can see collections they collected
    staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
    OR
    -- Admins can see all collections
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
    OR
    -- Staff role users can see collections (for history viewing)
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  );

-- Also ensure staff can access staff data (needed for the join with profiles)
DROP POLICY IF EXISTS "Staff can access staff data" ON public.staff;
CREATE POLICY "Staff can access staff data" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (
    -- Staff can see their own record
    user_id = auth.uid()
    OR
    -- Admins can see all staff records
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
    OR
    -- Staff role users can see staff data (needed for joins)
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  );

-- Refresh the PostgREST schema cache to recognize the relationships
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the foreign key constraints exist
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  a.attname AS column_name
FROM pg_constraint AS c
JOIN pg_attribute AS a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.conrelid = 'collections'::regclass AND a.attname = 'staff_id';

-- Test the exact query pattern that was failing
-- This replicates the query from CollectorApprovalHistoryPage.tsx that caused the error
SELECT 
  id,
  collection_date,
  staff_id,
  staff (
    profiles (
      full_name
    )
  )
FROM collections 
WHERE id IN (
  '006ae830-f035-43d3-8f26-3327c3463cbb',
  '3a828495-7e2e-43c4-8ded-09db1ea715ba'
)
LIMIT 5;

-- Also test a simpler version without the nested select
SELECT 
  c.id,
  c.collection_date,
  c.staff_id,
  s.id as staff_record_id,
  p.full_name as collector_name
FROM collections c
LEFT JOIN staff s ON c.staff_id = s.id
LEFT JOIN profiles p ON s.user_id = p.id
WHERE c.id IN (
  '006ae830-f035-43d3-8f26-3327c3463cbb',
  '3a828495-7e2e-43c4-8ded-09db1ea715ba'
)
LIMIT 5;