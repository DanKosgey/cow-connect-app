-- Script to apply RLS policies for creditors to access credit requests
-- Run this in your Supabase SQL editor

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