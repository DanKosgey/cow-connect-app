-- Diagnostic query to check relationships between milk_approvals and collections tables
-- Run this in your Supabase SQL Editor

-- 1. Check foreign key constraints on milk_approvals table
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name IN ('milk_approvals', 'collections', 'staff')
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- 2. Check if the relationships work with a simple query
SELECT 
    ma.id as approval_id,
    ma.collection_id,
    c.id as collection_id_check,
    c.liters,
    c.farmer_id
FROM public.milk_approvals ma
LEFT JOIN public.collections c ON ma.collection_id = c.id
LIMIT 5;

-- 3. Check staff relationship
SELECT 
    ma.id as approval_id,
    ma.staff_id,
    s.id as staff_id_check,
    s.user_id
FROM public.milk_approvals ma
LEFT JOIN public.staff s ON ma.staff_id = s.id
LIMIT 5;

-- 4. Check if we can access farmer information through collections
SELECT 
    ma.id as approval_id,
    c.farmer_id,
    f.id as farmer_id_check,
    f.user_id as farmer_user_id
FROM public.milk_approvals ma
JOIN public.collections c ON ma.collection_id = c.id
LEFT JOIN public.farmers f ON c.farmer_id = f.id
LIMIT 5;

-- 5. Check the full relationship chain
SELECT 
    ma.id as approval_id,
    ma.collection_id,
    ma.staff_id,
    ma.company_received_liters,
    ma.variance_liters,
    ma.approved_at,
    c.liters as collected_liters,
    c.collection_date,
    c.farmer_id,
    f.user_id as farmer_user_id,
    s.user_id as staff_user_id
FROM public.milk_approvals ma
JOIN public.collections c ON ma.collection_id = c.id
JOIN public.staff s ON ma.staff_id = s.id
JOIN public.farmers f ON c.farmer_id = f.id
LIMIT 5;