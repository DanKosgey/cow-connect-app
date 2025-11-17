-- Migration: 20251117173000_test_collector_performance.sql
-- Description: Test if collector_performance table exists
-- Estimated time: 1 minute

BEGIN;

-- Test if collector_performance table exists by selecting from it
SELECT COUNT(*) as count FROM collector_performance LIMIT 1;

COMMIT;