-- Script to find actual staff IDs for testing the batch approval function
-- Run this to get real staff IDs from your database

-- Find staff members with 'staff' role (can approve collections)
SELECT 
    s.id as staff_id,
    p.full_name,
    p.email,
    ur.role,
    s.user_id
FROM public.staff s
JOIN public.profiles p ON s.user_id = p.id
JOIN public.user_roles ur ON s.user_id = ur.user_id
WHERE ur.role = 'staff' 
AND ur.active = true
LIMIT 5;

-- Find staff members with 'collector' role
SELECT 
    s.id as collector_id,
    p.full_name,
    p.email,
    ur.role,
    s.user_id
FROM public.staff s
JOIN public.profiles p ON s.user_id = p.id
JOIN public.user_roles ur ON s.user_id = ur.user_id
WHERE ur.role = 'collector' 
AND ur.active = true
LIMIT 5;

-- Find recent collections that are not yet approved
SELECT 
    c.id,
    c.collection_date,
    c.liters,
    c.staff_id,
    c.farmer_id,
    c.approved_for_company
FROM public.collections c
WHERE c.approved_for_company = false
AND c.status = 'Collected'
ORDER BY c.collection_date DESC
LIMIT 10;

-- Check if there are any collections for today that could be used for testing
SELECT 
    c.id,
    c.collection_date,
    c.liters,
    c.staff_id,
    c.farmer_id,
    s.id as staff_record_id,
    p.full_name as collector_name
FROM public.collections c
JOIN public.staff s ON c.staff_id = s.id
JOIN public.profiles p ON s.user_id = p.id
WHERE c.collection_date::date = CURRENT_DATE
AND c.approved_for_company = false
AND c.status = 'Collected'
ORDER BY c.collection_date DESC;

-- Check the variance penalty configuration
SELECT * FROM public.variance_penalty_config
ORDER BY variance_type, min_variance_percentage;