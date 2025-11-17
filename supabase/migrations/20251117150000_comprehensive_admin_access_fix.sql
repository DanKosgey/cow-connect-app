-- Migration: 20251117150000_comprehensive_admin_access_fix.sql
-- Description: Comprehensive fix for admin access to all tables
-- This migration ensures that admin users have full access to all required tables

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

-- Create comprehensive policies for collections table
CREATE POLICY "Admins can read collections" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can insert collections" 
  ON public.collections FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can update collections" 
  ON public.collections FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can delete collections" 
  ON public.collections FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Create comprehensive policies for farmers table
CREATE POLICY "Admins can read farmers" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can insert farmers" 
  ON public.farmers FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can update farmers" 
  ON public.farmers FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can delete farmers" 
  ON public.farmers FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Create comprehensive policies for staff table
CREATE POLICY "Admins can read staff" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can insert staff" 
  ON public.staff FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can update staff" 
  ON public.staff FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can delete staff" 
  ON public.staff FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Create comprehensive policies for pending_farmers table
CREATE POLICY "Admins can read pending_farmers" 
  ON public.pending_farmers FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can insert pending_farmers" 
  ON public.pending_farmers FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can update pending_farmers" 
  ON public.pending_farmers FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

CREATE POLICY "Admins can delete pending_farmers" 
  ON public.pending_farmers FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

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