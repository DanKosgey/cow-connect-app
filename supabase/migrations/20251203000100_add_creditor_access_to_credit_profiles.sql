-- Migration: Add RLS policies for creditors to access farmer credit profiles and farmers data
-- Description: Allow creditors to view farmer credit profiles and farmer information
-- Estimated time: 15 seconds

BEGIN;

-- Add policy for creditors to view all farmer credit profiles
CREATE POLICY "Creditors can view all credit profiles" 
  ON public.farmer_credit_profiles FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
    )
  );

-- Add policy for creditors to view farmers data
CREATE POLICY "Creditors can view farmers data" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%Creditors can view%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the policies
DROP POLICY IF EXISTS "Creditors can view all credit profiles" ON public.farmer_credit_profiles;
DROP POLICY IF EXISTS "Creditors can view farmers data" ON public.farmers;

COMMIT;
*/