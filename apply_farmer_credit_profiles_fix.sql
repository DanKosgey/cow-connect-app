-- Script: apply_farmer_credit_profiles_fix.sql
-- Description: Apply RLS policy fix for farmer_credit_profiles table
-- This script can be run directly to fix the farmer credit profiles RLS issue

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Farmers can view their own credit profile" ON public.farmer_credit_profiles;
DROP POLICY IF EXISTS "Admins and staff can view all credit profiles" ON public.farmer_credit_profiles;
DROP POLICY IF EXISTS "Admins can manage credit profiles" ON public.farmer_credit_profiles;

-- Create updated policies for farmer_credit_profiles
-- Farmers can view their own credit profile
CREATE POLICY "Farmers can view their own credit profile" 
  ON public.farmer_credit_profiles FOR SELECT 
  USING (
    farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );

-- Farmers can create their own credit profile
CREATE POLICY "Farmers can create their own credit profile" 
  ON public.farmer_credit_profiles FOR INSERT 
  WITH CHECK (
    farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );

-- Admins and staff can view all credit profiles
CREATE POLICY "Admins and staff can view all credit profiles" 
  ON public.farmer_credit_profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
    )
  );

-- Admins can manage credit profiles (update/delete)
CREATE POLICY "Admins can manage credit profiles" 
  ON public.farmer_credit_profiles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Verify the policies were created
SELECT polname, polcmd, polroles, polqual, polwithcheck
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'farmer_credit_profiles'
ORDER BY polname;