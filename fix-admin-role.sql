-- Script to fix admin role issue
-- Run this in your Supabase SQL Editor

BEGIN;

-- 1. Ensure the profile exists
INSERT INTO public.profiles (id, email, created_at, updated_at)
VALUES ('eec68d01-fb71-4381-b06d-ffb593b3f21e', 'admin@g.com', now(), now())
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();

-- 2. Ensure the user has an active admin role
INSERT INTO public.user_roles (user_id, role, active, created_at)
VALUES ('eec68d01-fb71-4381-b06d-ffb593b3f21e', 'admin', true, now())
ON CONFLICT (user_id, role) DO UPDATE
  SET active = true,
      created_at = EXCLUDED.created_at;

COMMIT;

-- 3. Verify the fix
SELECT 
  p.id,
  p.email,
  ur.role,
  ur.active
FROM public.profiles p
JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e';