-- Migration: 20251214122331_consolidate_collections_rls_policies.sql
-- Description: Consolidate and fix RLS policies for collections table to resolve relationship issues
-- This fixes the "Could not find a relationship" error between collections and staff/farmers

BEGIN;

-- Ensure RLS is enabled on all relevant tables
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;

-- Drop all existing conflicting policies on collections
DROP POLICY IF EXISTS "collections_select_by_collectors" ON collections;
DROP POLICY IF EXISTS "collections_insert_by_collectors" ON collections;
DROP POLICY IF EXISTS "collections_update_by_collectors" ON collections;
DROP POLICY IF EXISTS "collections_select_by_staff" ON collections;
DROP POLICY IF EXISTS "collections_update_by_staff" ON collections;
DROP POLICY IF EXISTS "Allow admins to read collections" ON collections;
DROP POLICY IF EXISTS "Allow admins to insert collections" ON collections;
DROP POLICY IF EXISTS "Allow admins to update collections" ON collections;
DROP POLICY IF EXISTS "Allow admins to delete collections" ON collections;
DROP POLICY IF EXISTS "Staff can read collections" ON collections;
DROP POLICY IF EXISTS "Staff can insert collections" ON collections;
DROP POLICY IF EXISTS "Staff can update collections" ON collections;
DROP POLICY IF EXISTS "Farmers can read their collections" ON collections;

-- Drop conflicting policies on staff
DROP POLICY IF EXISTS "staff_select_own_by_collectors" ON staff;

-- Create comprehensive policies for collections table
-- Allow admins full access
CREATE POLICY "collections_admin_all"
  ON collections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow staff to read their own collections
CREATE POLICY "collections_staff_read_own"
  ON collections FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow staff to insert collections they're responsible for
CREATE POLICY "collections_staff_insert_own"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow staff to update collections they're responsible for
CREATE POLICY "collections_staff_update_own"
  ON collections FOR UPDATE
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow farmers to read their own collections
CREATE POLICY "collections_farmers_read_own"
  ON collections FOR SELECT
  TO authenticated
  USING (
    farmer_id IN (
      SELECT id FROM farmers WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Create policies for staff table
-- Allow admins full access to staff
CREATE POLICY "staff_admin_all"
  ON staff FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow staff to read their own profile
CREATE POLICY "staff_read_own"
  ON staff FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Create policies for farmers table
-- Allow admins full access to farmers
CREATE POLICY "farmers_admin_all"
  ON farmers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow farmers to read their own profile
CREATE POLICY "farmers_read_own"
  ON farmers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Grant necessary permissions
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

-- Test collections access
SELECT COUNT(*) FROM collections;

-- Test the specific query that was failing
SELECT id, collection_id, farmer_id, staff_id, approved_by, liters, rate_per_liter, total_amount, collection_date, status, notes
FROM collections 
LIMIT 1;