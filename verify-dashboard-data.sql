-- Script to verify dashboard data

-- 1. Check if staff_performance table has data
SELECT COUNT(*) as total_records FROM public.staff_performance;

-- 2. Check sample data structure
SELECT 
  id,
  staff_id,
  period_start,
  period_end,
  total_approvals,
  total_collections_approved,
  total_liters_approved,
  average_variance_percentage,
  positive_variances,
  negative_variances,
  total_penalty_amount,
  accuracy_score
FROM public.staff_performance 
LIMIT 5;

-- 3. Check if we can join with staff and profiles tables
SELECT 
  sp.id,
  sp.total_approvals,
  sp.accuracy_score,
  s.user_id,
  p.full_name
FROM public.staff_performance sp
JOIN public.staff s ON sp.staff_id = s.id
JOIN public.profiles p ON s.user_id = p.id
LIMIT 5;

-- 4. Check data for current month
SELECT 
  sp.*,
  p.full_name
FROM public.staff_performance sp
JOIN public.staff s ON sp.staff_id = s.id
JOIN public.profiles p ON s.user_id = p.id
WHERE sp.period_start >= DATE_TRUNC('month', CURRENT_DATE)
LIMIT 10;