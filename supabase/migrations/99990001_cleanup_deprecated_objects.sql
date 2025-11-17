-- Migration: 99990001_cleanup_deprecated_objects.sql
-- Description: Remove deprecated database objects that are no longer used
-- This migration cleans up objects that were created but later dropped or replaced

BEGIN;

-- Drop deprecated tables that were created and dropped in the same migration
DROP TABLE IF EXISTS public.farmer_notifications CASCADE;
DROP TABLE IF EXISTS public.farmer_approval_history CASCADE;
DROP TABLE IF EXISTS public.variance_penalty_config CASCADE;
DROP TABLE IF EXISTS public.collector_performance CASCADE;

-- Drop deprecated functions
DROP FUNCTION IF EXISTS public.check_pending_farmer_documents(UUID);

-- Clean up any orphaned indexes (these should have been dropped with their tables)
-- but we'll explicitly drop them just in case
-- Note: Indexes are automatically dropped when their table is dropped, but we list them for completeness

COMMIT;

-- Verification queries
-- Check that deprecated tables no longer exist
SELECT tablename FROM pg_tables WHERE tablename IN (
  'farmer_notifications', 
  'farmer_approval_history', 
  'variance_penalty_config', 
  'collector_performance'
);

-- Check that deprecated functions no longer exist
SELECT proname FROM pg_proc WHERE proname = 'check_pending_farmer_documents';