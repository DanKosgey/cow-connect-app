-- Fix RLS policies for credit_transactions table to allow admin users full access
-- This script can be run directly in the Supabase SQL editor

BEGIN;

-- First, check what policies currently exist
-- SELECT polname FROM pg_policy pol JOIN pg_class pc ON pc.oid = pol.polrelid WHERE pc.relname = 'credit_transactions';

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Admins can read credit_transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can insert credit_transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can update credit_transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can delete credit_transactions" ON public.credit_transactions;

-- Create comprehensive policies for admin users using the is_admin function
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

-- Ensure proper permissions are granted
GRANT ALL ON public.credit_transactions TO authenticated;

COMMIT;

-- Verification query - run this separately to check if policies were created
/*
SELECT polname, relname 
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'credit_transactions'
ORDER BY polname;
*/