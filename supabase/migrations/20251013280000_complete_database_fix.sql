-- Migration: 20251013280000_complete_database_fix.sql
-- Description: Complete database fix for all known issues
-- This migration addresses all policy conflicts and schema issues in one comprehensive migration

BEGIN;

-- 1. Ensure staff table has all required columns with proper constraints
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS "position" TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.staff(id);

-- 2. Create indexes for new columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff (status);
CREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff (department);
CREATE INDEX IF NOT EXISTS idx_staff_position ON public.staff ("position");
CREATE INDEX IF NOT EXISTS idx_staff_supervisor_id ON public.staff (supervisor_id);

-- 3. Fix invitations table policies using a comprehensive safe approach
-- First, drop all potentially problematic policies if they exist
DO $$
BEGIN
  -- Drop policies that might exist on remote, ignore errors if they don't exist
  DROP POLICY IF EXISTS "Invitations are viewable by invited admins" ON public.invitations;
  DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
  DROP POLICY IF EXISTS "Admins can update their invitations" ON public.invitations;
  DROP POLICY IF EXISTS "Admins can delete their invitations" ON public.invitations;
  DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.invitations;
EXCEPTION WHEN OTHERS THEN
  -- Ignore any errors
  RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- 4. Recreate all policies with proper column references using safe creation
-- Create policies only if they don't already exist
DO $$
BEGIN
  -- Check if "Invitations are viewable by invited admins" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Invitations are viewable by invited admins' 
    AND pc.relname = 'invitations'
  ) THEN
    CREATE POLICY "Invitations are viewable by invited admins" 
      ON public.invitations FOR SELECT 
      USING (
        invited_by IN (
          SELECT p.id FROM public.profiles p
          JOIN public.user_roles ur ON p.id = ur.user_id
          WHERE ur.role = 'admin'
        )
      );
  END IF;

  -- Check if "Admins can create invitations" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can create invitations' 
    AND pc.relname = 'invitations'
  ) THEN
    CREATE POLICY "Admins can create invitations" 
      ON public.invitations FOR INSERT 
      WITH CHECK (
        invited_by IN (
          SELECT p.id FROM public.profiles p
          JOIN public.user_roles ur ON p.id = ur.user_id
          WHERE ur.role = 'admin'
        )
      );
  END IF;

  -- Check if "Admins can update their invitations" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can update their invitations' 
    AND pc.relname = 'invitations'
  ) THEN
    CREATE POLICY "Admins can update their invitations" 
      ON public.invitations FOR UPDATE 
      USING (
        invited_by IN (
          SELECT p.id FROM public.profiles p
          JOIN public.user_roles ur ON p.id = ur.user_id
          WHERE ur.role = 'admin'
        )
      );
  END IF;

  -- Check if "Admins can delete their invitations" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can delete their invitations' 
    AND pc.relname = 'invitations'
  ) THEN
    CREATE POLICY "Admins can delete their invitations" 
      ON public.invitations FOR DELETE 
      USING (
        invited_by IN (
          SELECT p.id FROM public.profiles p
          JOIN public.user_roles ur ON p.id = ur.user_id
          WHERE ur.role = 'admin'
        )
      );
  END IF;

  -- Check if "Anyone can view invitations by token" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Anyone can view invitations by token' 
    AND pc.relname = 'invitations'
  ) THEN
    CREATE POLICY "Anyone can view invitations by token" 
      ON public.invitations FOR SELECT 
      USING (true);
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but continue
  RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- 5. Grant necessary permissions
GRANT SELECT ON public.invitations TO anon, authenticated;

-- 6. Ensure proper triggers exist for updated_at columns
-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Ensure triggers exist on relevant tables
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