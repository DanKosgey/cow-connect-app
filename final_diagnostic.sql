-- Final diagnostic script to identify the exact issue
-- Run this in your Supabase SQL Editor

-- 1. First, let's see all collections for the date in question
SELECT 
    'All Collections for Date' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id,
    CASE 
        WHEN c.staff_id IS NULL THEN 'UNASSIGNED'
        WHEN NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = c.staff_id) THEN 'INVALID_STAFF'
        ELSE 'VALID'
    END as staff_status,
    s.employee_id as collector_employee_id,
    p.full_name as collector_name
FROM public.collections c
LEFT JOIN public.staff s ON c.staff_id = s.id
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE c.collection_date = '2025-11-19'
ORDER BY c.staff_id, c.created_at DESC;

-- 2. Now let's see what the frontend would group these as
SELECT 
    'Frontend Grouping Simulation' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    CASE 
        WHEN c.staff_id IS NULL THEN 'unassigned'
        ELSE c.staff_id::text
    END as frontend_group_collector_id,
    CASE 
        WHEN c.staff_id IS NULL THEN 'Unassigned Collector'
        WHEN p.full_name IS NOT NULL THEN p.full_name
        ELSE 'Unknown Collector'
    END as frontend_group_collector_name
FROM public.collections c
LEFT JOIN public.staff s ON c.staff_id = s.id
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE c.collection_date = '2025-11-19'
AND c.status = 'Collected'
AND c.approved_for_company = false
ORDER BY c.staff_id, c.created_at DESC;

-- 3. Check specifically for the collector ID you're trying to approve
SELECT 
    'Target Collector Check' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id
FROM public.collections c
WHERE c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
AND c.collection_date = '2025-11-19';

-- 4. Check for collections with NULL staff_id (unassigned)
SELECT 
    'Unassigned Collections Check' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id
FROM public.collections c
WHERE c.staff_id IS NULL
AND c.collection_date = '2025-11-19';

-- 5. Verify the collector staff record exists
SELECT 
    'Collector Staff Record' as info_type,
    s.id,
    s.employee_id,
    s.user_id,
    p.full_name as collector_name,
    ur.role,
    ur.active
FROM public.staff s
LEFT JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.user_roles ur ON s.user_id = ur.user_id AND ur.active = true
WHERE s.id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570';

-- 6. Check what collections the frontend service actually fetches
SELECT 
    'Frontend Service Fetch' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id,
    f.full_name as farmer_name
FROM public.collections c
LEFT JOIN public.farmers f ON c.farmer_id = f.id
WHERE c.status = 'Collected'
AND c.approved_for_company = false
ORDER BY c.collection_date DESC, c.created_at DESC
LIMIT 10;