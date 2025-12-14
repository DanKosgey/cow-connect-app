-- Drop ALL policies on these tables
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE tablename IN ('profiles', 'farmers', 'staff', 'farmer_deductions', 'deduction_types')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;