-- Migration: 20251117140000_fix_admin_rls_policies.sql
-- Description: Fix RLS policies to properly allow admin access to all tables
-- This migration addresses the 403 Forbidden errors by ensuring admins can access all required tables

BEGIN;

-- Fix RLS policies for collections table
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow admins to read collections" ON public.collections;
DROP POLICY IF EXISTS "Allow admins to insert collections" ON public.collections;
DROP POLICY IF EXISTS "Allow admins to update collections" ON public.collections;
DROP POLICY IF EXISTS "Allow admins to delete collections" ON public.collections;
DROP POLICY IF EXISTS "Staff can read collections" ON public.collections;
DROP POLICY IF EXISTS "Staff can insert collections" ON public.collections;
DROP POLICY IF EXISTS "Staff can update collections" ON public.collections;
DROP POLICY IF EXISTS "Farmers can read their collections" ON public.collections;

-- Create comprehensive policies for collections table
-- Allow admins full access
CREATE POLICY "Allow admins to read collections" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Allow admins to insert collections" 
  ON public.collections FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Allow admins to update collections" 
  ON public.collections FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Allow admins to delete collections" 
  ON public.collections FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow staff to read and insert collections
CREATE POLICY "Staff can read collections" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Staff can insert collections" 
  ON public.collections FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Staff can update collections" 
  ON public.collections FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow farmers to read their own collections
CREATE POLICY "Farmers can read their collections" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (
    farmer_id IN (
      SELECT f.id FROM public.farmers f WHERE f.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Fix RLS policies for farmers table
ALTER TABLE IF EXISTS public.farmers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow admins to manage farmers" ON public.farmers;
DROP POLICY IF EXISTS "Farmers can read their own profile" ON public.farmers;
DROP POLICY IF EXISTS "Staff can read farmers" ON public.farmers;

-- Create comprehensive policies for farmers table
-- Allow admins full access
CREATE POLICY "Allow admins to manage farmers" 
  ON public.farmers FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow farmers to read their own profile
CREATE POLICY "Farmers can read their own profile" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow staff to read farmers
CREATE POLICY "Staff can read farmers" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Fix RLS policies for staff table
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow admins to manage staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can read their own profile" ON public.staff;

-- Create comprehensive policies for staff table
-- Allow admins full access
CREATE POLICY "Allow admins to manage staff" 
  ON public.staff FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow staff to read their own profile
CREATE POLICY "Staff can read their own profile" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Fix RLS policies for pending_farmers table
ALTER TABLE IF EXISTS public.pending_farmers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow admins to manage pending farmers" ON public.pending_farmers;
DROP POLICY IF EXISTS "Users can manage their own pending farmer records" ON public.pending_farmers;

-- Create comprehensive policies for pending_farmers table
-- Allow admins full access
CREATE POLICY "Allow admins to manage pending farmers" 
  ON public.pending_farmers FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Allow users to manage their own pending farmer records
CREATE POLICY "Users can manage their own pending farmer records" 
  ON public.pending_farmers FOR ALL 
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.collections TO authenticated;
GRANT ALL ON public.farmers TO authenticated;
GRANT ALL ON public.staff TO authenticated;
GRANT ALL ON public.pending_farmers TO authenticated;

COMMIT;

-- Verification queries
-- Check that policies exist
SELECT polname, relname 
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname IN ('collections', 'farmers', 'staff', 'pending_farmers')
ORDER BY pc.relname, polname;