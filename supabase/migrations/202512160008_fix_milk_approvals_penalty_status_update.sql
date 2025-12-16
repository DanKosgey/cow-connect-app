-- Migration: 202512160008_fix_milk_approvals_penalty_status_update.sql
-- Description: Fix RLS policies specifically for updating penalty_status in milk_approvals table
-- This addresses the issue where staff members cannot update penalty_status field when marking collections as paid

BEGIN;

-- Drop the existing update policy that may be causing issues
DROP POLICY IF EXISTS "Allow authorized users to update milk approvals" ON public.milk_approvals;

-- Create a simplified UPDATE policy that focuses only on the essential permissions
-- This policy allows staff, collectors, and admins to update milk approvals
-- but removes complex EXISTS clauses that might cause recursion
CREATE POLICY "Allow authorized users to update milk approvals - simplified"
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

-- Check that the policy was created
-- SELECT polname FROM pg_policy WHERE polname = 'Allow authorized users to update milk approvals - simplified';

-- Test UPDATE policy (as staff user)
-- UPDATE milk_approvals SET penalty_status = 'paid' WHERE penalty_status = 'pending' LIMIT 1;