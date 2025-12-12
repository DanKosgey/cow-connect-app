-- Migration: 20251212000700_fix_deduction_system_rls_policies.sql
-- Description: Fix RLS policies for deduction system tables to avoid recursion
-- This fixes the issue where deduction system RLS policies were causing recursion by checking user_roles table directly

BEGIN;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can manage deduction types" ON public.deduction_types;
DROP POLICY IF EXISTS "Admins can manage farmer deductions" ON public.farmer_deductions;
DROP POLICY IF EXISTS "Admins can manage deduction records" ON public.deduction_records;

-- Create new policies using the secure function to avoid recursion
CREATE POLICY "Admins can manage deduction types" ON public.deduction_types
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage farmer deductions" ON public.farmer_deductions
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage deduction records" ON public.deduction_records
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');

-- Ensure proper permissions
GRANT ALL ON public.deduction_types TO authenticated;
GRANT ALL ON public.farmer_deductions TO authenticated;
GRANT ALL ON public.deduction_records TO authenticated;

COMMIT;

-- Verification queries
-- Check that the policies were created
SELECT polname FROM pg_policy WHERE polrelid IN (
  'deduction_types'::regclass,
  'farmer_deductions'::regclass,
  'deduction_records'::regclass
);