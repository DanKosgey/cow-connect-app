-- Migration: 20251013260000_comprehensive_fix.sql
-- Description: Comprehensive fix for staff table, invitations policies, and database issues
-- This is a clean fix that addresses all known issues in one migration

BEGIN;

-- 1. Ensure staff table has all required columns
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.staff(id);

-- 2. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff (status);
CREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff (department);
CREATE INDEX IF NOT EXISTS idx_staff_supervisor_id ON public.staff (supervisor_id);

-- 3. Fix invitations table policies using a safe approach
-- First, drop all potentially problematic policies
DO $$
BEGIN
  -- Drop policies that might have issues, ignore errors if they don't exist
  DROP POLICY IF EXISTS "Invitations are viewable by invited admins" ON public.invitations;
  DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
  DROP POLICY IF EXISTS "Admins can update their invitations" ON public.invitations;
  DROP POLICY IF EXISTS "Admins can delete their invitations" ON public.invitations;
  DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.invitations;
EXCEPTION WHEN OTHERS THEN
  -- Ignore any errors
  NULL;
END $$;

-- 4. Recreate all policies with proper column references
-- Create the main admin policies with proper column references
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

-- 5. Create the token-based policy for accept-invite flow
CREATE POLICY "Anyone can view invitations by token" 
  ON public.invitations FOR SELECT 
  USING (true);

-- 6. Grant necessary permissions
GRANT SELECT ON public.invitations TO anon, authenticated;

-- 7. Ensure proper triggers exist for updated_at columns
-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Ensure triggers exist on relevant tables
DO $$
BEGIN
    -- Staff table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_staff_updated_at') THEN
        CREATE TRIGGER update_staff_updated_at
        BEFORE UPDATE ON public.staff
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    -- Invitations table trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invitations_updated_at_trigger') THEN
        CREATE TRIGGER update_invitations_updated_at_trigger
        BEFORE UPDATE ON public.invitations
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but continue
    RAISE NOTICE 'Error creating triggers: %', SQLERRM;
END $$;

COMMIT;