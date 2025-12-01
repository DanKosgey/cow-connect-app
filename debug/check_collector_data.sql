-- Debug script to check collector payment data

-- 1. Check collector payments
SELECT 
    cp.id,
    cp.collector_id,
    s.id as staff_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    cp.total_collections,
    cp.total_liters,
    cp.rate_per_liter,
    cp.total_earnings,
    cp.status,
    cp.created_at
FROM collector_payments cp
LEFT JOIN staff s ON cp.collector_id = s.id
LEFT JOIN profiles p ON s.user_id = p.id
ORDER BY cp.created_at DESC;

-- 2. Check milk approvals with penalties
SELECT 
    ma.id,
    ma.collection_id,
    ma.staff_id,
    ma.company_received_liters,
    ma.variance_liters,
    ma.variance_percentage,
    ma.variance_type,
    ma.penalty_amount,
    ma.approved_at
FROM milk_approvals ma
WHERE ma.penalty_amount != 0
ORDER BY ma.approved_at DESC;

-- 3. Check collector daily summaries with penalties
SELECT 
    cds.id,
    cds.collector_id,
    cds.collection_date,
    cds.total_collections,
    cds.total_liters_collected,
    cds.total_liters_received,
    cds.variance_liters,
    cds.variance_percentage,
    cds.variance_type,
    cds.total_penalty_amount,
    cds.approved_at
FROM collector_daily_summaries cds
WHERE cds.total_penalty_amount != 0
ORDER BY cds.collection_date DESC;

-- 4. Check collections approved for payment
SELECT 
    c.id,
    c.staff_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_payment,
    c.approved_for_company
FROM collections c
WHERE c.approved_for_payment = true
ORDER BY c.collection_date DESC
LIMIT 10;

-- 5. Check total penalties from all sources
SELECT 
    'milk_approvals' as source,
    SUM(ma.penalty_amount) as total_penalties
FROM milk_approvals ma
WHERE ma.penalty_amount != 0

UNION ALL

SELECT 
    'collector_daily_summaries' as source,
    SUM(cds.total_penalty_amount) as total_penalties
FROM collector_daily_summaries cds
WHERE cds.total_penalty_amount != 0;

-- 6. Check if there are any pending payments
SELECT 
    COUNT(*) as pending_count,
    SUM(cp.total_earnings) as pending_earnings
FROM collector_payments cp
WHERE cp.status = 'pending';