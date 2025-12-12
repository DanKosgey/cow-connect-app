-- Migration: 20251212000600_setup_existing_users.sql
-- Description: Setup existing users with proper profiles and roles
-- This ensures all existing users have profiles and appropriate roles assigned

BEGIN;

-- 1. Ensure all existing auth.users have profiles
-- Insert profiles for users that don't have them
INSERT INTO public.profiles (id, full_name, email, phone)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  au.email,
  COALESCE(au.raw_user_meta_data->>'phone', '')
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Assign roles to specific users based on their emails
-- Admin user
INSERT INTO public.user_roles (user_id, role, active)
SELECT id, 'admin', true
FROM public.profiles
WHERE email = 'admin@g.com'
ON CONFLICT (user_id, role) DO UPDATE
SET active = true;

-- Staff user
INSERT INTO public.user_roles (user_id, role, active)
SELECT id, 'staff', true
FROM public.profiles
WHERE email = 'staff1@gmail.com'
ON CONFLICT (user_id, role) DO UPDATE
SET active = true;

-- Collector user
INSERT INTO public.user_roles (user_id, role, active)
SELECT id, 'collector', true
FROM public.profiles
WHERE email = 'collector2@gmail.com'
ON CONFLICT (user_id, role) DO UPDATE
SET active = true;

-- Farmer users
INSERT INTO public.user_roles (user_id, role, active)
SELECT id, 'farmer', true
FROM public.profiles
WHERE email IN ('farmer3@gmaill.com', 'farmer4@gmail.com')
ON CONFLICT (user_id, role) DO UPDATE
SET active = true;

-- 3. Create the handle_new_user function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile for the user
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING; -- In case profile already exists
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't stop the signup process
    RAISE NOTICE 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger on auth.users if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- Verification queries
-- Check that all users now have profiles
SELECT COUNT(*) as total_profiles FROM profiles;

-- Check that all users now have roles
SELECT COUNT(*) as total_user_roles FROM user_roles;

-- Check specific user roles
SELECT 
  p.email,
  ur.role,
  ur.active
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email IN ('admin@g.com', 'staff1@gmail.com', 'collector2@gmail.com', 'farmer3@gmaill.com', 'farmer4@gmail.com')
ORDER BY p.email;