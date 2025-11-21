-- Targeted diagnostic to identify the exact mismatch
-- Run this in your Supabase SQL Editor

-- 1. Check the exact query used by the batch approval function
SELECT 
    'Batch Approval Function Query' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date::date as collection_date_only,
    c.status,
    c.approved_for_company,
    c.staff_id,
    s.employee_id as collector_employee_id,
    p.full_name as collector_name
FROM public.collections c
LEFT JOIN public.staff s ON c.staff_id = s.id
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
AND c.collection_date::date = '2025-11-19'
AND c.status = 'Collected'
AND c.approved_for_company = false
ORDER BY c.created_at DESC;

-- 2. Check what the frontend sees (without the date casting)
SELECT 
    'Frontend Display Query' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id,
    s.employee_id as collector_employee_id,
    p.full_name as collector_name
FROM public.collections c
LEFT JOIN public.staff s ON c.staff_id = s.id
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
AND c.collection_date = '2025-11-19'
AND c.status = 'Collected'
AND c.approved_for_company = false
ORDER BY c.created_at DESC;

-- 3. Check the actual collection_date values and their types
SELECT 
    'Collection Date Analysis' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.collection_date::date as collection_date_only,
    pg_typeof(c.collection_date) as date_type,
    c.status,
    c.approved_for_company,
    c.staff_id
FROM public.collections c
WHERE c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
AND c.collection_date::date = '2025-11-19'
ORDER BY c.created_at DESC;