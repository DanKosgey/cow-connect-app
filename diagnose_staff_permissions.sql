-- Diagnostic script to check staff permissions for batch approval
-- Run this in your Supabase SQL Editor

-- 1. Find all staff members and their user roles
SELECT 
    s.id as staff_id,
    s.employee_id,
    s.user_id,
    p.full_name,
    p.email,
    ur.role,
    ur.active,
    CASE 
        WHEN ur.role IN ('staff', 'admin') AND ur.active = true THEN 'CAN APPROVE'
        WHEN ur.role IS NULL THEN 'NO ROLE ASSIGNED'
        ELSE 'INSUFFICIENT PERMISSIONS'
    END as approval_permission
FROM public.staff s
LEFT JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.user_roles ur ON s.user_id = ur.user_id 
    AND ur.role IN ('staff', 'admin')
    AND ur.active = true
ORDER BY p.full_name;

-- 2. Check specifically for the problematic user
-- Replace '5c8ada73-d476-42c5-8ef8-667dc36a4324' with the actual user ID if different
SELECT 
    'User Role Check' as check_type,
    u.id as user_id,
    u.email,
    string_agg(ur.role || ' (' || CASE WHEN ur.active THEN 'active' ELSE 'inactive' END || ')', ', ') as roles
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.id = '5c8ada73-d476-42c5-8ef8-667dc36a4324'
GROUP BY u.id, u.email;

-- 3. Check if the staff record exists for this user
SELECT 
    'Staff Record Check' as check_type,
    s.id as staff_id,
    s.user_id,
    s.employee_id,
    p.full_name,
    p.email
FROM public.staff s
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE s.user_id = '5c8ada73-d476-42c5-8ef8-667dc36a4324';

-- 4. Test the exact validation logic from the batch approval function
-- This replicates the exact query that was failing
SELECT 
    'Permission Validation' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM public.staff s
            JOIN public.user_roles ur ON s.user_id = ur.user_id
            WHERE s.user_id = '5c8ada73-d476-42c5-8ef8-667dc36a4324'  -- user ID
            AND ur.role IN ('staff', 'admin')
            AND ur.active = true
        ) THEN 'HAS PERMISSION'
        ELSE 'NO PERMISSION'
    END as permission_status;

-- 5. Show all collections that have been approved by this user
SELECT 
    c.id as collection_id,
    c.collection_id as reference,
    c.collection_date,
    c.liters,
    ma.staff_id as approver_staff_id,
    ma.created_at as approval_time
FROM public.collections c
JOIN public.milk_approvals ma ON c.company_approval_id = ma.id
WHERE ma.staff_id IN (
    -- Find all staff IDs associated with this user
    SELECT id FROM public.staff WHERE user_id = '5c8ada73-d476-42c5-8ef8-667dc36a4324'
)
ORDER BY ma.created_at DESC
LIMIT 10;