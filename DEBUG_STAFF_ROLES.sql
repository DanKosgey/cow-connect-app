-- DEBUG SCRIPT TO IDENTIFY STAFF ROLE ISSUE
-- This script will help us understand why the frontend shows "Inactive (No Role Assigned)"

-- First, let's look at the staff table data
SELECT 'STAFF TABLE' as section;
SELECT id, employee_id, user_id, status FROM staff ORDER BY created_at DESC LIMIT 10;

-- Now let's look at the profiles for these staff members
SELECT 'PROFILES TABLE' as section;
SELECT id, full_name, email FROM profiles WHERE id IN (SELECT user_id FROM staff LIMIT 5);

-- Let's check user_roles table structure and sample data
SELECT 'USER_ROLES TABLE' as section;
SELECT * FROM user_roles LIMIT 5;

-- SIMULATE THE FRONTEND BUG - Using wrong column
-- This query simulates the frontend mistake where it uses id instead of user_id
-- This should return 0 rows, demonstrating the bug
SELECT 'FRONTEND BUG SIMULATION (using id instead of user_id)' as section;
SELECT * FROM user_roles WHERE id IN (SELECT user_id FROM staff LIMIT 5);

-- CORRECT QUERY - Using the right column (user_id)
-- This should return the actual role data
SELECT 'CORRECT QUERY (using user_id)' as section;
SELECT * FROM user_roles WHERE user_id IN (SELECT user_id FROM staff LIMIT 5);

-- Let's also check what roles are actually assigned to staff members
SELECT 'ACTUAL STAFF ROLES' as section;
SELECT 
    s.employee_id,
    p.full_name,
    ur.user_id,
    ur.role,
    ur.active
FROM staff s
JOIN profiles p ON s.user_id = p.id
JOIN user_roles ur ON s.user_id = ur.user_id
WHERE ur.role IN ('staff', 'admin', 'collector', 'creditor')
ORDER BY s.created_at DESC
LIMIT 10;