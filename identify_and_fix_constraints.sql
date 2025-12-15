-- SQL script to identify and fix duplicate foreign key constraints
-- Run this in your Supabase SQL Editor

-- 1. First, let's see all the foreign key constraints on milk_approvals
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
ORDER BY conname;

-- 2. Identify duplicate constraints that reference the same foreign table and column
WITH constraint_groups AS (
    SELECT 
        conname as constraint_name,
        a.attname as column_name,
        confrelid::regclass as foreign_table_name,
        af.attname as foreign_column_name,
        COUNT(*) OVER (PARTITION BY a.attname, confrelid::regclass, af.attname) as duplicate_count
    FROM pg_constraint AS c
    JOIN pg_attribute AS a 
        ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute AS af 
        ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
    WHERE c.contype = 'f' 
        AND conrelid::regclass = 'milk_approvals'::regclass
)
SELECT 
    constraint_name,
    column_name,
    foreign_table_name,
    foreign_column_name,
    duplicate_count
FROM constraint_groups
WHERE duplicate_count > 1
ORDER BY column_name, constraint_name;

-- 3. Generate DROP statements for duplicate constraints (keep only the first one)
WITH ranked_constraints AS (
    SELECT 
        conname as constraint_name,
        a.attname as column_name,
        confrelid::regclass as foreign_table_name,
        af.attname as foreign_column_name,
        ROW_NUMBER() OVER (
            PARTITION BY a.attname, confrelid::regclass, af.attname 
            ORDER BY conname
        ) as rn
    FROM pg_constraint AS c
    JOIN pg_attribute AS a 
        ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute AS af 
        ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
    WHERE c.contype = 'f' 
        AND conrelid::regclass = 'milk_approvals'::regclass
)
SELECT 
    'ALTER TABLE milk_approvals DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name) || ';' as drop_statement
FROM ranked_constraints
WHERE rn > 1;

-- 4. After dropping duplicates, verify we have clean constraints
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
ORDER BY conname;

-- 5. Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';