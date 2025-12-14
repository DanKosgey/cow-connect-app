-- Fix script to ensure all staff members have active roles in user_roles table

-- First, let's check which staff members don't have active roles
SELECT 
  s.id AS staff_id,
  s.employee_id,
  p.full_name,
  p.email,
  ur.role,
  ur.active
FROM staff s
LEFT JOIN profiles p ON s.user_id = p.id
LEFT JOIN user_roles ur ON s.user_id = ur.user_id AND ur.active = true
WHERE ur.user_id IS NULL
ORDER BY s.created_at DESC;

-- Insert missing staff roles (assuming all staff should have 'staff' role)
INSERT INTO user_roles (user_id, role, active)
SELECT 
  s.user_id,
  'staff'::user_role_enum,
  true
FROM staff s
LEFT JOIN user_roles ur ON s.user_id = ur.user_id AND ur.role = 'staff'
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO UPDATE
SET active = true;

-- Also ensure admin users have active admin roles
INSERT INTO user_roles (user_id, role, active)
SELECT 
  s.user_id,
  'admin'::user_role_enum,
  true
FROM staff s
LEFT JOIN user_roles ur ON s.user_id = ur.user_id AND ur.role = 'admin'
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO UPDATE
SET active = true;

-- Verify the fix
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