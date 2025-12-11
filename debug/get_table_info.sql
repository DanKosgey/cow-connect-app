-- Get information about the collections table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'collections' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if quality_grade column exists in any table
SELECT 
    table_name, 
    column_name
FROM information_schema.columns 
WHERE column_name LIKE '%quality%'
AND table_schema = 'public';

-- Check if there's a quality_grade_enum type
SELECT 
    t.typname AS enum_name,  
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'quality_grade_enum'
ORDER BY e.enumsortorder;