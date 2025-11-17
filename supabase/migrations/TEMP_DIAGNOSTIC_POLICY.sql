-- Temporary Diagnostic Policy: TEMP_DIAGNOSTIC_POLICY.sql
-- Description: Add a temporary permissive policy to diagnose token issues
-- WARNING: This should be removed immediately after testing

BEGIN;

-- Create temporary permissive policies for testing
-- These policies will allow any authenticated user to access the tables
-- This will help us determine if the issue is with the token or with the policies

-- Collections table
DROP POLICY IF EXISTS "Temp diagnostic policy for collections" ON public.collections;
CREATE POLICY "Temp diagnostic policy for collections" 
  ON public.collections FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Farmers table
DROP POLICY IF EXISTS "Temp diagnostic policy for farmers" ON public.farmers;
CREATE POLICY "Temp diagnostic policy for farmers" 
  ON public.farmers FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Staff table
DROP POLICY IF EXISTS "Temp diagnostic policy for staff" ON public.staff;
CREATE POLICY "Temp diagnostic policy for staff" 
  ON public.staff FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Pending farmers table
DROP POLICY IF EXISTS "Temp diagnostic policy for pending_farmers" ON public.pending_farmers;
CREATE POLICY "Temp diagnostic policy for pending_farmers" 
  ON public.pending_farmers FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;

-- After running this, test your application
-- If it works, the issue is with your policies or user roles
-- If it still doesn't work, the issue is with the token not being sent

-- REMEMBER TO REMOVE THESE POLICIES AFTER TESTING!