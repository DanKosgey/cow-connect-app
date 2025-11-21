-- Diagnostic script to check staff approval issue
-- Run this in your Supabase SQL Editor

-- 1. Check the staff record for the approving user
SELECT 'Staff Record' as check_type, 
       s.id, 
       s.user_id, 
       s.employee_id,
       p.full_name,
       p.email
FROM public.staff s
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE s.id = 'f695826b-c5f1-4d12-b338-95e34a3165ea'
   OR s.user_id = '5c8ada73-d476-42c5-8ef8-667dc36a4324';

-- 2. Check user roles for the approving user
SELECT 'User Roles' as check_type,
       ur.user_id,
       ur.role,
       ur.active,
       u.email as user_email
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
WHERE ur.user_id = '5c8ada73-d476-42c5-8ef8-667dc36a4324';

-- 3. Check if the staff member has permission to approve collections
-- This replicates the exact validation logic from the function
SELECT 'Permission Check' as check_type,
       CASE 
         WHEN EXISTS (
           SELECT 1 
           FROM public.staff s
           JOIN public.user_roles ur ON s.user_id = ur.user_id
           WHERE s.id = 'f695826b-c5f1-4d12-b338-95e34a3165ea'  -- staff ID
           AND ur.role IN ('staff', 'admin')
           AND ur.active = true
         ) THEN 'HAS PERMISSION'
         ELSE 'NO PERMISSION'
       END as permission_status;

-- 4. Check what roles the user actually has
SELECT 'Actual Roles' as check_type,
       string_agg(ur.role, ', ') as roles
FROM public.user_roles ur
WHERE ur.user_id = '5c8ada73-d476-42c5-8ef8-667dc36a4324'
AND ur.active = true;

-- 5. Check the collector being approved
SELECT 'Collector Record' as check_type,
       s.id,
       s.user_id,
       s.employee_id,
       p.full_name,
       p.email
FROM public.staff s
LEFT JOIN public.profiles p ON s.user_id = p.id
WHERE s.id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570';