-- Check for performance-related tables
-- Run this in your Supabase SQL Editor

-- 1. List all tables that might be related to performance or biometric data
SELECT table_name 
FROM information_schema.tables 
WHERE table_name ILIKE '%performance%' 
   OR table_name ILIKE '%biometric%' 
   OR table_name ILIKE '%collector%'
ORDER BY table_name;

-- 2. Check the structure of collector_performance table (which we know exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'collector_performance'
ORDER BY ordinal_position;

-- 3. Check if collector_performance has the proper foreign key to staff
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    a.attname as column_name,
    confrelid::regclass as foreign_table_name,
    af.attname as foreign_column_name
FROM pg_constraint AS c
JOIN pg_attribute AS a 
    ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute AS af 
    ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f' 
    AND conrelid::regclass = 'collector_performance'::regclass
ORDER BY conname;

-- 4. Test a query on collector_performance
SELECT 
    cp.staff_id,
    s.id as staff_id_check,
    cp.total_collections,
    cp.accuracy_score
FROM collector_performance cp
JOIN staff s ON cp.staff_id = s.id
LIMIT 5;

-- 5. Check if there's a view or function named staff_performance
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name ILIKE '%staff_performance%'
   OR routine_name ILIKE '%performance%';

-- 6. Check for views
SELECT 
    table_name,
    view_definition
FROM information_schema.views 
WHERE table_name ILIKE '%staff_performance%'
   OR table_name ILIKE '%performance%'
ORDER BY table_name;