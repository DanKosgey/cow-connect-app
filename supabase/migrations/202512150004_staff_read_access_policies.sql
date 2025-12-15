-- Migration: 202512150004_staff_read_access_policies.sql
-- Description: Add RLS policies to allow staff members to view farmers, staff, and collections tables
-- This enables staff users to have read access to essential data for their duties
-- Estimated time: 1 minute

BEGIN;

-- ============================================
-- 1. FARMERS TABLE POLICIES
-- ============================================

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Staff can read farmers" ON public.farmers;

-- Create policy allowing staff to read all farmers
CREATE POLICY "Staff can read farmers"
ON public.farmers 
FOR SELECT 
TO authenticated
USING (
  -- Allow staff members to read all farmers
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'staff'
    AND ur.active = true
  )
  OR
  -- Allow admins to read all farmers
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- ============================================
-- 2. STAFF TABLE POLICIES
-- ============================================

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Staff can read staff" ON public.staff;

-- Create policy allowing staff to read all staff records
CREATE POLICY "Staff can read staff"
ON public.staff 
FOR SELECT 
TO authenticated
USING (
  -- Allow staff members to read all staff records
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'staff'
    AND ur.active = true
  )
  OR
  -- Allow collectors to read their own record
  user_id = auth.uid()
  OR
  -- Allow admins to read all staff records
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- ============================================
-- 3. COLLECTIONS TABLE POLICIES
-- ============================================

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Staff can read all collections" ON public.collections;

-- Create policy allowing staff to read all collections
CREATE POLICY "Staff can read all collections"
ON public.collections 
FOR SELECT 
TO authenticated
USING (
  -- Allow staff members to read all collections
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'staff'
    AND ur.active = true
  )
  OR
  -- Allow collectors to read their own collections
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  -- Allow farmers to read their own collections
  farmer_id IN (
    SELECT id FROM public.farmers WHERE user_id = auth.uid()
  )
  OR
  -- Allow admins to read all collections
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Refresh the PostgREST schema cache to recognize relationships
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT 
  tablename,
  polname,
  polpermissive,
  polroles,
  polqual
FROM pg_policy 
WHERE polname IN (
  'Staff can read farmers',
  'Staff can read staff',
  'Staff can read all collections'
)
ORDER BY tablename, polname;

-- Test queries (run these as a staff user to verify access):
-- SELECT COUNT(*) FROM public.farmers; -- Should return count of all farmers
-- SELECT COUNT(*) FROM public.staff; -- Should return count of all staff
-- SELECT COUNT(*) FROM public.collections; -- Should return count of all collections

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the new policies
DROP POLICY IF EXISTS "Staff can read farmers" ON public.farmers;
DROP POLICY IF EXISTS "Staff can read staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can read all collections" ON public.collections;

-- Recreate any previous policies that were dropped (add original policy definitions here if needed)

COMMIT;
*/