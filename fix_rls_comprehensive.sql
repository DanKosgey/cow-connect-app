-- Comprehensive RLS Fix for Admin Dashboard Access
-- This migration fixes the 500 Internal Server Errors by ensuring proper RLS policies

BEGIN;

-- Step 1: Drop all existing conflicting policies
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

-- Step 2: Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deduction_types ENABLE ROW LEVEL SECURITY;

-- Step 3: Create comprehensive admin policies
-- Admins can access all profiles
CREATE POLICY "admin_all_profiles"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.active = true
  )
);

-- Admins can access all farmers
CREATE POLICY "admin_all_farmers"
ON farmers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.active = true
  )
);

-- Admins can access all staff
CREATE POLICY "admin_all_staff"
ON staff FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.active = true
  )
);

-- Admins can access all farmer_deductions
CREATE POLICY "admin_all_farmer_deductions"
ON farmer_deductions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.active = true
  )
);

-- Admins can access all deduction_types
CREATE POLICY "admin_all_deduction_types"
ON deduction_types FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
    AND user_roles.active = true
  )
);

-- Step 4: Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON farmers TO authenticated;
GRANT ALL ON staff TO authenticated;
GRANT ALL ON farmer_deductions TO authenticated;
GRANT ALL ON deduction_types TO authenticated;

COMMIT;

-- Verification queries
-- Check that policies were created
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

-- Test queries
-- Test profiles access
SELECT COUNT(*) FROM profiles;

-- Test farmers access
SELECT COUNT(*) FROM farmers;

-- Test staff access
SELECT COUNT(*) FROM staff;

-- Test farmer_deductions access
SELECT COUNT(*) FROM farmer_deductions;

-- Test deduction_types access
SELECT COUNT(*) FROM deduction_types;

-- Test nested join (this is what was failing)
SELECT s.*, p.full_name, p.email 
FROM staff s 
LEFT JOIN profiles p ON s.user_id = p.id 
LIMIT 1;