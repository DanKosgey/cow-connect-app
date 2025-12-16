-- Migration: 202512160001_fix_milk_approvals_rls_recursion.sql
-- Description: Fix infinite recursion in milk_approvals RLS policies
-- This fixes the issue where the UPDATE policy was causing infinite recursion by referencing milk_approvals within its own policy

BEGIN;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Staff can view all milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can approve collections" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can update approvals" ON public.milk_approvals;

-- Create simplified policies that avoid recursion
-- Allow SELECT for staff, collectors, and admins
CREATE POLICY "Staff and collectors can view milk approvals"
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

-- Allow INSERT for staff, collectors, and admins
CREATE POLICY "Staff and collectors can approve collections"
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

-- Simplified UPDATE policy that avoids recursion
-- Allow users to update approvals they created or have permission to update
CREATE POLICY "Users can update their approvals"
ON public.milk_approvals 
FOR UPDATE 
USING (
  -- Allow staff members to update approvals
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

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%milk_approvals%';

-- Test the policies by attempting to update a milk approval
-- This should work without recursion errors
-- UPDATE milk_approvals SET penalty_status = 'paid' WHERE penalty_status = 'pending' LIMIT 1;