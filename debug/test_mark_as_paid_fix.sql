-- Debug Script: test_mark_as_paid_fix.sql
-- Description: Test the fix for the mark as paid button issue

-- First, let's check the current state of payments and collections
SELECT 
    cp.id as payment_id,
    cp.collector_id,
    s.user_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    cp.total_collections,
    cp.total_liters,
    cp.status as payment_status,
    cp.created_at
FROM collector_payments cp
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
ORDER BY cp.created_at DESC;

-- Check pending collections for each collector
SELECT 
    c.staff_id,
    s.user_id,
    p.full_name as collector_name,
    COUNT(c.id) as pending_collections,
    SUM(c.liters) as pending_liters
FROM collections c
JOIN staff s ON c.staff_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE c.collection_fee_status = 'pending'
  AND c.approved_for_payment = true
  AND c.status = 'Collected'
GROUP BY c.staff_id, s.user_id, p.full_name
ORDER BY p.full_name;

-- Check the specific issue with date formats
SELECT 
    id,
    period_start,
    period_end,
    period_start::DATE as period_start_date,
    period_end::DATE as period_end_date,
    (period_start = period_start::DATE) as start_date_match,
    (period_end = period_end::DATE) as end_date_match
FROM collector_payments
WHERE status = 'pending';

-- Fix any payment date formats
SELECT * FROM public.fix_payment_date_formats();

-- Test the robust mark as paid function with a specific payment
-- Replace 'your-payment-id-here' with an actual pending payment ID from above
-- SELECT public.robust_mark_payment_as_paid('your-payment-id-here'::UUID);

-- After running the fix, check that collections were updated
SELECT 
    c.id as collection_id,
    c.collection_date,
    c.liters,
    c.staff_id,
    s.user_id,
    p.full_name as collector_name,
    c.collection_fee_status,
    c.approved_for_payment
FROM collections c
JOIN staff s ON c.staff_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE c.staff_id IN (
    SELECT DISTINCT collector_id 
    FROM collector_payments 
    WHERE status = 'paid' 
    AND payment_date > NOW() - INTERVAL '1 hour'
)
  AND c.collection_date::DATE BETWEEN (
      SELECT period_start 
      FROM collector_payments 
      WHERE status = 'paid' 
      AND payment_date > NOW() - INTERVAL '1 hour'
      LIMIT 1
  ) AND (
      SELECT period_end 
      FROM collector_payments 
      WHERE status = 'paid' 
      AND payment_date > NOW() - INTERVAL '1 hour'
      LIMIT 1
  )
ORDER BY c.collection_date DESC;

-- Verify the fix worked by checking that no pending collections remain for recently paid periods
SELECT 
    cp.id as payment_id,
    cp.collector_id,
    s.user_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    COUNT(c.id) as remaining_pending_collections
FROM collector_payments cp
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
LEFT JOIN collections c ON c.staff_id = cp.collector_id
    AND c.collection_date::DATE BETWEEN cp.period_start AND cp.period_end
    AND c.collection_fee_status = 'pending'
    AND c.approved_for_payment = true
    AND c.status = 'Collected'
WHERE cp.status = 'paid'
  AND cp.payment_date > NOW() - INTERVAL '1 hour'
GROUP BY cp.id, cp.collector_id, s.user_id, p.full_name, cp.period_start, cp.period_end
HAVING COUNT(c.id) > 0;