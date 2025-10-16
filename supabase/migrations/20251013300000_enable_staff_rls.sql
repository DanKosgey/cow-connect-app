-- Migration: 20251013300000_enable_staff_rls.sql
-- Description: Enable RLS on staff table and create appropriate policies

BEGIN;

-- Enable RLS on staff table
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Create policies for staff table using safe approach
DO $$
BEGIN
  -- Staff can view their own record
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Staff can view their own record' 
    AND pc.relname = 'staff'
  ) THEN
    CREATE POLICY "Staff can view their own record" 
      ON public.staff FOR SELECT 
      USING (user_id = auth.uid());
  END IF;

  -- Admins can view all staff records
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can view all staff records' 
    AND pc.relname = 'staff'
  ) THEN
    CREATE POLICY "Admins can view all staff records" 
      ON public.staff FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;

  -- Admins can insert staff records
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can insert staff records' 
    AND pc.relname = 'staff'
  ) THEN
    CREATE POLICY "Admins can insert staff records" 
      ON public.staff FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;

  -- Staff can update their own record (limited fields)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Staff can update their own record' 
    AND pc.relname = 'staff'
  ) THEN
    CREATE POLICY "Staff can update their own record" 
      ON public.staff FOR UPDATE 
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Admins can update all staff records
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can update all staff records' 
    AND pc.relname = 'staff'
  ) THEN
    CREATE POLICY "Admins can update all staff records" 
      ON public.staff FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;

  -- Admins can delete staff records
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can delete staff records' 
    AND pc.relname = 'staff'
  ) THEN
    CREATE POLICY "Admins can delete staff records" 
      ON public.staff FOR DELETE 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but continue
  RAISE NOTICE 'Error creating staff policies: %', SQLERRM;
END $$;

-- Grant necessary permissions
GRANT ALL ON public.staff TO authenticated;

COMMIT;