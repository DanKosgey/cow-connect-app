-- Migration: 202512150006_enhance_table_relationships_and_rls.sql
-- Description: Enhance table relationships and RLS policies for staff portal functionality
-- Estimated time: 2 minutes

BEGIN;

-- First, identify and fix data inconsistencies
-- Set staff_id to NULL for collections where the staff_id doesn't exist in the staff table
UPDATE public.collections 
SET staff_id = NULL 
WHERE staff_id IS NOT NULL 
AND staff_id NOT IN (SELECT id FROM public.staff);

-- Ensure all foreign key constraints are properly defined for collections table
-- Drop any existing problematic constraints
ALTER TABLE public.collections 
DROP CONSTRAINT IF EXISTS collections_farmer_id_fkey,
DROP CONSTRAINT IF EXISTS collections_staff_id_fkey,
DROP CONSTRAINT IF EXISTS fk_collections_farmer,
DROP CONSTRAINT IF EXISTS fk_collections_staff;

-- Recreate foreign key constraints with proper naming
ALTER TABLE public.collections 
ADD CONSTRAINT fk_collections_farmer 
FOREIGN KEY (farmer_id) 
REFERENCES public.farmers(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE,
ADD CONSTRAINT fk_collections_staff 
FOREIGN KEY (staff_id) 
REFERENCES public.staff(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Ensure all related tables have proper foreign key constraints
ALTER TABLE public.milk_approvals
DROP CONSTRAINT IF EXISTS milk_approvals_collection_id_fkey,
DROP CONSTRAINT IF EXISTS milk_approvals_staff_id_fkey,
DROP CONSTRAINT IF EXISTS fk_milk_approvals_collection,
DROP CONSTRAINT IF EXISTS fk_milk_approvals_staff;

ALTER TABLE public.milk_approvals
ADD CONSTRAINT fk_milk_approvals_collection 
FOREIGN KEY (collection_id) 
REFERENCES public.collections(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE,
ADD CONSTRAINT fk_milk_approvals_staff 
FOREIGN KEY (staff_id) 
REFERENCES public.staff(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Ensure RLS is enabled on all relevant tables
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_approvals ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for collections to ensure staff can access related data
-- Allow staff to read collections they've collected
DROP POLICY IF EXISTS "Staff can read their collections" ON public.collections;
DROP POLICY IF EXISTS "Staff can read collections" ON public.collections;
CREATE POLICY "Staff can read their collections" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (
    staff_id IN (
      SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  );

-- Allow staff to read milk approvals for collections they've approved
DROP POLICY IF EXISTS "Staff can read milk approvals" ON public.milk_approvals;
CREATE POLICY "Staff can read milk approvals" 
  ON public.milk_approvals FOR SELECT 
  TO authenticated
  USING (
    staff_id IN (
      SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  );

-- Refresh the PostgREST schema cache to recognize all relationships
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that all foreign key constraints were created
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
WHERE tc.table_name IN ('collections', 'milk_approvals')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- Test the relationship query that was failing in the frontend
-- This should now work without the PGRST200 error
SELECT 
  ma.id,
  ma.collection_id,
  ma.staff_id,
  ma.company_received_liters,
  ma.approved_at,
  c.collection_date,
  c.staff_id as collection_staff_id,
  s.id as staff_record_id
FROM milk_approvals ma
JOIN collections c ON ma.collection_id = c.id
LEFT JOIN staff s ON c.staff_id = s.id
WHERE ma.collection_id IN (
  '006ae830-f035-43d3-8f26-3327c3463cbb',
  '3a828495-7e2e-43c4-8ded-09db1ea715ba'
)
LIMIT 5;

-- Test the nested query that was used in CollectorApprovalHistoryPage
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