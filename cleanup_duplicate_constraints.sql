-- SQL script to clean up duplicate foreign key constraints on milk_approvals table
-- Run this in your Supabase SQL Editor

BEGIN;

-- 1. First, let's identify the duplicate constraints
-- Look for constraints that reference the same foreign table and column
WITH constraint_details AS (
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
),
duplicate_constraints AS (
    SELECT 
        column_name,
        foreign_table_name,
        foreign_column_name,
        COUNT(*) as constraint_count,
        ARRAY_AGG(constraint_name) as constraint_names
    FROM constraint_details
    GROUP BY column_name, foreign_table_name, foreign_column_name
    HAVING COUNT(*) > 1
)
SELECT * FROM duplicate_constraints;

-- 2. Identify which constraints to drop (keep only one of each duplicate)
WITH constraint_details AS (
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
),
ranked_constraints AS (
    SELECT 
        constraint_name,
        column_name,
        foreign_table_name,
        foreign_column_name,
        ROW_NUMBER() OVER (
            PARTITION BY column_name, foreign_table_name, foreign_column_name 
            ORDER BY constraint_name
        ) as rn
    FROM constraint_details
)
SELECT constraint_name
FROM ranked_constraints
WHERE rn > 1; -- These are the duplicates we want to drop

-- 3. Drop the duplicate constraints (keep only one of each)
-- We need to drop all but one constraint for each column that references collections
WITH constraint_details AS (
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
),
constraints_to_drop AS (
    SELECT 
        constraint_name,
        ROW_NUMBER() OVER (
            PARTITION BY column_name, foreign_table_name, foreign_column_name 
            ORDER BY constraint_name
        ) as rn
    FROM constraint_details
    WHERE foreign_table_name = 'collections'::regclass
)
-- Drop the duplicate constraints
SELECT 'ALTER TABLE milk_approvals DROP CONSTRAINT ' || quote_ident(constraint_name) || ';' as drop_statement
FROM constraints_to_drop
WHERE rn > 1;

-- 4. Actually drop the duplicate constraints (uncomment to execute)
-- ALTER TABLE milk_approvals DROP CONSTRAINT IF EXISTS "milk_approvals_collection_id_fkey1";
-- ALTER TABLE milk_approvals DROP CONSTRAINT IF EXISTS "milk_approvals_collection_id_fkey2";
-- Add more DROP CONSTRAINT statements as needed based on the output above

-- 5. Recreate the proper foreign key constraint
-- ALTER TABLE milk_approvals 
-- ADD CONSTRAINT milk_approvals_collection_id_fkey 
-- FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE;

-- 6. Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 7. Test the relationship
SELECT 
    ma.id as approval_id,
    ma.collection_id,
    c.id as collection_id_check
FROM milk_approvals ma
JOIN collections c ON ma.collection_id = c.id
LIMIT 5;

COMMIT;