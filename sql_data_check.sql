-- SQL diagnostic script to check collections and staff data integrity
-- Run this in your Supabase SQL Editor

-- 1. Check collections with staff_id but no matching staff record
SELECT 
    'Collections with invalid staff_id' as issue_type,
    c.id,
    c.collection_id,
    c.staff_id,
    c.collection_date,
    c.status
FROM public.collections c
WHERE c.staff_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.id = c.staff_id
);

-- 2. Check collections with staff_id but no profile
SELECT 
    'Collections with staff_id but no profile' as issue_type,
    c.id,
    c.collection_id,
    c.staff_id,
    c.collection_date,
    c.status,
    s.id as staff_table_id,
    s.user_id
FROM public.collections c
JOIN public.staff s ON c.staff_id = s.id
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = s.user_id
);

-- 3. Check valid collections with complete staff information
SELECT 
    'Valid collections with complete staff info' as issue_type,
    c.id,
    c.collection_id,
    c.staff_id,
    c.collection_date,
    c.status,
    s.id as staff_table_id,
    s.user_id,
    p.full_name as collector_name
FROM public.collections c
JOIN public.staff s ON c.staff_id = s.id
JOIN public.profiles p ON s.user_id = p.id
WHERE c.status = 'Collected'
AND c.approved_for_company = false
ORDER BY c.collection_date DESC
LIMIT 10;

-- 4. Count collections by staff completeness
SELECT 
    CASE 
        WHEN c.staff_id IS NULL THEN 'No staff_id'
        WHEN NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = c.staff_id) THEN 'Invalid staff_id'
        WHEN NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT user_id FROM public.staff s WHERE s.id = c.staff_id)) THEN 'No profile'
        ELSE 'Complete'
    END as data_status,
    COUNT(*) as count
FROM public.collections c
WHERE c.status = 'Collected'
AND c.approved_for_company = false
GROUP BY 
    CASE 
        WHEN c.staff_id IS NULL THEN 'No staff_id'
        WHEN NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = c.staff_id) THEN 'Invalid staff_id'
        WHEN NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT user_id FROM public.staff s WHERE s.id = c.staff_id)) THEN 'No profile'
        ELSE 'Complete'
    END;