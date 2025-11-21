-- Migration: 20251119000100_fix_farmer_credit_profiles_rls.sql
-- Description: Fix RLS policies for farmer_credit_profiles to allow farmers to create their own profiles
-- This migration addresses the issue where farmers cannot create default credit profiles due to missing INSERT permissions

BEGIN;

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

COMMIT;