-- Diagnostic script to check user roles for the specific user ID from logs
-- User ID: e7709de4-3161-4db3-b94b-fef93878f284

-- 1. Check if the user exists in profiles
SELECT 'Profiles Check' as section, id, full_name, email 
FROM profiles 
WHERE id = 'e7709de4-3161-4db3-b94b-fef93878f284';

-- 2. Check if the user has any roles in user_roles table
SELECT 'User Roles Check' as section, user_id, role, active 
FROM user_roles 
WHERE user_id = 'e7709de4-3161-4db3-b94b-fef93878f284';

-- 3. Check if the user is in staff table
SELECT 'Staff Check' as section, id, user_id, employee_id 
FROM staff 
WHERE user_id = 'e7709de4-3161-4db3-b94b-fef93878f284';

-- 4. Check if the user is in farmers table
SELECT 'Farmers Check' as section, id, user_id, registration_number 
FROM farmers 
WHERE user_id = 'e7709de4-3161-4db3-b94b-fef93878f284';

-- 5. Check all roles for users with similar patterns (in case of typo)
SELECT 'Similar User IDs' as section, user_id, role, active 
FROM user_roles 
WHERE user_id LIKE '%e7709de4-3161-4db3-b94b-fef93878f284%'
   OR user_id LIKE '%e7709de4%';