-- Migration: 20251214000100_create_staff_table_with_rls_policies.sql
-- Description: Create staff table with all required columns and comprehensive RLS policies for all roles
-- Estimated time: 2 minutes

BEGIN;

-- Create staff table with all required columns
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id text UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  department TEXT,
  "position" TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  supervisor_id UUID REFERENCES public.staff(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON public.staff (employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff (status);
CREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff (department);
CREATE INDEX IF NOT EXISTS idx_staff_position ON public.staff ("position");
CREATE INDEX IF NOT EXISTS idx_staff_supervisor_id ON public.staff (supervisor_id);

-- Create or replace function to generate employee ID with better format
CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS TEXT AS $$
BEGIN
    RETURN 'EMP' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create helper function to initialize staff records
CREATE OR REPLACE FUNCTION public.initialize_staff_record(p_user_id UUID, p_full_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Insert staff record with proper initialization
    INSERT INTO public.staff (
        user_id,
        employee_id,
        department,
        "position",
        hire_date,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        public.generate_employee_id(),
        'General',  -- Default department
        'Staff Member',  -- Default position
        CURRENT_DATE,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;  -- Avoid duplicate staff records
    
    -- Also update the profile with the full name if not already set
    UPDATE public.profiles 
    SET full_name = p_full_name,
        updated_at = NOW()
    WHERE id = p_user_id AND (full_name IS NULL OR full_name = '');
    
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE NOTICE 'Failed to initialize staff record for user %: %', p_user_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get staff details with user information
CREATE OR REPLACE FUNCTION public.get_staff_details()
RETURNS TABLE (
    id UUID,
    employee_id TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    department TEXT,
    "position" TEXT,
    status TEXT,
    hire_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.employee_id,
        p.full_name,
        p.email,
        p.phone,
        s.department,
        s."position",
        s.status,
        s.hire_date
    FROM public.staff s
    JOIN public.profiles p ON s.user_id = p.id
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on staff table
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;

-- STAFF TABLE RLS POLICIES

-- ============================================
-- ADMIN ROLE POLICIES
-- ============================================

-- Allow admins to view all staff records
DROP POLICY IF EXISTS "Admins can read staff" ON public.staff;
CREATE POLICY "Admins can read staff" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Allow admins to insert staff records
DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff;
CREATE POLICY "Admins can insert staff" 
  ON public.staff FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Allow admins to update staff records
DROP POLICY IF EXISTS "Admins can update staff" ON public.staff;
CREATE POLICY "Admins can update staff" 
  ON public.staff FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Allow admins to delete staff records
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;
CREATE POLICY "Admins can delete staff" 
  ON public.staff FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ============================================
-- STAFF ROLE POLICIES
-- ============================================

-- Allow staff to view their own record
DROP POLICY IF EXISTS "Staff can read their own record" ON public.staff;
CREATE POLICY "Staff can read their own record" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Allow staff to update their own record
DROP POLICY IF EXISTS "Staff can update their own record" ON public.staff;
CREATE POLICY "Staff can update their own record" 
  ON public.staff FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- COLLECTOR ROLE POLICIES
-- ============================================

-- Allow collectors to view their own record
DROP POLICY IF EXISTS "Collectors can read their own record" ON public.staff;
CREATE POLICY "Collectors can read their own record" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- Allow collectors to update their own record
DROP POLICY IF EXISTS "Collectors can update their own record" ON public.staff;
CREATE POLICY "Collectors can update their own record" 
  ON public.staff FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- CREDITOR ROLE POLICIES
-- ============================================

-- Allow creditors to view staff records they work with
DROP POLICY IF EXISTS "Creditors can read staff records" ON public.staff;
CREATE POLICY "Creditors can read staff records" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- Grant necessary permissions
GRANT ALL ON public.staff TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that table was created
SELECT table_name FROM information_schema.tables WHERE table_name = 'staff';

-- Check that columns were created
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'staff' ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'staff';

-- Check that RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'staff';

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polrelid = 'staff'::regclass;