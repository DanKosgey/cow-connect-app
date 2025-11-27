-- Test script to verify staff performance functions are working correctly

-- 1. Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%staff_performance%';

-- 2. Get a sample staff member
SELECT id as staff_id FROM public.staff LIMIT 1;

-- 3. Test calculate_staff_performance function (replace 'staff_id_here' with actual staff ID)
-- SELECT * FROM public.calculate_staff_performance(
--   'staff_id_here',
--   CURRENT_DATE - INTERVAL '30 days',
--   CURRENT_DATE
-- );

-- 4. Test update_staff_performance function (replace 'staff_id_here' with actual staff ID)
-- SELECT public.update_staff_performance(
--   'staff_id_here',
--   CURRENT_DATE - INTERVAL '30 days',
--   CURRENT_DATE
-- );

-- 5. Check if data was inserted in staff_performance table
-- SELECT * FROM public.staff_performance LIMIT 5;

-- 6. Check if trigger exists
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%staff_performance%';