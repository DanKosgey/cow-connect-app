-- Migration: 20251117150500_corrected_simplified_admin_rls_policies.sql
-- Description: Corrected simplified RLS policies using is_admin function
-- This migration creates cleaner RLS policies using the is_admin function

BEGIN;

-- Ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pending_farmers ENABLE ROW LEVEL SECURITY;

-- First, drop any existing policies with the same names to avoid conflicts
-- We need to do this in a separate step to avoid dependency issues
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

-- Now create a new transaction to create the function and policies
-- This needs to be in a separate transaction to avoid dependency issues

BEGIN;

-- Create or replace the is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin' 
      AND ur.active = true
  );
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Create simplified policies using is_admin function
-- Collections table policies
CREATE POLICY "Admins can read collections" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert collections" 
  ON public.collections FOR INSERT 
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update collections" 
  ON public.collections FOR UPDATE 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete collections" 
  ON public.collections FOR DELETE 
  TO authenticated
  USING (is_admin());

-- Farmers table policies
CREATE POLICY "Admins can read farmers" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert farmers" 
  ON public.farmers FOR INSERT 
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update farmers" 
  ON public.farmers FOR UPDATE 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete farmers" 
  ON public.farmers FOR DELETE 
  TO authenticated
  USING (is_admin());

-- Staff table policies
CREATE POLICY "Admins can read staff" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert staff" 
  ON public.staff FOR INSERT 
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update staff" 
  ON public.staff FOR UPDATE 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete staff" 
  ON public.staff FOR DELETE 
  TO authenticated
  USING (is_admin());

-- Pending farmers table policies
CREATE POLICY "Admins can read pending_farmers" 
  ON public.pending_farmers FOR SELECT 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert pending_farmers" 
  ON public.pending_farmers FOR INSERT 
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update pending_farmers" 
  ON public.pending_farmers FOR UPDATE 
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete pending_farmers" 
  ON public.pending_farmers FOR DELETE 
  TO authenticated
  USING (is_admin());

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