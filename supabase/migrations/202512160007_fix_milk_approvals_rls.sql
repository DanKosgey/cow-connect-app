-- Migration: 202512160007_fix_milk_approvals_rls.sql
-- Description: Fix RLS policies for milk_approvals table to use secure function to avoid recursion
-- This addresses the issue where staff members with proper roles cannot insert milk approvals

BEGIN;

-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "Allow staff collectors and admins to view milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Allow staff to insert milk approvals for any collection" ON public.milk_approvals;
DROP POLICY IF EXISTS "Allow authorized users to update milk approvals" ON public.milk_approvals;

-- Create SELECT policy for milk approvals using secure function
CREATE POLICY "Allow staff collectors and admins to view milk approvals"
ON public.milk_approvals 
FOR SELECT 
TO authenticated
USING (
  -- Allow staff members to view all approvals
  public.get_user_role_secure(auth.uid()) = 'staff'
  OR
  -- Allow collectors to view their own approvals
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  -- Allow admins to view all approvals
  public.get_user_role_secure(auth.uid()) = 'admin'
);

-- Create INSERT policy for milk approvals using secure function
CREATE POLICY "Allow staff to insert milk approvals for any collection"
ON public.milk_approvals 
FOR INSERT 
WITH CHECK (
  -- Allow staff members to insert approvals for any collections
  public.get_user_role_secure(auth.uid()) = 'staff'
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
  public.get_user_role_secure(auth.uid()) = 'admin'
);

-- Create UPDATE policy for milk approvals using secure function
CREATE POLICY "Allow authorized users to update milk approvals"
ON public.milk_approvals 
FOR UPDATE 
USING (
  -- Allow staff members to update any approvals
  public.get_user_role_secure(auth.uid()) = 'staff'
  OR
  -- Allow collectors to update their own approvals
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  -- Allow admins to update any approvals
  public.get_user_role_secure(auth.uid()) = 'admin'
)
WITH CHECK (
  -- Same conditions for UPDATE operations
  public.get_user_role_secure(auth.uid()) = 'staff'
  OR
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  public.get_user_role_secure(auth.uid()) = 'admin'
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