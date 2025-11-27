-- ============================================
-- CLEAR_ALL_PERFORMANCE_DATA.sql
-- Script to completely clear all collector performance data
-- ============================================

BEGIN;

-- ============================================
-- 1. Check current performance data count
-- ============================================
SELECT 
    'Current performance records count' as info,
    COUNT(*) as count
FROM collector_performance;

-- ============================================
-- 2. Display sample of current performance data
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
    cp.performance_score,
    cp.created_at
FROM collector_performance cp
LEFT JOIN staff s ON cp.staff_id = s.id
LEFT JOIN profiles p ON s.user_id = p.id
ORDER BY cp.created_at DESC
LIMIT 5;

-- ============================================
-- 3. Clear all performance data
-- ============================================
DELETE FROM collector_performance;

-- ============================================
-- 4. Reset the sequence
-- ============================================
SELECT setval('collector_performance_id_seq', 1, false);

-- ============================================
-- 5. Verify data is cleared
-- ============================================
SELECT 
    'Performance records count after clearing' as info,
    COUNT(*) as count
FROM collector_performance;

-- ============================================
-- 6. Optional: Reset any related sequences or tables
-- ============================================
-- If there are any other performance-related tables, clear them here

COMMIT;

-- ============================================
-- 7. To repopulate performance data (after adding new collections)
-- You would call the populate function for each collector:
-- SELECT populate_collector_performance('staff-id', '2025-11-01', '2025-11-30');
-- ============================================

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the table is now empty
SELECT COUNT(*) as remaining_records FROM collector_performance;

-- Check that the Collector Performance Dashboard now shows "No performance records found"