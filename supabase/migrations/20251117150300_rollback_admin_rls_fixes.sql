-- Rollback Script: 20251117150300_rollback_admin_rls_fixes.sql
-- Description: Rollback script for admin RLS fixes
-- This script reverts the changes made in the admin RLS fixes

BEGIN;

-- Drop policies that depend on is_admin function first
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

-- Now drop the is_admin function
DROP FUNCTION IF EXISTS public.is_admin();

-- Drop the simplified policies
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

-- Revert to previous policies (from 20251117140000_fix_admin_rls_policies.sql)
-- Collections table policies
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

-- Farmers table policies
CREATE POLICY "Allow admins to manage farmers" 
  ON public.farmers FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Staff table policies
CREATE POLICY "Allow admins to manage staff" 
  ON public.staff FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

-- Pending farmers table policies
CREATE POLICY "Allow admins to manage pending farmers" 
  ON public.pending_farmers FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );

COMMIT;