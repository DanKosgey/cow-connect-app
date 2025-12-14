-- Test each policy immediately after creation:
-- Test profiles policy
SELECT COUNT(*) FROM profiles;

-- Test farmers policy  
SELECT COUNT(*) FROM farmers;

-- Test staff policy
SELECT COUNT(*) FROM staff;

-- Test farmer_deductions policy
SELECT COUNT(*) FROM farmer_deductions;

-- Test deduction_types policy
SELECT COUNT(*) FROM deduction_types;

-- Test nested join (this is what's failing)
SELECT s.*, p.full_name, p.email 
FROM staff s 
LEFT JOIN profiles p ON s.user_id = p.id 
LIMIT 1;