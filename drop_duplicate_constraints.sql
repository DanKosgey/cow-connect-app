-- SQL script to drop duplicate foreign key constraints on milk_approvals table
-- Run this in your Supabase SQL Editor
-- WARNING: Make sure to backup your data before running this script

BEGIN;

-- 1. First, let's see what constraints we have before making changes
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

-- 2. Drop duplicate constraints manually based on the output above
-- You'll need to uncomment and adjust these statements based on your actual constraint names
-- ALTER TABLE milk_approvals DROP CONSTRAINT IF EXISTS "milk_approvals_collection_id_fkey1";
-- ALTER TABLE milk_approvals DROP CONSTRAINT IF EXISTS "milk_approvals_collection_id_fkey2";
-- ALTER TABLE milk_approvals DROP CONSTRAINT IF EXISTS "milk_approvals_staff_id_fkey1";
-- ALTER TABLE milk_approvals DROP CONSTRAINT IF EXISTS "milk_approvals_staff_id_fkey2";

-- 3. If you want to be more systematic, you can use this approach:
-- Drop all constraints except the ones with standard names
-- ALTER TABLE milk_approvals DROP CONSTRAINT IF EXISTS "fk_milk_approvals_collection_id";
-- ALTER TABLE milk_approvals DROP CONSTRAINT IF EXISTS "fk_milk_approvals_staff_id";

-- 4. Recreate the proper foreign key constraints with standard names
-- ALTER TABLE milk_approvals 
-- ADD CONSTRAINT fk_milk_approvals_collection_id 
-- FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE;

-- ALTER TABLE milk_approvals 
-- ADD CONSTRAINT fk_milk_approvals_staff_id 
-- FOREIGN KEY (staff_id) REFERENCES staff(id);

-- 5. Verify the constraints after changes
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

-- 6. Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 7. Test the relationship query that was failing
SELECT 
    ma.id as approval_id,
    ma.collection_id,
    c.id as collection_id_check
FROM milk_approvals ma
JOIN collections c ON ma.collection_id = c.id
LIMIT 5;

COMMIT;