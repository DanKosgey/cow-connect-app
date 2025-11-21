-- Script to assign unassigned collections to a specific collector
-- Replace 'COLLECTOR_STAFF_ID_HERE' with the actual staff ID of the collector you want to assign to
-- Replace 'COLLECTION_DATE_HERE' with the date of collections you want to fix (or remove the date filter)

BEGIN;

-- First, check what unassigned collections exist
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.farmer_id,
    f.full_name as farmer_name
FROM public.collections c
JOIN public.farmers f ON c.farmer_id = f.id
WHERE c.staff_id IS NULL
AND c.status = 'Collected'
AND c.approved_for_company = false
AND c.collection_date = 'COLLECTION_DATE_HERE'  -- Remove this line to see all unassigned collections
ORDER BY c.collection_date DESC, c.created_at DESC;

-- Then, assign them to a specific collector
-- Uncomment the following UPDATE statement after verifying the collections above
-- UPDATE public.collections 
-- SET staff_id = 'COLLECTOR_STAFF_ID_HERE'
-- WHERE staff_id IS NULL
-- AND status = 'Collected'
-- AND approved_for_company = false
-- AND collection_date = 'COLLECTION_DATE_HERE';  -- Remove this line to update all unassigned collections

-- Verify the update
-- SELECT 
--     c.id,
--     c.collection_id,
--     c.liters,
--     c.collection_date,
--     c.staff_id,
--     s.employee_id as collector_employee_id,
--     f.full_name as farmer_name
-- FROM public.collections c
-- JOIN public.farmers f ON c.farmer_id = f.id
-- LEFT JOIN public.staff s ON c.staff_id = s.id
-- WHERE c.collection_date = 'COLLECTION_DATE_HERE'
-- ORDER BY c.staff_id, c.collection_date DESC, c.created_at DESC;

COMMIT;