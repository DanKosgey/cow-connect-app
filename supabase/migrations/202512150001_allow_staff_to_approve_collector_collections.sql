-- Migration: 202512150001_allow_staff_to_approve_collector_collections.sql
-- Description: Update RLS policies to allow staff members to approve collections made by collectors
-- This enables supervisors (staff role) to approve collections made by field collectors (collector role)
-- Estimated time: 1 minute

BEGIN;

-- Drop existing policies first
DROP POLICY IF EXISTS "Staff can select their own milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can insert milk approvals for their collections" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can update their own milk approvals" ON public.milk_approvals;

-- Create updated policy allowing staff users to SELECT all milk approvals
-- Staff members can view all approvals (both their own and those made by collectors)
CREATE POLICY "Staff can view all milk approvals"
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
  -- Also allow collectors to view their own approvals
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

-- Create updated policy allowing staff users to INSERT milk approvals
-- Staff members can approve collections made by collectors
CREATE POLICY "Staff can approve collections"
ON public.milk_approvals 
FOR INSERT 
WITH CHECK (
  -- Allow staff members to approve any collections
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'staff'
    AND ur.active = true
  )
  OR
  -- Allow collectors to approve their own collections
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  -- Allow admins to approve any collections
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Create updated policy allowing staff users to UPDATE milk approvals
-- Staff members can update approvals for collections they approved
CREATE POLICY "Staff can update approvals"
ON public.milk_approvals 
FOR UPDATE 
USING (
  -- Allow staff members to update approvals they created
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.milk_approvals ma ON ma.staff_id = (
      SELECT id FROM public.staff WHERE user_id = ur.user_id
    )
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'staff'
    AND ur.active = true
    AND ma.id = milk_approvals.id
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
);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%milk_approvals%';

-- Test the new policies (these should return rows if policies are working correctly)
-- SELECT count(*) FROM public.milk_approvals; -- Run this as a staff user to verify SELECT works
-- INSERT INTO public.milk_approvals (collection_id, staff_id, company_received_liters) VALUES (gen_random_uuid(), gen_random_uuid(), 100); -- Run this as a staff user to verify INSERT works

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the new policies
DROP POLICY IF EXISTS "Staff can view all milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can approve collections" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can update approvals" ON public.milk_approvals;

-- Recreate the original policies from 20251127000500_fix_staff_rls_policies.sql
-- (You would need to copy the original policy definitions here)

COMMIT;
*/