-- Migration: 202512150005_fix_collections_staff_relationship.sql
-- Description: Fix the relationship between collections and staff tables to resolve PGRST200 error
-- Estimated time: 1 minute

BEGIN;

-- First, identify and fix data inconsistencies
-- Set staff_id to NULL for collections where the staff_id doesn't exist in the staff table
UPDATE public.collections 
SET staff_id = NULL 
WHERE staff_id IS NOT NULL 
AND staff_id NOT IN (SELECT id FROM public.staff);

-- Ensure the foreign key constraint is properly defined
-- First, drop any existing problematic constraint
ALTER TABLE public.collections 
DROP CONSTRAINT IF EXISTS collections_staff_id_fkey,
DROP CONSTRAINT IF EXISTS fk_collections_staff;

-- Recreate the foreign key constraint with proper naming
ALTER TABLE public.collections 
ADD CONSTRAINT fk_collections_staff 
FOREIGN KEY (staff_id) 
REFERENCES public.staff(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Ensure RLS is enabled on both tables
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Refresh the PostgREST schema cache to recognize the relationship
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the foreign key constraint was created
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'collections' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'staff_id';

-- Test the relationship query that was failing
-- This should now work without the PGRST200 error
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