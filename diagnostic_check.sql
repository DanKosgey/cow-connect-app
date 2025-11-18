-- Diagnostic script to check current database state
-- Run this in your Supabase SQL Editor to understand what's missing

-- 1. Check if collection_points table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'collection_points';

-- 2. Check if collection_point_id column exists in collections table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'collections' AND column_name = 'collection_point_id';

-- 3. Check if variance_penalty_config table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'variance_penalty_config';

-- 4. Check if variance_type_enum exists
SELECT typname 
FROM pg_type 
WHERE typname = 'variance_type_enum';

-- 5. Check existing policies on collection_points
SELECT pol.polname
FROM pg_policy pol
JOIN pg_class tbl ON pol.polrelid = tbl.oid
WHERE tbl.relname = 'collection_points';

-- 6. Check existing policies on variance_penalty_config
SELECT pol.polname
FROM pg_policy pol
JOIN pg_class tbl ON pol.polrelid = tbl.oid
WHERE tbl.relname = 'variance_penalty_config';

-- 7. Check if collector_performance table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'collector_performance';