-- Migration: 202512150008_setup_initial_user_roles.sql
-- Description: Setup initial user roles for existing users based on email patterns
-- This ensures all existing users have appropriate roles assigned

BEGIN;

-- Create a function to determine role based on email pattern
CREATE OR REPLACE FUNCTION public.determine_role_from_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
  IF email ILIKE '%admin%' OR email = 'admin2@g.com' THEN
    RETURN 'admin';
  ELSIF email ILIKE '%collector%' THEN
    RETURN 'collector';
  ELSIF email ILIKE '%staff%' THEN
    RETURN 'staff';
  ELSIF email ILIKE '%farmer%' THEN
    RETURN 'farmer';
  ELSIF email ILIKE '%creditor%' THEN
    RETURN 'creditor';
  ELSE
    -- Default to staff for unknown users
    RETURN 'staff';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert roles for existing users who don't have roles yet
-- This uses the service role to bypass RLS restrictions
INSERT INTO public.user_roles (user_id, role, active)
SELECT 
  p.id as user_id,
  public.determine_role_from_email(p.email) as role,
  true as active
FROM public.profiles p
WHERE p.id NOT IN (
  SELECT DISTINCT user_id 
  FROM public.user_roles 
  WHERE user_id IS NOT NULL
)
AND p.email IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop the helper function as it's no longer needed
DROP FUNCTION IF EXISTS public.determine_role_from_email(TEXT);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check how many roles were assigned
SELECT role, COUNT(*) as count
FROM public.user_roles
GROUP BY role
ORDER BY role;

-- Check for users without roles
SELECT p.id, p.email, p.full_name
FROM public.profiles p
WHERE p.id NOT IN (
  SELECT DISTINCT user_id 
  FROM public.user_roles 
  WHERE user_id IS NOT NULL
);