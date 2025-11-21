-- Verification Script for Staff Dashboard Fix
-- Run this script in your Supabase SQL Editor to verify that all fixes are properly applied

-- 1. Check that all required migrations have been applied
SELECT 
    table_name, 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('collections', 'milk_approvals', 'staff', 'farmers')
AND column_name IN ('approved_for_company', 'company_approval_id')
ORDER BY table_name, column_name;

-- 2. Check that RLS is enabled on all relevant tables
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname IN ('collections', 'milk_approvals', 'staff', 'farmers', 'user_roles')
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. Check that all required policies exist
SELECT 
    polname as policy_name,
    pc.relname as table_name
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname IN ('collections', 'milk_approvals', 'staff', 'farmers')
AND polname IN (
    'Staff can read collections',
    'Staff can insert collections',
    'Staff can update collections',
    'Staff can read farmers',
    'Staff can read staff',
    'Staff can view their own record',
    'milk_approvals_select_by_staff',
    'milk_approvals_insert_by_staff',
    'milk_approvals_update_by_staff'
)
ORDER BY pc.relname, polname;

-- 4. Check that the is_admin function exists
SELECT 
    proname as function_name,
    provolatile,
    prosecdef
FROM pg_proc 
WHERE proname = 'is_admin';

-- 5. Check current user roles (replace 'YOUR_USER_ID' with actual user ID)
-- SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID';

-- 6. Check pending collections count (this should match what the dashboard shows)
SELECT 
    COUNT(*) as pending_collections_count
FROM collections 
WHERE approved_for_company = false;

-- 7. Check that staff users can access collections
-- This query should return data if run as a staff user
SELECT 
    c.id,
    c.collection_date,
    c.liters,
    c.farmer_id,
    c.staff_id,
    c.approved_for_company
FROM collections c
WHERE c.approved_for_company = false
LIMIT 5;

-- 8. Check that staff users can access milk_approvals
-- This query should return data if run as a staff user
SELECT 
    ma.id,
    ma.collection_id,
    ma.staff_id,
    ma.company_received_liters,
    ma.approved_at
FROM milk_approvals ma
WHERE ma.approved_at IS NULL
LIMIT 5;

-- 9. Check that staff users can access staff information
-- This query should return data if run as a staff user
SELECT 
    s.id,
    s.user_id,
    s.employee_id,
    s.status
FROM staff s
LIMIT 5;

-- 10. Check that staff users can access farmer information
-- This query should return data if run as a staff user
SELECT 
    f.id,
    f.user_id,
    f.full_name,
    f.registration_number
FROM farmers f
LIMIT 5;

-- 11. Verify the updated dashboard stats query
-- This should return the correct count of pending reviews
SELECT 
    COUNT(*) as pending_reviews
FROM collections 
WHERE approved_for_company = false;

-- 12. Check field staff count (collectors)
SELECT 
    COUNT(*) as field_staff_count
FROM user_roles 
WHERE role = 'collector' 
AND active = true;

-- 13. Check today's collections data
SELECT 
    COUNT(*) as total_collections,
    COUNT(DISTINCT farmer_id) as total_farmers,
    SUM(total_amount) as total_earnings
FROM collections 
WHERE collection_date::date = CURRENT_DATE;

-- 14. Check today's variance data
SELECT 
    AVG(variance_percentage) as avg_variance_today
FROM milk_approvals 
WHERE approved_at >= CURRENT_DATE::timestamp AT TIME ZONE 'UTC'
AND approved_at < (CURRENT_DATE + INTERVAL '1 day')::timestamp AT TIME ZONE 'UTC';