-- Migration: 20251212000800_fix_collector_payments_rls_policies.sql
-- Description: Fix RLS policies for collector_payments table to avoid recursion
-- This fixes the issue where collector_payments RLS policies were causing recursion by checking user_roles table directly

BEGIN;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all collector payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can insert collector payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can update collector payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can delete collector payments" ON public.collector_payments;

-- Create new policies using the secure function to avoid recursion
CREATE POLICY "Admins can view all collector payments" 
ON public.collector_payments 
FOR SELECT 
TO authenticated 
USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert collector payments" 
ON public.collector_payments 
FOR INSERT 
TO authenticated 
WITH CHECK (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can update collector payments" 
ON public.collector_payments 
FOR UPDATE 
TO authenticated 
USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete collector payments" 
ON public.collector_payments 
FOR DELETE 
TO authenticated 
USING (public.get_user_role_secure(auth.uid()) = 'admin');

-- Ensure proper permissions
GRANT ALL ON public.collector_payments TO authenticated;

COMMIT;

-- Verification queries
-- Check that the policies were created
SELECT polname FROM pg_policy WHERE polrelid = 'collector_payments'::regclass;