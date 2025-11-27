-- ============================================
-- CLEAR_PERFORMANCE_DATA.sql
-- Script to clear collector performance data
-- ============================================

-- ============================================
-- 1. Check current performance data
-- ============================================
SELECT 
    'Current performance records count' as info,
    COUNT(*) as count
FROM collector_performance;

-- ============================================
-- 2. Check performance data details
-- ============================================
SELECT 
    cp.id,
    cp.staff_id,
    s.user_id,
    p.full_name as collector_name,
    cp.period_start,
    cp.period_end,
    cp.total_collections,
    cp.total_liters_collected,
    cp.average_variance_percentage,
    cp.performance_score
FROM collector_performance cp
LEFT JOIN staff s ON cp.staff_id = s.id
LEFT JOIN profiles p ON s.user_id = p.id
ORDER BY cp.created_at DESC
LIMIT 10;

-- ============================================
-- 3. Clear all performance data (UNCOMMENT TO RUN)
-- ============================================
-- DELETE FROM collector_performance;

-- ============================================
-- 4. Reset performance data sequences (UNCOMMENT TO RUN)
-- ============================================
-- SELECT setval('collector_performance_id_seq', 1, false);

-- ============================================
-- 5. Verify data is cleared
-- ============================================
-- SELECT 
--     'Performance records count after clearing' as info,
--     COUNT(*) as count
-- FROM collector_performance;

-- ============================================
-- 6. Alternative: Clear only old performance data
-- ============================================
-- DELETE FROM collector_performance 
-- WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- 7. Manual trigger to recalculate performance (if function exists)
-- ============================================
-- SELECT populate_collector_performance('staff-id', '2025-11-01', '2025-11-30');