-- Check if the status column exists in the staff table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'staff' AND column_name = 'status';

-- Check the structure of the staff table
\d staff

-- Check if there are any staff records
SELECT COUNT(*) as staff_count FROM staff;

-- Check a few sample staff records
SELECT id, user_id, employee_id, created_at FROM staff LIMIT 5;