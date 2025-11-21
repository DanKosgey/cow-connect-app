-- Diagnostic script to check unassigned collections
-- Run this in your Supabase SQL Editor

-- 1. Check collections with NULL staff_id
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id,
    'NULL staff_id' as issue_type
FROM public.collections c
WHERE c.staff_id IS NULL
AND c.collection_date >= CURRENT_DATE - INTERVAL '7 days'
AND c.status = 'Collected'
AND c.approved_for_company = false
ORDER BY c.collection_date DESC, c.created_at DESC;

-- 2. Check collections with invalid staff_id (staff record doesn't exist)
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id,
    'Invalid staff_id' as issue_type
FROM public.collections c
WHERE c.staff_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = c.staff_id)
AND c.collection_date >= CURRENT_DATE - INTERVAL '7 days'
AND c.status = 'Collected'
AND c.approved_for_company = false
ORDER BY c.collection_date DESC, c.created_at DESC;

-- 3. Check all collections for the specific dates and collector you're trying to approve
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id,
    s.id as staff_record_id,
    s.employee_id,
    s.user_id
FROM public.collections c
LEFT JOIN public.staff s ON c.staff_id = s.id
WHERE c.collection_date = '2025-11-18'
AND c.status = 'Collected'
AND c.approved_for_company = false
ORDER BY c.staff_id, c.created_at DESC;

-- 4. Check what the frontend is grouping as "Unassigned Collector"
-- This will show collections that the frontend groups together but have different actual staff_ids
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id,
    CASE 
        WHEN c.staff_id IS NULL THEN 'NULL'
        WHEN NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = c.staff_id) THEN 'INVALID'
        ELSE 'VALID'
    END as staff_id_status
FROM public.collections c
WHERE c.collection_date = '2025-11-18'
AND c.status = 'Collected'
AND c.approved_for_company = false
ORDER BY c.staff_id, c.created_at DESC;