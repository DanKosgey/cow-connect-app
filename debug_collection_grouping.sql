-- Debug script to understand collection grouping issues
-- Run this in your Supabase SQL Editor

-- First, let's see what collections the frontend would fetch
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id,
    CASE 
        WHEN c.staff_id IS NULL THEN 'unassigned'
        ELSE c.staff_id::text
    END as frontend_collector_id,
    s.employee_id as collector_employee_id,
    p.full_name as collector_name,
    f.full_name as farmer_name
FROM public.collections c
LEFT JOIN public.staff s ON c.staff_id = s.id
LEFT JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.farmers f ON c.farmer_id = f.id
WHERE c.status = 'Collected'
AND c.approved_for_company = false
AND c.collection_date = '2025-11-19'
ORDER BY c.staff_id, c.created_at DESC;

-- Now let's see what the batch approval function would find for the specific collector
SELECT 
    'Batch Approval Query' as query_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date
FROM public.collections c
WHERE c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
AND c.collection_date = '2025-11-19'
AND c.status = 'Collected'
AND c.approved_for_company = false;

-- Let's also check if there are any collections with NULL staff_id for the same date
SELECT 
    'Unassigned Collections' as query_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date
FROM public.collections c
WHERE c.staff_id IS NULL
AND c.collection_date = '2025-11-19'
AND c.status = 'Collected'
AND c.approved_for_company = false;

-- Check if the collector staff record exists and is valid
SELECT 
    s.id,
    s.employee_id,
    s.user_id,
    p.full_name as collector_name,
    ur.role,
    ur.active
FROM public.staff s
LEFT JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.user_roles ur ON s.user_id = ur.user_id
WHERE s.id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570';