-- Diagnostic query to check for multiple relationships between milk_approvals and collections
-- Run this in your Supabase SQL Editor

-- 1. Check all foreign key constraints involving milk_approvals
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'milk_approvals'
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;

-- 2. Check for any duplicate foreign key constraints
SELECT 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    COUNT(*) as constraint_count
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'milk_approvals'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'collections'
GROUP BY kcu.column_name, ccu.table_name, ccu.column_name
HAVING COUNT(*) > 1;

-- 3. Check the actual table structure
\d milk_approvals

-- 4. Check if there are any triggers that might be creating duplicate relationships
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgtype as trigger_type,
    tgfoid::regproc as function_name
FROM pg_trigger
WHERE tgrelid = 'milk_approvals'::regclass
ORDER BY tgname;

-- 5. Check for any views that might be causing confusion
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition ILIKE '%milk_approvals%'
   OR definition ILIKE '%collections%'
ORDER BY schemaname, viewname;