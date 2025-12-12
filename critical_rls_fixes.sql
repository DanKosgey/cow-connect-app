-- Critical RLS Policy Fixes for Recursion Issues
-- Run this in your Supabase SQL Editor

-- Fix deduction system tables
DROP POLICY IF EXISTS "Admins can manage deduction types" ON public.deduction_types;
DROP POLICY IF EXISTS "Admins can manage farmer deductions" ON public.farmer_deductions;
DROP POLICY IF EXISTS "Admins can manage deduction records" ON public.deduction_records;

CREATE POLICY "Admins can manage deduction types" ON public.deduction_types
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage farmer deductions" ON public.farmer_deductions
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage deduction records" ON public.deduction_records
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');

-- Fix collector_payments table
DROP POLICY IF EXISTS "Admins can view all collector payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can insert collector payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can update collector payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can delete collector payments" ON public.collector_payments;

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