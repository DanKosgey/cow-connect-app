-- Fix Script: FIX_ADMIN_USER_ROLES.sql
-- Description: Fix the admin user roles if they're missing or incorrect

BEGIN;

-- First, check if the user exists in auth.users
-- If not, we can't fix the roles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e') THEN
    -- Check if the user exists in profiles
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e') THEN
      -- Insert the profile if it doesn't exist
      INSERT INTO public.profiles (id, full_name, email)
      SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Admin User'), email
      FROM auth.users
      WHERE id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e'
      ON CONFLICT (id) DO NOTHING;
    END IF;
    
    -- Check if the user has an active admin role
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e' AND role = 'admin' AND active = true) THEN
      -- Remove any inactive admin roles
      DELETE FROM public.user_roles 
      WHERE user_id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e' AND role = 'admin';
      
      -- Insert the active admin role
      INSERT INTO public.user_roles (user_id, role, active)
      VALUES ('eec68d01-fb71-4381-b06d-ffb593b3f21e', 'admin', true);
    END IF;
  ELSE
    RAISE NOTICE 'User with ID eec68d01-fb71-4381-b06d-ffb593b3f21e does not exist in auth.users';
  END IF;
END $$;

COMMIT;

-- Verify the fix
SELECT ur.id, ur.user_id, ur.role, ur.active, ur.created_at
FROM public.user_roles ur
WHERE ur.user_id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e';