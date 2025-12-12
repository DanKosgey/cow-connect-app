-- Migration: 20251212000900_fix_credit_system_rls_policies.sql
-- Description: Fix RLS policies for credit system tables to avoid recursion
-- This fixes the issue where credit system RLS policies were causing recursion by checking user_roles table directly

BEGIN;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins and staff can view all credit profiles" ON public.farmer_credit_profiles;
DROP POLICY IF EXISTS "Admins can manage credit profiles" ON public.farmer_credit_profiles;
DROP POLICY IF EXISTS "Admins and staff can view all credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Authorized users can create credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can manage agrovet inventory" ON public.agrovet_inventory;

-- Create new policies using the secure function to avoid recursion
CREATE POLICY "Admins and staff can view all credit profiles" 
  ON public.farmer_credit_profiles FOR SELECT 
  USING (public.get_user_role_secure(auth.uid()) IN ('admin', 'staff'));

CREATE POLICY "Admins can manage credit profiles" 
  ON public.farmer_credit_profiles FOR ALL 
  USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins and staff can view all credit transactions" 
  ON public.credit_transactions FOR SELECT 
  USING (public.get_user_role_secure(auth.uid()) IN ('admin', 'staff'));

CREATE POLICY "Authorized users can create credit transactions" 
  ON public.credit_transactions FOR INSERT 
  WITH CHECK (public.get_user_role_secure(auth.uid()) IN ('admin', 'staff'));

CREATE POLICY "Admins can manage agrovet inventory" 
  ON public.agrovet_inventory FOR ALL 
  USING (public.get_user_role_secure(auth.uid()) = 'admin');

-- Ensure proper permissions
GRANT ALL ON public.farmer_credit_profiles TO authenticated;
GRANT ALL ON public.credit_transactions TO authenticated;
GRANT ALL ON public.agrovet_inventory TO authenticated;

COMMIT;

-- Verification queries
-- Check that the policies were created
SELECT polname FROM pg_policy WHERE polrelid IN (
  'farmer_credit_profiles'::regclass,
  'credit_transactions'::regclass,
  'agrovet_inventory'::regclass
);