-- Migration: 20251117170000_verify_collector_performance_table.sql
-- Description: Verify collector_performance table exists and has correct structure
-- Estimated time: 1 minute

BEGIN;

-- Check if collector_performance table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'collector_performance' 
AND table_schema = 'public';

-- Check columns in collector_performance table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'collector_performance' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if staff table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'staff' 
AND table_schema = 'public';

-- Check if profiles table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'profiles' 
AND table_schema = 'public';

COMMIT;