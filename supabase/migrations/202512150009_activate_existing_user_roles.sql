-- Migration: 202512150009_activate_existing_user_roles.sql
-- Description: Activate all existing user roles that were incorrectly set as inactive
-- This fixes the issue where users had roles assigned but they were marked as inactive

BEGIN;

-- Activate all existing user roles
-- This assumes that if a role was assigned, it should be active
UPDATE public.user_roles 
SET active = true 
WHERE active = false;

-- Add a trigger to automatically activate roles when they're inserted
-- This ensures new roles are active by default
CREATE OR REPLACE FUNCTION public.activate_user_role_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.active := true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activate_user_role_trigger
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_user_role_on_insert();

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that roles are now active
SELECT role, active, COUNT(*) as count
FROM public.user_roles
GROUP BY role, active
ORDER BY role, active;

-- Check specific user
SELECT ur.*, p.email, p.full_name
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE p.email = 'staff1@gmail.com';