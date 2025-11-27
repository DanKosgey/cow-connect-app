-- Test script to verify error handling

-- 1. Test with invalid staff ID
SELECT * FROM public.calculate_staff_performance(
  '00000000-0000-0000-0000-000000000000',  -- Invalid UUID
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);

-- 2. Test with invalid date range (start after end)
SELECT * FROM public.calculate_staff_performance(
  '00000000-0000-0000-0000-000000000000',
  CURRENT_DATE,  -- Start date
  CURRENT_DATE - INTERVAL '30 days'  -- End date (before start)
);

-- 3. Test update function with invalid data
SELECT public.update_staff_performance(
  '00000000-0000-0000-0000-000000000000',
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);

-- 4. Check constraints on staff_performance table
-- Test accuracy score bounds
SELECT 
  COUNT(*) as scores_below_zero
FROM public.staff_performance 
WHERE accuracy_score < 0;

SELECT 
  COUNT(*) as scores_above_100
FROM public.staff_performance 
WHERE accuracy_score > 100;

-- 5. Test edge cases in the frontend
-- What happens when there are no staff with 'staff' role?
SELECT COUNT(*) as staff_role_count
FROM public.user_roles 
WHERE role = 'staff' AND active = true;

-- What happens when there are no staff records?
SELECT COUNT(*) as staff_count
FROM public.staff;

-- What happens when there are no milk approvals?
SELECT COUNT(*) as approval_count
FROM public.milk_approvals;