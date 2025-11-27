-- Test script to verify timeframe filtering works correctly

-- 1. Check data distribution across different timeframes
SELECT 
  'Monthly' as timeframe,
  COUNT(*) as record_count
FROM public.staff_performance 
WHERE period_start >= DATE_TRUNC('month', CURRENT_DATE)
UNION ALL
SELECT 
  'Quarterly' as timeframe,
  COUNT(*) as record_count
FROM public.staff_performance 
WHERE period_start >= DATE_TRUNC('quarter', CURRENT_DATE)
UNION ALL
SELECT 
  'Yearly' as timeframe,
  COUNT(*) as record_count
FROM public.staff_performance 
WHERE period_start >= DATE_TRUNC('year', CURRENT_DATE);

-- 2. Check specific date ranges for each timeframe
-- Monthly (last 30 days)
SELECT 
  'Monthly (Last 30 days)' as period,
  COUNT(*) as records,
  MIN(period_start) as earliest_date,
  MAX(period_end) as latest_date
FROM public.staff_performance 
WHERE period_start >= CURRENT_DATE - INTERVAL '30 days';

-- Quarterly (last 90 days)
SELECT 
  'Quarterly (Last 90 days)' as period,
  COUNT(*) as records,
  MIN(period_start) as earliest_date,
  MAX(period_end) as latest_date
FROM public.staff_performance 
WHERE period_start >= CURRENT_DATE - INTERVAL '90 days';

-- Yearly (last 365 days)
SELECT 
  'Yearly (Last 365 days)' as period,
  COUNT(*) as records,
  MIN(period_start) as earliest_date,
  MAX(period_end) as latest_date
FROM public.staff_performance 
WHERE period_start >= CURRENT_DATE - INTERVAL '365 days';

-- 3. Check if we have data for current month
SELECT 
  COUNT(*) as current_month_records
FROM public.staff_performance 
WHERE period_start >= DATE_TRUNC('month', CURRENT_DATE)
AND period_end <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';