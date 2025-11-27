-- Test script to verify accuracy score calculations

-- 1. Test the calculate_staff_performance function with sample data
-- First, get a real staff ID to test with
SELECT id as staff_id FROM public.staff LIMIT 1;

-- 2. Test the calculation with that staff ID
-- SELECT * FROM public.calculate_staff_performance(
--   'actual_staff_id_here',
--   CURRENT_DATE - INTERVAL '30 days',
--   CURRENT_DATE
-- );

-- 3. Check the accuracy score formula components
SELECT 
  sp.total_approvals,
  sp.total_penalty_amount,
  sp.average_variance_percentage,
  sp.accuracy_score,
  -- Manual calculation to verify
  (100 - (sp.total_penalty_amount / 1000) - (ABS(sp.average_variance_percentage) * 2)) as manual_calculation,
  -- Check if they match (within rounding errors)
  ABS(sp.accuracy_score - (100 - (sp.total_penalty_amount / 1000) - (ABS(sp.average_variance_percentage) * 2))) < 0.01 as calculation_correct
FROM public.staff_performance sp
WHERE sp.total_approvals > 0
LIMIT 10;

-- 4. Test edge cases
-- Very high penalties
SELECT 
  staff_id,
  total_penalty_amount,
  accuracy_score
FROM public.staff_performance 
WHERE total_penalty_amount > 5000
LIMIT 5;

-- Very high variance
SELECT 
  staff_id,
  average_variance_percentage,
  accuracy_score
FROM public.staff_performance 
WHERE ABS(average_variance_percentage) > 10
LIMIT 5;

-- Perfect scores (should be 100)
SELECT 
  staff_id,
  total_penalty_amount,
  average_variance_percentage,
  accuracy_score
FROM public.staff_performance 
WHERE accuracy_score = 100
LIMIT 5;

-- Zero scores (should be 0)
SELECT 
  staff_id,
  total_penalty_amount,
  average_variance_percentage,
  accuracy_score
FROM public.staff_performance 
WHERE accuracy_score = 0
LIMIT 5;