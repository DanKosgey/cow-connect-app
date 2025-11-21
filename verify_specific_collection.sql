-- Script to verify a specific collection by ID
-- Replace 'YOUR_COLLECTION_ID_HERE' with the actual collection ID

-- 1. Check the collection status
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.company_approval_id,
    c.created_at,
    c.updated_at,
    s.id as staff_id,
    s.employee_id,
    p.full_name as collector_name
FROM public.collections c
LEFT JOIN public.staff s ON c.staff_id = s.id
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE c.id = 'YOUR_COLLECTION_ID_HERE';

-- 2. Check if there's an approval record for this collection
SELECT 
    ma.id,
    ma.collection_id,
    ma.staff_id,
    ma.company_received_liters,
    ma.variance_liters,
    ma.variance_percentage,
    ma.penalty_amount,
    ma.created_at,
    s.employee_id,
    p.full_name as approver_name
FROM public.milk_approvals ma
LEFT JOIN public.staff s ON ma.staff_id = s.id
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE ma.collection_id = 'YOUR_COLLECTION_ID_HERE'
ORDER BY ma.created_at DESC;

-- 3. Check audit logs for this collection
SELECT 
    al.id,
    al.table_name,
    al.operation,
    al.changed_by,
    al.new_data,
    al.created_at
FROM public.audit_logs al
WHERE al.record_id = 'YOUR_COLLECTION_ID_HERE'
   OR al.new_data->>'collection_id' = 'YOUR_COLLECTION_ID_HERE'
ORDER BY al.created_at DESC;