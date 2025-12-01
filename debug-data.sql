-- Debug collector payments
SELECT 
    cp.id,
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
JOIN staff s ON cp.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
ORDER BY cp.created_at DESC;

-- Debug collector daily summaries
SELECT 
    cds.id,
    s.id as staff_id,
    p.full_name as collector_name,
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
JOIN staff s ON cds.collector_id = s.id
JOIN profiles p ON s.user_id = p.id
ORDER BY cds.collection_date DESC, cds.created_at DESC;

-- Debug variance penalty config
SELECT * FROM variance_penalty_config WHERE is_active = true;