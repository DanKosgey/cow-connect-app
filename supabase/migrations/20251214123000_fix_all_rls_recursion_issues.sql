-- Migration: 20251214123000_fix_all_rls_recursion_issues.sql
-- Description: Fix all infinite recursion issues in RLS policies
-- This fixes the issue where multiple RLS policies were causing infinite recursion 
-- by checking the user_roles table directly within the same policy evaluation

BEGIN;

-- Fix collections table policies that were causing recursion
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "collections_admin_all" ON collections;
DROP POLICY IF EXISTS "collections_staff_read_own" ON collections;
DROP POLICY IF EXISTS "collections_staff_insert_own" ON collections;
DROP POLICY IF EXISTS "collections_staff_update_own" ON collections;
DROP POLICY IF EXISTS "collections_farmers_read_own" ON collections;

-- Create new policies using the secure function to avoid recursion
-- Allow admins full access
CREATE POLICY "collections_admin_all"
  ON collections FOR ALL
  TO authenticated
  USING (
    public.get_user_role_secure(auth.uid()) = 'admin'
  );

-- Allow staff to read their own collections
CREATE POLICY "collections_staff_read_own"
  ON collections FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    OR public.get_user_role_secure(auth.uid()) = 'admin'
  );

-- Allow staff to insert collections they're responsible for
CREATE POLICY "collections_staff_insert_own"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    OR public.get_user_role_secure(auth.uid()) = 'admin'
  );

-- Allow staff to update collections they're responsible for
CREATE POLICY "collections_staff_update_own"
  ON collections FOR UPDATE
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    OR public.get_user_role_secure(auth.uid()) = 'admin'
  );

-- Allow farmers to read their own collections
CREATE POLICY "collections_farmers_read_own"
  ON collections FOR SELECT
  TO authenticated
  USING (
    farmer_id IN (
      SELECT id FROM farmers WHERE user_id = auth.uid()
    )
    OR public.get_user_role_secure(auth.uid()) = 'admin'
  );

-- Fix staff table policies that were causing recursion
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "staff_admin_all" ON staff;
DROP POLICY IF EXISTS "staff_read_own" ON staff;

-- Create new policies using the secure function to avoid recursion
-- Allow admins full access to staff
CREATE POLICY "staff_admin_all"
  ON staff FOR ALL
  TO authenticated
  USING (
    public.get_user_role_secure(auth.uid()) = 'admin'
  );

-- Allow staff to read their own profile
CREATE POLICY "staff_read_own"
  ON staff FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_user_role_secure(auth.uid()) = 'admin'
  );

-- Fix farmers table policies that were causing recursion
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "farmers_admin_all" ON farmers;
DROP POLICY IF EXISTS "farmers_read_own" ON farmers;

-- Create new policies using the secure function to avoid recursion
-- Allow admins full access to farmers
CREATE POLICY "farmers_admin_all"
  ON farmers FOR ALL
  TO authenticated
  USING (
    public.get_user_role_secure(auth.uid()) = 'admin'
  );

-- Allow farmers to read their own profile
CREATE POLICY "farmers_read_own"
  ON farmers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_user_role_secure(auth.uid()) = 'admin'
  );

-- Ensure proper permissions
GRANT ALL ON collections TO authenticated;
GRANT ALL ON staff TO authenticated;
GRANT ALL ON farmers TO authenticated;

-- Refresh the PostgREST schema cache to recognize relationships
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification queries
-- Check that policies were created
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('collections', 'staff', 'farmers')
ORDER BY tablename, policyname;