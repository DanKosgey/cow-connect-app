-- Diagnostic script to check why staff members appear inactive in admin portal

-- 1. Check all staff members
SELECT 
  s.id, 
  s.employee_id, 
  s.user_id,
  p.full_name, 
  p.email
FROM staff s
LEFT JOIN profiles p ON s.user_id = p.id
ORDER BY s.created_at DESC;

-- 2. Check user roles for these staff members
SELECT 
  s.id AS staff_id,
  s.employee_id,
  p.full_name,
  p.email,
  ur.user_id,
  ur.role,
  ur.active
FROM staff s
LEFT JOIN profiles p ON s.user_id = p.id
LEFT JOIN user_roles ur ON s.user_id = ur.user_id
ORDER BY s.created_at DESC;

-- 3. Count active vs inactive roles
SELECT 
  ur.role,
  ur.active,
  COUNT(*) as count
FROM user_roles ur
WHERE ur.role IN ('staff', 'admin')
GROUP BY ur.role, ur.active
ORDER BY ur.role, ur.active;

-- 4. Check specifically for staff roles
SELECT 
  s.id AS staff_id,
  s.employee_id,
  p.full_name,
  p.email,
  ur.role,
  ur.active,
  CASE 
    WHEN ur.active = true THEN 'Active'
    ELSE 'Inactive'
  END as display_status
FROM staff s
LEFT JOIN profiles p ON s.user_id = p.id
LEFT JOIN user_roles ur ON s.user_id = ur.user_id AND ur.role IN ('staff', 'admin')
ORDER BY s.created_at DESC;