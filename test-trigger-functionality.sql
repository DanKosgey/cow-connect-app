-- Test script to verify trigger functionality

-- 1. First, check if our functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%staff_performance%';

-- 2. Check if trigger exists
SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE '%staff_performance%';

-- 3. Check if we have any staff members
SELECT id, user_id FROM public.staff LIMIT 3;

-- 4. Check if we have any existing milk approvals
SELECT id, staff_id, created_at FROM public.milk_approvals LIMIT 3;

-- 5. Check if we have any existing staff_performance records
SELECT id, staff_id, period_start, period_end, total_approvals FROM public.staff_performance LIMIT 3;

-- 6. Test inserting a milk approval to see if it triggers the performance update
-- (This would need to be done with a real staff ID and collection ID)
-- INSERT INTO public.milk_approvals (staff_id, collection_id, company_received_liters, variance_liters, variance_percentage, variance_type, penalty_amount)
-- VALUES ('actual_staff_id', 'actual_collection_id', 100, 0, 0, 'none', 0);