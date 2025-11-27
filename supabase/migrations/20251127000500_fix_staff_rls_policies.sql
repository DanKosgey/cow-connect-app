-- Migration: 20251127000500_fix_staff_rls_policies.sql
-- Description: Fix RLS policies for milk_approvals and staff_performance tables to allow staff members proper access
-- Estimated time: 1 minute

BEGIN;

-- Fix milk_approvals table policies to be more specific about who can insert/update
-- Drop existing policies first
DROP POLICY IF EXISTS "milk_approvals_select_by_staff" ON public.milk_approvals;
DROP POLICY IF EXISTS "milk_approvals_insert_by_staff" ON public.milk_approvals;
DROP POLICY IF EXISTS "milk_approvals_update_by_staff" ON public.milk_approvals;

-- Create more specific policy allowing staff users to select milk approvals
CREATE POLICY "Staff can select their own milk approvals"
ON public.milk_approvals 
FOR SELECT 
TO authenticated
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

-- Create more specific policy allowing staff users to insert milk approvals
CREATE POLICY "Staff can insert milk approvals for their collections"
ON public.milk_approvals 
FOR INSERT 
WITH CHECK (
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

-- Create more specific policy allowing staff users to update their own milk approvals
CREATE POLICY "Staff can update their own milk approvals"
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

-- Fix staff_performance table policies to allow staff members to insert records
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can insert staff performance records" ON public.staff_performance;
DROP POLICY IF EXISTS "Staff can insert performance records" ON public.staff_performance;

-- Create policy allowing staff members to insert their own performance records
CREATE POLICY "Staff can insert their own performance records"
ON public.staff_performance 
FOR INSERT 
TO authenticated 
WITH CHECK (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

-- Create policy allowing staff members to update their own performance records
CREATE POLICY "Staff can update their own performance records"
ON public.staff_performance 
FOR UPDATE 
USING (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%milk_approvals%' OR polname LIKE '%staff_performance%';

-- Check current user's staff ID if exists
SELECT id as staff_id FROM public.staff WHERE user_id = auth.uid();