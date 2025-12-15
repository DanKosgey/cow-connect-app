-- Diagnostic script to check staff_performance table relationships
-- 1. Check foreign key constraints on staff_performance table
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
    AND conrelid::regclass = 'staff_performance'::regclass
ORDER BY conname;

-- 2. Check if there's a staff_biometric_data table (as suggested in the error)
SELECT table_name FROM information_schema.tables WHERE table_name = 'staff_biometric_data';

-- 3. Check the structure of staff table for comparison
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'staff'
ORDER BY ordinal_position;

-- 4. Check if the staff_id column in staff_performance references staff.id
SELECT 
    sp.staff_id,
    s.id as staff_id_check
FROM staff_performance sp
LEFT JOIN staff s ON sp.staff_id = s.id
LIMIT 5;