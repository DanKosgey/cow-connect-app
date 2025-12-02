-- Debug Script: check_unpaid_collections.sql
-- Description: Identify collections that should be marked as paid but still show as pending

-- 1. Find collections that are part of paid payment periods but still show as pending
SELECT 
    c.id as collection_id,
    c.collection_date,
    c.liters,
    c.staff_id,
    s.user_id,
    p.full_name as collector_name,
    c.collection_fee_status,
    cp.id as payment_id,
    cp.period_start,
    cp.period_end,
    cp.status as payment_status
FROM collections c
JOIN staff s ON c.staff_id = s.id
JOIN profiles p ON s.user_id = p.id
JOIN collector_payments cp ON c.staff_id = cp.collector_id
WHERE c.approved_for_payment = true
  AND c.status = 'Collected'
  AND c.collection_fee_status = 'pending'
  AND c.collection_date::DATE BETWEEN cp.period_start AND cp.period_end
  AND cp.status = 'paid'
ORDER BY c.collection_date DESC;

-- 2. Find collections that are not associated with any payment period
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
WHERE c.approved_for_payment = true
  AND c.status = 'Collected'
  AND c.collection_fee_status = 'pending'
  AND NOT EXISTS (
      SELECT 1 
      FROM collector_payments cp 
      WHERE c.staff_id = cp.collector_id
        AND c.collection_date::DATE BETWEEN cp.period_start AND cp.period_end
  )
ORDER BY c.collection_date DESC;

-- 3. Check the relationship between payment periods and collections
SELECT 
    cp.id as payment_id,
    cp.collector_id,
    s.user_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    cp.status as payment_status,
    cp.total_collections as expected_collections,
    actual_counts.actual_collection_count as actual_collections,
    cp.total_collections - COALESCE(actual_counts.actual_collection_count, 0) as difference
FROM collector_payments cp
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
LEFT JOIN (
    SELECT 
        c.staff_id,
        COUNT(c.id) as actual_collection_count
    FROM collections c
    WHERE c.approved_for_payment = true
      AND c.status = 'Collected'
      AND c.collection_fee_status = 'pending'
    GROUP BY c.staff_id
) actual_counts ON cp.collector_id = actual_counts.staff_id
WHERE cp.status = 'pending'
ORDER BY cp.created_at DESC;

-- 4. Find overlapping payment periods for the same collector
SELECT 
    cp1.collector_id,
    s.user_id,
    p.full_name as collector_name,
    cp1.period_start as period1_start,
    cp1.period_end as period1_end,
    cp1.status as period1_status,
    cp2.period_start as period2_start,
    cp2.period_end as period2_end,
    cp2.status as period2_status
FROM collector_payments cp1
JOIN collector_payments cp2 ON cp1.collector_id = cp2.collector_id AND cp1.id != cp2.id
JOIN staff s ON cp1.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE (cp1.period_start BETWEEN cp2.period_start AND cp2.period_end
   OR cp1.period_end BETWEEN cp2.period_start AND cp2.period_end
   OR cp2.period_start BETWEEN cp1.period_start AND cp1.period_end
   OR cp2.period_end BETWEEN cp1.period_start AND cp1.period_end)
ORDER BY cp1.collector_id, cp1.period_start;

-- 5. Check collections with mismatched dates
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
WHERE c.approved_for_payment = true
  AND c.status = 'Collected'
  AND c.collection_fee_status = 'pending'
  AND c.collection_date > CURRENT_DATE
ORDER BY c.collection_date DESC;