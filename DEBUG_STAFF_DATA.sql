-- Debug queries to check staff data

-- 1. Check if there are any staff records
SELECT COUNT(*) as total_staff FROM staff;

-- 2. Check staff table structure
\d staff

-- 3. Check a few sample staff records
SELECT 
  id, 
  employee_id, 
  user_id, 
  created_at 
FROM staff 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check if staff records have corresponding profile records
SELECT 
  s.id, 
  s.employee_id, 
  s.user_id,
  p.full_name, 
  p.email
FROM staff s
LEFT JOIN profiles p ON s.user_id = p.id
ORDER BY s.created_at DESC 
LIMIT 5;

-- 5. Check if there are any orphaned staff records (no matching profile)
SELECT 
  s.id, 
  s.employee_id, 
  s.user_id
FROM staff s
LEFT JOIN profiles p ON s.user_id = p.id
WHERE p.id IS NULL;

-- 6. Check the total count of profiles
SELECT COUNT(*) as total_profiles FROM profiles;