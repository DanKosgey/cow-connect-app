-- Migration: Fix RLS policies for staff management
-- Description: Ensure admins can access user_roles data for staff management

BEGIN;

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;

-- Create a more permissive policy for admins in the staff management context
CREATE POLICY "Admins can view user roles for staff management"
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  -- Allow admins to see all roles
  EXISTS (
    SELECT 1 FROM public.user_roles admin_ur
    WHERE admin_ur.user_id = auth.uid()
      AND admin_ur.role = 'admin'
      AND admin_ur.active = true
  )
  OR
  -- Allow users to see their own roles
  auth.uid() = user_id
);

COMMIT;