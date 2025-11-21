-- SQL Script to diagnose and identify collections with missing staff information

-- 1. Find collections with missing or invalid staff_id
SELECT 
    c.id,
    c.collection_id,
    c.staff_id,
    c.created_at,
    c.collection_date,
    f.full_name as farmer_name
FROM collections c
LEFT JOIN farmers f ON c.farmer_id = f.id
WHERE c.staff_id IS NULL 
   OR c.staff_id = ''
   OR NOT EXISTS (
     SELECT 1 FROM staff s WHERE s.id = c.staff_id
   )
ORDER BY c.created_at DESC
LIMIT 50;

-- 2. Count total collections with missing staff information
SELECT 
    COUNT(*) as total_missing_staff_collections,
    COUNT(CASE WHEN c.staff_id IS NULL OR c.staff_id = '' THEN 1 END) as null_staff_id_count,
    COUNT(CASE WHEN c.staff_id IS NOT NULL AND c.staff_id != '' AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = c.staff_id) THEN 1 END) as invalid_staff_id_count
FROM collections c;

-- 3. Show collections grouped by creation date to identify patterns
SELECT 
    DATE(c.created_at) as creation_date,
    COUNT(*) as missing_staff_count
FROM collections c
WHERE c.staff_id IS NULL 
   OR c.staff_id = ''
   OR NOT EXISTS (
     SELECT 1 FROM staff s WHERE s.id = c.staff_id
   )
GROUP BY DATE(c.created_at)
ORDER BY creation_date DESC
LIMIT 30;

-- 4. List all staff members to help with assignment
SELECT 
    s.id,
    s.user_id,
    p.full_name as staff_name,
    s.created_at
FROM staff s
LEFT JOIN profiles p ON s.user_id = p.id
ORDER BY p.full_name;

-- 5. Example update statement (commented out for safety)
-- Uncomment and modify as needed to fix specific collections
-- UPDATE collections 
-- SET staff_id = 'correct-staff-uuid' 
-- WHERE id = 'problematic-collection-uuid';