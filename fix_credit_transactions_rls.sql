-- SQL Script to fix RLS policies for credit_transactions table to allow farmers to create transactions
-- Run this script in your Supabase SQL editor

BEGIN;

-- Allow farmers to create their own credit transactions
-- This is needed when farmers request credit for purchases
DROP POLICY IF EXISTS "Farmers can create their own credit transactions" ON public.credit_transactions;

CREATE POLICY "Farmers can create their own credit transactions" 
  ON public.credit_transactions FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'farmer'
      AND ur.active = true
    )
    AND farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );

-- Allow farmers to view their own credit transactions (if not already exists)
DROP POLICY IF EXISTS "Farmers can view their own credit transactions" ON public.credit_transactions;

CREATE POLICY "Farmers can view their own credit transactions" 
  ON public.credit_transactions FOR SELECT 
  USING (
    farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%Farmers%credit%transactions%';