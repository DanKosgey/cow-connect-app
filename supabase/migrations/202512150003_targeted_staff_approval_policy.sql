-- Migration: 202512150003_targeted_staff_approval_policy.sql
-- Description: Targeted RLS policy allowing staff members to approve collections made by collectors
-- This enables supervisors (staff role) to approve collections made by field collectors (collector role)
-- While collectors can only approve their own collections
-- Estimated time: 30 seconds

BEGIN;

-- Drop existing policies first
DROP POLICY IF EXISTS "Staff can select their own milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can insert milk approvals for their collections" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can update their own milk approvals" ON public.milk_approvals;

-- Create policy allowing staff members to VIEW all milk approvals
-- and collectors to view their own approvals
CREATE POLICY "Staff view all, collectors view own approvals"
ON public.milk_approvals 
FOR SELECT 
TO authenticated
USING (
  -- Staff members can view all approvals
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'staff'
    AND ur.active = true
  )
  OR
  -- Collectors can view their own approvals
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  -- Admins can view all approvals
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Create policy allowing staff members to APPROVE any collections
-- and collectors to approve their own collections
CREATE POLICY "Staff approve any, collectors approve own collections"
ON public.milk_approvals 
FOR INSERT 
WITH CHECK (
  -- Staff members can approve any collections (supervisor role)
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'staff'
    AND ur.active = true
  )
  OR
  -- Collectors can approve their own collections
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  -- Admins can approve any collections
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Create policy allowing staff members and collectors to UPDATE their own approvals
-- and admins to update any approvals
CREATE POLICY "Users update own approvals, admins update all"
ON public.milk_approvals 
FOR UPDATE 
USING (
  -- Users can update their own approvals
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  -- Admins can update any approvals
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

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the new policies
DROP POLICY IF EXISTS "Staff view all, collectors view own approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff approve any, collectors approve own collections" ON public.milk_approvals;
DROP POLICY IF EXISTS "Users update own approvals, admins update all" ON public.milk_approvals;

-- You would need to recreate the original policies here

COMMIT;
*/