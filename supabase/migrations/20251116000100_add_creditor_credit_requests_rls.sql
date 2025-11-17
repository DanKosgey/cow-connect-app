-- Migration: Add RLS policies for creditors to access credit requests
-- Description: Allow creditors to view and manage credit requests
-- Estimated time: 15 seconds

BEGIN;

-- Add policy for creditors to view all credit requests
CREATE POLICY "Creditors can view all credit requests" 
  ON public.credit_requests FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'creditor'
    )
  );

-- Add policy for creditors to update credit requests (for approval/rejection)
CREATE POLICY "Creditors can update credit requests" 
  ON public.credit_requests FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'creditor'
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%Creditors can view all credit requests%';
SELECT polname FROM pg_policy WHERE polname LIKE '%Creditors can update credit requests%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the policies
DROP POLICY IF EXISTS "Creditors can view all credit requests" ON public.credit_requests;
DROP POLICY IF EXISTS "Creditors can update credit requests" ON public.credit_requests;

COMMIT;
*/