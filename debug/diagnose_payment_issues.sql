-- Debug Script: diagnose_payment_issues.sql
-- Description: Diagnose and identify issues with the collector payment system

-- 1. Check for duplicate payment records
SELECT 
    collector_id,
    period_start,
    period_end,
    COUNT(*) as duplicate_count
FROM collector_payments
GROUP BY collector_id, period_start, period_end
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. Check for payments with extreme penalty amounts
SELECT 
    cp.id,
    s.user_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    cp.total_collections,
    cp.total_earnings,
    cp.total_penalties,
    cp.adjusted_earnings,
    cp.status
FROM collector_payments cp
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE cp.total_penalties > 5000
ORDER BY cp.total_penalties DESC;

-- 3. Check for payments with negative adjusted earnings
SELECT 
    cp.id,
    s.user_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    cp.total_earnings,
    cp.total_penalties,
    cp.adjusted_earnings,
    cp.status
FROM collector_payments cp
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE cp.adjusted_earnings < 0
ORDER BY cp.adjusted_earnings ASC;

-- 4. Check for collectors with no payment records but have approved collections
SELECT 
    s.id as staff_id,
    p.full_name as collector_name,
    COUNT(c.id) as approved_collection_count,
    SUM(c.liters) as total_liters
FROM staff s
JOIN profiles p ON s.user_id = p.id
JOIN collections c ON s.id = c.staff_id
WHERE c.approved_for_payment = true
  AND c.status = 'Collected'
  AND NOT EXISTS (
      SELECT 1 
      FROM collector_payments cp 
      WHERE cp.collector_id = s.id
  )
GROUP BY s.id, p.full_name
HAVING COUNT(c.id) > 0
ORDER BY approved_collection_count DESC;

-- 5. Check the relationship between collections and penalties
SELECT 
    s.id as staff_id,
    p.full_name as collector_name,
    COUNT(c.id) as total_collections,
    COUNT(c.id) FILTER (WHERE c.approved_for_payment = true) as approved_collections,
    COUNT(ma.id) as penalty_records,
    SUM(ma.penalty_amount) as total_penalties,
    AVG(ma.penalty_amount) as avg_penalty_per_record
FROM staff s
JOIN profiles p ON s.user_id = p.id
LEFT JOIN collections c ON s.id = c.staff_id
LEFT JOIN milk_approvals ma ON c.id = ma.collection_id AND ma.penalty_amount IS NOT NULL
WHERE EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = s.user_id AND ur.role = 'collector' AND ur.active = true
)
GROUP BY s.id, p.full_name
ORDER BY total_penalties DESC NULLS LAST;

-- 6. Check for collections that are approved but don't have corresponding milk approvals
SELECT 
    c.id as collection_id,
    c.collection_date,
    c.liters,
    c.staff_id,
    s.user_id,
    p.full_name as collector_name,
    c.approved_for_payment,
    c.collection_fee_status
FROM collections c
JOIN staff s ON c.staff_id = s.id
JOIN profiles p ON s.user_id = p.id
WHERE c.approved_for_payment = true
  AND c.status = 'Collected'
  AND NOT EXISTS (
      SELECT 1 
      FROM milk_approvals ma 
      WHERE ma.collection_id = c.id
  )
ORDER BY c.collection_date DESC;

-- 7. Check the current collector rate
SELECT 
    id,
    rate_per_liter,
    effective_from,
    is_active
FROM collector_rates
ORDER BY effective_from DESC;

-- 8. Check for any orphaned payment records (collector no longer exists)
SELECT 
    cp.id,
    cp.collector_id,
    cp.period_start,
    cp.period_end,
    cp.total_earnings,
    cp.status
FROM collector_payments cp
WHERE NOT EXISTS (
    SELECT 1 
    FROM staff s 
    WHERE s.id = cp.collector_id
);

-- 9. Check the structure of the collector_payments table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'collector_payments'
ORDER BY ordinal_position;

-- 10. Check indexes on collector_payments table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'collector_payments';