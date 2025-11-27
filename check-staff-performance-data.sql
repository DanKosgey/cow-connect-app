-- Check staff performance data structure and content

-- 1. Check what data we have
SELECT 
  sp.id,
  sp.staff_id,
  sp.period_start,
  sp.period_end,
  sp.total_approvals,
  sp.accuracy_score,
  s.user_id as staff_user_id,
  p.full_name
FROM public.staff_performance sp
JOIN public.staff s ON sp.staff_id = s.id
JOIN public.profiles p ON s.user_id = p.id
ORDER BY sp.created_at DESC
LIMIT 10;

-- 2. Check current date range for monthly view
SELECT 
  CURRENT_DATE as today,
  DATE_TRUNC('month', CURRENT_DATE) as month_start,
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day') as month_end;

-- 3. Check what should be returned with our new query logic
SELECT 
  sp.id,
  sp.staff_id,
  sp.period_start,
  sp.period_end,
  sp.total_approvals,
  sp.accuracy_score
FROM public.staff_performance sp
WHERE sp.period_start <= CURRENT_DATE  -- period starts before or during our range
AND sp.period_end >= DATE_TRUNC('month', CURRENT_DATE)  -- period ends after or during our range
ORDER BY sp.accuracy_score DESC
LIMIT 10;