-- Comprehensive diagnostic script to check collections and their grouping
-- Run this in your Supabase SQL Editor

-- 1. Check all pending collections (not yet approved)
SELECT 
    'All Pending Collections' as info_type,
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
WHERE c.status = 'Collected'
AND c.approved_for_company = false
AND c.collection_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY c.collection_date DESC, c.staff_id, c.created_at DESC;

-- 2. Check specifically for the collector and date you're trying to approve
SELECT 
    'Target Collector Collections' as info_type,
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
WHERE c.collection_date = '2025-11-19'
AND c.status = 'Collected'
AND c.approved_for_company = false
AND c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
ORDER BY c.created_at DESC;

-- 3. Check unassigned collections for the same date
SELECT 
    'Unassigned Collections' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id
FROM public.collections c
WHERE c.collection_date = '2025-11-19'
AND c.status = 'Collected'
AND c.approved_for_company = false
AND c.staff_id IS NULL
ORDER BY c.created_at DESC;

-- 4. Check if the collector staff record exists
SELECT 
    'Collector Staff Record' as info_type,
    s.id,
    s.employee_id,
    s.user_id,
    p.full_name as collector_name,
    p.email as collector_email
FROM public.staff s
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE s.id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570';

-- 5. Check what the batch approval function would find
SELECT 
    'Batch Approval Query Result' as info_type,
    COUNT(*) as collection_count,
    SUM(c.liters) as total_liters
FROM public.collections c
WHERE c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
AND c.collection_date = '2025-11-19'
AND c.status = 'Collected'
AND c.approved_for_company = false;