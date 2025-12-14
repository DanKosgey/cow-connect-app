-- See all policies on these tables
SELECT 
  schemaname,
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'farmers', 'staff', 'farmer_deductions', 'deduction_types')
ORDER BY tablename, policyname;