-- Migration: 20251117150700_fixed_simplified_admin_rls_policies.sql
-- Description: Fixed simplified RLS policies using is_admin function
-- This migration creates cleaner RLS policies using the is_admin function

BEGIN;

-- Ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pending_farmers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can read collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can insert collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can update collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can delete collections" ON public.collections;

DROP POLICY IF EXISTS "Admins can read farmers" ON public.farmers;
DROP POLICY IF EXISTS "Admins can insert farmers" ON public.farmers;
DROP POLICY IF EXISTS "Admins can update farmers" ON public.farmers;
DROP POLICY IF EXISTS "Admins can delete farmers" ON public.farmers;

DROP POLICY IF EXISTS "Admins can read staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can update staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;

DROP POLICY IF EXISTS "Admins can read pending_farmers" ON public.pending_farmers;
DROP POLICY IF EXISTS "Admins can insert pending_farmers" ON public.pending_farmers;
DROP POLICY IF EXISTS "Admins can update pending_farmers" ON public.pending_farmers;
DROP POLICY IF EXISTS "Admins can delete pending_farmers" ON public.pending_farmers;

COMMIT;

-- Create a new transaction for the function and policies
BEGIN;

-- Create simplified policies using is_admin function
-- Collections table policies
CREATE POLICY "Admins can read collections" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert collections" 
  ON public.collections FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update collections" 
  ON public.collections FOR UPDATE 
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete collections" 
  ON public.collections FOR DELETE 
  TO authenticated
  USING (public.is_admin());

-- Farmers table policies
CREATE POLICY "Admins can read farmers" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert farmers" 
  ON public.farmers FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update farmers" 
  ON public.farmers FOR UPDATE 
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete farmers" 
  ON public.farmers FOR DELETE 
  TO authenticated
  USING (public.is_admin());

-- Staff table policies
CREATE POLICY "Admins can read staff" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert staff" 
  ON public.staff FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update staff" 
  ON public.staff FOR UPDATE 
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete staff" 
  ON public.staff FOR DELETE 
  TO authenticated
  USING (public.is_admin());

-- Pending farmers table policies
CREATE POLICY "Admins can read pending_farmers" 
  ON public.pending_farmers FOR SELECT 
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert pending_farmers" 
  ON public.pending_farmers FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update pending_farmers" 
  ON public.pending_farmers FOR UPDATE 
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete pending_farmers" 
  ON public.pending_farmers FOR DELETE 
  TO authenticated
  USING (public.is_admin());

-- Ensure proper grants
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
AND polname LIKE '%Admin%'
ORDER BY pc.relname, polname;