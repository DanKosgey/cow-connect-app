-- Migration: Add admin access to staff table
-- Description: Ensure admins can access staff table for credit transaction approvals

BEGIN;

-- Add RLS policy for admins to view staff records
-- This is needed for credit transaction approvals where admins need to verify staff records
DROP POLICY IF EXISTS "Admins can view staff records" ON public.staff;
CREATE POLICY "Admins can view staff records" 
  ON public.staff FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Add RLS policy for admins to manage staff records (if needed)
DROP POLICY IF EXISTS "Admins can manage staff records" ON public.staff;
CREATE POLICY "Admins can manage staff records" 
  ON public.staff FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Ensure the policy is applied
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.staff TO authenticated;

COMMIT;