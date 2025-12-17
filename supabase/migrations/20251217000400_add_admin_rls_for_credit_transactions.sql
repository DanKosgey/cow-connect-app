-- Migration: 20251217000400_add_admin_rls_for_credit_transactions.sql
-- Description: Add proper RLS policies for authenticated admin users on credit_transactions table

BEGIN;

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Admins can read credit_transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can insert credit_transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can update credit_transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can delete credit_transactions" ON public.credit_transactions;

-- Create new policies using the is_admin function for consistency
-- 1. Admins can read all credit transactions
CREATE POLICY "Admins can read credit_transactions" 
  ON public.credit_transactions FOR SELECT 
  TO authenticated
  USING (public.is_admin());

-- 2. Admins can insert credit transactions
CREATE POLICY "Admins can insert credit_transactions" 
  ON public.credit_transactions FOR INSERT 
  TO authenticated
  WITH CHECK (public.is_admin());

-- 3. Admins can update credit transactions
CREATE POLICY "Admins can update credit_transactions" 
  ON public.credit_transactions FOR UPDATE 
  TO authenticated
  USING (public.is_admin());

-- 4. Admins can delete credit transactions
CREATE POLICY "Admins can delete credit_transactions" 
  ON public.credit_transactions FOR DELETE 
  TO authenticated
  USING (public.is_admin());

-- Ensure proper permissions
GRANT ALL ON public.credit_transactions TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that all policies were created
SELECT polname, relname 
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'credit_transactions'
ORDER BY polname;