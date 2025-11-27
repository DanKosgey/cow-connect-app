-- Migration: 20251127000400_add_staff_validation_constraints.sql
-- Description: Add constraints and indexes to ensure proper staff validation for milk approvals
-- This ensures that only valid staff members can approve collections

BEGIN;

-- Ensure staff table has proper constraints
ALTER TABLE public.staff 
ADD CONSTRAINT staff_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_user_id 
ON public.staff (user_id);

-- Add index on employee_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_employee_id 
ON public.staff (employee_id);

-- Ensure milk_approvals table has proper constraints
ALTER TABLE public.milk_approvals 
ADD CONSTRAINT milk_approvals_staff_id_fkey 
FOREIGN KEY (staff_id) 
REFERENCES public.staff(id) 
ON DELETE CASCADE;

-- Add index on staff_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_milk_approvals_staff_id 
ON public.milk_approvals (staff_id);

-- Add index on collection_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_milk_approvals_collection_id 
ON public.milk_approvals (collection_id);

-- Create a function to validate staff membership
CREATE OR REPLACE FUNCTION public.validate_staff_membership(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.staff s
    JOIN public.user_roles ur ON s.user_id = ur.user_id
    WHERE s.user_id = p_user_id
    AND ur.role IN ('staff', 'admin')
    AND ur.active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get staff ID from user ID with validation
CREATE OR REPLACE FUNCTION public.get_staff_id_from_user(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  SELECT s.id INTO v_staff_id
  FROM public.staff s
  WHERE s.user_id = p_user_id;
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'User does not have a staff record. Only staff members can approve collections.';
  END IF;
  
  RETURN v_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that constraints were created
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname IN ('staff_user_id_fkey', 'milk_approvals_staff_id_fkey')
ORDER BY conname;

-- Check that indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE indexname IN ('idx_staff_user_id', 'idx_staff_employee_id', 'idx_milk_approvals_staff_id', 'idx_milk_approvals_collection_id')
ORDER BY indexname;

-- Test the validation functions
-- SELECT public.validate_staff_membership('some-user-id');
-- SELECT public.get_staff_id_from_user('some-user-id');

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop functions
DROP FUNCTION IF EXISTS public.validate_staff_membership(uuid);
DROP FUNCTION IF EXISTS public.get_staff_id_from_user(uuid);

-- Drop indexes
DROP INDEX IF EXISTS idx_milk_approvals_collection_id;
DROP INDEX IF EXISTS idx_milk_approvals_staff_id;
DROP INDEX IF EXISTS idx_staff_employee_id;
DROP INDEX IF EXISTS idx_staff_user_id;

-- Drop constraints
ALTER TABLE public.milk_approvals 
DROP CONSTRAINT IF EXISTS milk_approvals_staff_id_fkey;

ALTER TABLE public.staff 
DROP CONSTRAINT IF EXISTS staff_user_id_fkey;

COMMIT;
*/