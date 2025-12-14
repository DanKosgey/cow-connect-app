-- Migration: 20251214121916_fix_collections_rls_and_relationships.sql
-- Description: Fix RLS policies for collections table and ensure proper relationship recognition
-- This fixes the "Could not find a relationship" error between collections and staff/farmers

BEGIN;

-- Ensure RLS is enabled on collections table
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies on collections
DROP POLICY IF EXISTS "Allow admins to read collections" ON collections;
DROP POLICY IF EXISTS "Allow admins to insert collections" ON collections;
DROP POLICY IF EXISTS "Allow admins to update collections" ON collections;
DROP POLICY IF EXISTS "Allow admins to delete collections" ON collections;
DROP POLICY IF EXISTS "Staff can read collections" ON collections;
DROP POLICY IF EXISTS "Staff can insert collections" ON collections;
DROP POLICY IF EXISTS "Staff can update collections" ON collections;
DROP POLICY IF EXISTS "Farmers can read their collections" ON collections;

-- Create comprehensive policies for collections table
-- Allow admins full access
CREATE POLICY "Allow admins to read collections" 
  ON collections FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Allow admins to insert collections" 
  ON collections FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Allow admins to update collections" 
  ON collections FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Allow admins to delete collections" 
  ON collections FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow staff to read, insert, and update collections
CREATE POLICY "Staff can read collections" 
  ON collections FOR SELECT 
  TO authenticated
  USING (
    staff_id IN (
      SELECT s.id FROM staff s WHERE s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Staff can insert collections" 
  ON collections FOR INSERT 
  TO authenticated
  WITH CHECK (
    staff_id IN (
      SELECT s.id FROM staff s WHERE s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Staff can update collections" 
  ON collections FOR UPDATE 
  TO authenticated
  USING (
    staff_id IN (
      SELECT s.id FROM staff s WHERE s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow farmers to read their own collections
CREATE POLICY "Farmers can read their collections" 
  ON collections FOR SELECT 
  TO authenticated
  USING (
    farmer_id IN (
      SELECT f.id FROM farmers f WHERE f.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Grant necessary permissions
GRANT ALL ON collections TO authenticated;

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
WHERE tablename = 'collections'
ORDER BY policyname;

-- Test collections access
SELECT COUNT(*) FROM collections;

-- Test the specific query that was failing
SELECT id, collection_id, farmer_id, staff_id, approved_by, liters, rate_per_liter, total_amount, collection_date, status, notes
FROM collections 
LIMIT 1;