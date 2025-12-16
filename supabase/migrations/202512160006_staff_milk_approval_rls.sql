-- Migration: 202512160006_staff_milk_approval_rls.sql
-- Description: Create proper RLS policies for staff users to approve milk collected by collectors
-- This addresses the type casting issues and ensures staff can properly approve collections

BEGIN;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Staff and collectors can view milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff and collectors can approve collections" ON public.milk_approvals;
DROP POLICY IF EXISTS "Users can update their approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Collectors can insert approvals for their collections" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can view all milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Allow staff collectors and admins to view milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Allow authorized users to insert milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Allow authorized users to update milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Allow staff to insert milk approvals for any collection" ON public.milk_approvals;
DROP POLICY IF EXISTS "Agrovet staff can manage disbursements" ON public.agrovet_disbursements;

-- Create SELECT policy for milk approvals
-- Allow staff members, collectors, and admins to view milk approvals
CREATE POLICY "Allow staff collectors and admins to view milk approvals"
ON public.milk_approvals 
FOR SELECT 
TO authenticated
USING (
  -- Allow staff members to view all approvals
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'staff'
    AND ur.active = true
  )
  OR
  -- Allow collectors to view their own approvals
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  -- Allow admins to view all approvals
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Create INSERT policy for milk approvals
-- Allow staff to insert approvals for any collections (for administrative purposes)
-- Allow collectors to insert approvals only for their own collections
CREATE POLICY "Allow staff to insert milk approvals for any collection"
ON public.milk_approvals 
FOR INSERT 
WITH CHECK (
  -- Allow staff members to insert approvals for any collections
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'staff'
    AND ur.active = true
  )
  OR
  -- Allow collectors to insert approvals only for their own collections
  EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id
    AND c.staff_id IN (
      SELECT id FROM public.staff WHERE user_id = auth.uid()
    )
  )
  OR
  -- Allow admins to insert approvals for any collections
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Create UPDATE policy for milk approvals
-- Allow staff to update any approvals
-- Allow collectors to update only their own approvals
-- Allow admins to update any approvals
CREATE POLICY "Allow authorized users to update milk approvals"
ON public.milk_approvals 
FOR UPDATE 
USING (
  -- Allow staff members to update any approvals
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'staff'
    AND ur.active = true
  )
  OR
  -- Allow collectors to update their own approvals
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  -- Allow admins to update any approvals
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
)
WITH CHECK (
  -- Same conditions for UPDATE operations
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'staff'
    AND ur.active = true
  )
  OR
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that all policies were created
-- SELECT polname FROM pg_policy WHERE polname LIKE '%milk_approvals%';

-- Test SELECT policy (as staff user)
-- SELECT * FROM milk_approvals LIMIT 1;

-- Test INSERT policy (as staff user)
-- INSERT INTO milk_approvals (collection_id, staff_id, company_received_liters, variance_liters, variance_percentage, variance_type, penalty_amount)
-- VALUES ('test-collection-id', 'test-staff-id', 1000, 0, 0, 'none', 0);

-- Test UPDATE policy (as staff user)
-- UPDATE milk_approvals SET penalty_status = 'paid' WHERE penalty_status = 'pending' LIMIT 1;