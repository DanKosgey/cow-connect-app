-- Simple SQL script to test staff performance population

-- 1. Get a sample staff member
SELECT id as staff_id, user_id FROM public.staff LIMIT 1;

-- 2. Check user role for that staff member
-- SELECT user_id, role, active FROM public.user_roles WHERE user_id = 'user_id_from_above';

-- 3. Test the update function with a specific staff ID
-- SELECT public.update_staff_performance(
--   'staff_id_from_above',
--   CURRENT_DATE - INTERVAL '30 days',
--   CURRENT_DATE
-- );

-- 4. Check if record was created
-- SELECT * FROM public.staff_performance WHERE staff_id = 'staff_id_from_above' LIMIT 1;