-- Migration: 202512150002_simplified_staff_approval_policy.sql
-- Description: Simplified RLS policy to allow staff members to approve collections made by collectors
-- This enables supervisors (staff role) to approve collections made by field collectors (collector role)
-- Estimated time: 30 seconds

BEGIN;

-- Simplified approach: Allow staff members to approve any collections
-- Drop existing policies first
DROP POLICY IF EXISTS "Staff can select their own milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can insert milk approvals for their collections" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can update their own milk approvals" ON public.milk_approvals;

-- Create policy allowing staff and collectors to view milk approvals
CREATE POLICY "Staff and collectors can view milk approvals"
ON public.milk_approvals 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (ur.role = 'staff' OR ur.role = 'collector')
    AND ur.active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Create policy allowing staff and collectors to insert milk approvals
CREATE POLICY "Staff and collectors can approve collections"
ON public.milk_approvals 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (ur.role = 'staff' OR ur.role = 'collector')
    AND ur.active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Create policy allowing staff and collectors to update their own milk approvals
CREATE POLICY "Staff and collectors can update their approvals"
ON public.milk_approvals 
FOR UPDATE 
USING (
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

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%milk_approvals%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the new policies
DROP POLICY IF EXISTS "Staff and collectors can view milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff and collectors can approve collections" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff and collectors can update their approvals" ON public.milk_approvals;

-- You would need to recreate the original policies here

COMMIT;
*/