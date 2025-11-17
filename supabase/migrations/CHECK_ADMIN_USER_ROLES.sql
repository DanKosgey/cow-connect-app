-- Diagnostic Script: CHECK_ADMIN_USER_ROLES.sql
-- Description: Check if the admin user has the correct user_roles entry

-- Check if the user_roles row exists and is active for the admin user
SELECT ur.id, ur.user_id, ur.role, ur.active, ur.created_at
FROM public.user_roles ur
WHERE ur.user_id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e';

-- Check if the user exists in auth.users
SELECT id, email, created_at
FROM auth.users
WHERE id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e';

-- Check if the user exists in profiles
SELECT id, full_name, email, created_at
FROM public.profiles
WHERE id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e';

-- Check all roles for this user
SELECT ur.id, ur.user_id, ur.role, ur.active, ur.created_at
FROM public.user_roles ur
WHERE ur.user_id = 'eec68d01-fb71-4381-b06d-ffb593b3f21e';

-- Check if there are any other users with admin role
SELECT u.email, ur.user_id, ur.role, ur.active
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role = 'admin' AND ur.active = true;

-- Check the user_role_enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role_enum'::regtype;