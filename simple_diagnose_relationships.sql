-- Simple diagnostic query to check relationships between milk_approvals and collections
-- Run this in your Supabase SQL Editor

-- 1. Check foreign key constraints on milk_approvals table
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
    AND conrelid::regclass = 'milk_approvals'::regclass
ORDER BY conname, a.attnum;

-- 2. Check if there are duplicate constraints
SELECT 
    a.attname as column_name,
    COUNT(*) as constraint_count
FROM pg_constraint AS c
JOIN pg_attribute AS a 
    ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f' 
    AND conrelid::regclass = 'milk_approvals'::regclass
    AND confrelid::regclass = 'collections'::regclass
GROUP BY a.attname
HAVING COUNT(*) > 1;

-- 3. Check the structure of milk_approvals table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'milk_approvals'
ORDER BY ordinal_position;

-- 4. Check the structure of collections table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'collections'
ORDER BY ordinal_position;

-- 5. Test a simple join to see if it works
SELECT 
    ma.id as approval_id,
    ma.collection_id,
    c.id as collection_id_check
FROM milk_approvals ma
JOIN collections c ON ma.collection_id = c.id
LIMIT 5;