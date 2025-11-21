-- Diagnostic script to check collections for a specific collector and date
-- Replace 'COLLECTOR_STAFF_ID_HERE' with the actual collector staff ID
-- Replace 'COLLECTION_DATE_HERE' with the actual collection date

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
    s.user_id,
    p.full_name as collector_name,
    f.full_name as farmer_name
FROM public.collections c
LEFT JOIN public.staff s ON c.staff_id = s.id
LEFT JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.farmers f ON c.farmer_id = f.id
WHERE c.collection_date = '2025-11-19'  -- Replace with actual date
AND c.status = 'Collected'
AND c.approved_for_company = false
AND (c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570' OR c.staff_id IS NULL)
ORDER BY c.staff_id, c.created_at DESC;