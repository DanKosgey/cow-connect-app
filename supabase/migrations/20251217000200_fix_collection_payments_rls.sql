-- Migration: 20251217000200_fix_collection_payments_rls.sql
-- Description: Fix inconsistent RLS policies for collection_payments table to ensure admin access

BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage collection payments" ON public.collection_payments;
DROP POLICY IF EXISTS "Admins and staff can view collection payments" ON public.collection_payments;
DROP POLICY IF EXISTS "Admins can read collection_payments" ON public.collection_payments;
DROP POLICY IF EXISTS "Admins can insert collection_payments" ON public.collection_payments;
DROP POLICY IF EXISTS "Admins can update collection_payments" ON public.collection_payments;
DROP POLICY IF EXISTS "Admins can delete collection_payments" ON public.collection_payments;

-- Create consistent policies for admins only
-- Admins can read collection payments
CREATE POLICY "Admins can read collection_payments" 
  ON public.collection_payments FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Admins can insert collection payments
CREATE POLICY "Admins can insert collection_payments" 
  ON public.collection_payments FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Admins can update collection payments
CREATE POLICY "Admins can update collection_payments" 
  ON public.collection_payments FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Admins can delete collection payments
CREATE POLICY "Admins can delete collection_payments" 
  ON public.collection_payments FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Ensure RLS is enabled
ALTER TABLE public.collection_payments ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.collection_payments TO authenticated;

COMMIT;