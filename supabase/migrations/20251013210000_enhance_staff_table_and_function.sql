-- Migration: 20251013210000_enhance_staff_table_and_function.sql
-- Description: Enhance staff table with additional fields and improve assign-role function
-- Rollback: ALTER TABLE public.staff DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS department, DROP COLUMN IF EXISTS position;

BEGIN;

-- Enhance staff table with additional fields for better staff management
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS "position" TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.staff(id);

-- Create indexes for the new columns
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

-- Update the assign-role Edge Function to properly populate staff records
-- This will be handled in the Edge Function code, but we can create a helper function
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

COMMIT;