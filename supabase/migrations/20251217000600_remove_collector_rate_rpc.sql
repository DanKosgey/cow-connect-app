-- Migration: 20251217000600_remove_collector_rate_rpc.sql
-- Description: Remove collector rate RPC function and use direct database queries instead
-- Estimated time: 30 seconds

BEGIN;

-- Drop the RPC function since we're using direct queries
DROP FUNCTION IF EXISTS public.get_current_collector_rate();

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify function was dropped
SELECT proname FROM pg_proc WHERE proname = 'get_current_collector_rate';