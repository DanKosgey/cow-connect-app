-- Migration: 20251217000300_fix_credit_requests_admin_access.sql
-- Description: Fix admin access to credit_requests table by adding proper RLS policies using is_admin function

BEGIN;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Farmers can view their own credit requests" ON public.credit_requests;
DROP POLICY IF EXISTS "Admins and staff can view all credit requests" ON public.credit_requests;
DROP POLICY IF EXISTS "Farmers can create credit requests" ON public.credit_requests;
DROP POLICY IF EXISTS "Admins and staff can update credit requests" ON public.credit_requests;

-- Create new policies using the is_admin function for consistency
-- 1. Farmers can view their own credit requests
CREATE POLICY "Farmers can view their own credit requests" 
  ON public.credit_requests FOR SELECT 
  TO authenticated
  USING (
    farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );

-- 2. Admins can view all credit requests
CREATE POLICY "Admins can view all credit requests" 
  ON public.credit_requests FOR SELECT 
  TO authenticated
  USING (public.is_admin());

-- 3. Staff can view all credit requests
CREATE POLICY "Staff can view all credit requests" 
  ON public.credit_requests FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff'
    )
  );

-- 4. Creditors can view all credit requests
CREATE POLICY "Creditors can view all credit requests" 
  ON public.credit_requests FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'creditor'
    )
  );

-- 5. Farmers can create credit requests
CREATE POLICY "Farmers can create credit requests" 
  ON public.credit_requests FOR INSERT 
  TO authenticated
  WITH CHECK (
    farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );

-- 6. Admins can create credit requests
CREATE POLICY "Admins can create credit requests" 
  ON public.credit_requests FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin());

-- 7. Staff can create credit requests
CREATE POLICY "Staff can create credit requests" 
  ON public.credit_requests FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff'
    )
  );

-- 8. Creditors can create credit requests
CREATE POLICY "Creditors can create credit requests" 
  ON public.credit_requests FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'creditor'
    )
  );

-- 9. Admins can update credit requests
CREATE POLICY "Admins can update credit requests" 
  ON public.credit_requests FOR UPDATE 
  TO authenticated
  USING (public.is_admin());

-- 10. Staff can update credit requests
CREATE POLICY "Staff can update credit requests" 
  ON public.credit_requests FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff'
    )
  );

-- 11. Creditors can update credit requests
CREATE POLICY "Creditors can update credit requests" 
  ON public.credit_requests FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'creditor'
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.credit_requests TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that all policies were created
SELECT polname, relname 
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'credit_requests'
ORDER BY polname;