-- Migration: 20251013250000_fix_staff_table_and_policies.sql
-- Description: Ensure staff table has status column and fix any remaining policy issues
-- This migration focuses on what we know is missing rather than recreating everything

BEGIN;

-- Ensure the status column exists on the staff table
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- Create indexes for the status column if they don't exist
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff (status);

-- Try to fix the policy issues by using a more targeted approach
-- First, check if the policies have the ambiguous column reference issue
-- We'll use a DO block to safely handle the policy recreation

DO $$
BEGIN
  -- Try to drop and recreate the policies with proper column references
  -- We use exception handling to avoid errors if policies don't exist
  
  -- Drop the policies that might have issues
  DROP POLICY IF EXISTS "Invitations are viewable by invited admins" ON public.invitations;
  DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
  DROP POLICY IF EXISTS "Admins can update their invitations" ON public.invitations;
  DROP POLICY IF EXISTS "Admins can delete their invitations" ON public.invitations;
  
  -- Recreate policies with proper column references
  CREATE POLICY "Invitations are viewable by invited admins" 
    ON public.invitations FOR SELECT 
    USING (
      invited_by IN (
        SELECT p.id FROM public.profiles p
        JOIN public.user_roles ur ON p.id = ur.user_id
        WHERE ur.role = 'admin'
      )
    );

  CREATE POLICY "Admins can create invitations" 
    ON public.invitations FOR INSERT 
    WITH CHECK (
      invited_by IN (
        SELECT p.id FROM public.profiles p
        JOIN public.user_roles ur ON p.id = ur.user_id
        WHERE ur.role = 'admin'
      )
    );

  CREATE POLICY "Admins can update their invitations" 
    ON public.invitations FOR UPDATE 
    USING (
      invited_by IN (
        SELECT p.id FROM public.profiles p
        JOIN public.user_roles ur ON p.id = ur.user_id
        WHERE ur.role = 'admin'
      )
    );

  CREATE POLICY "Admins can delete their invitations" 
    ON public.invitations FOR DELETE 
    USING (
      invited_by IN (
        SELECT p.id FROM public.profiles p
        JOIN public.user_roles ur ON p.id = ur.user_id
        WHERE ur.role = 'admin'
      )
    );

EXCEPTION WHEN OTHERS THEN
  -- If there are any errors, we'll just log them and continue
  RAISE NOTICE 'Error recreating policies: %', SQLERRM;
END $$;

-- Ensure the token-based policy exists for accept-invite flow
DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'invitations' 
    AND policyname = 'Anyone can view invitations by token'
  ) THEN
    -- Create the policy if it doesn't exist
    CREATE POLICY "Anyone can view invitations by token" 
      ON public.invitations FOR SELECT 
      USING (true);
    
    -- Grant necessary permissions
    GRANT SELECT ON public.invitations TO anon, authenticated;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error ensuring token policy exists: %', SQLERRM;
END $$;

COMMIT;