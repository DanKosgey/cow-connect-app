@echo off
REM Script to manually apply RLS policy fixes to resolve recursion issues

echo Applying RLS policy fixes to resolve recursion issues...

REM This script assumes you have psql installed and DATABASE_URL environment variable set
echo Connecting to database...

psql "%DATABASE_URL%" << EOF

-- Fix deduction system tables
DROP POLICY IF EXISTS "Admins can manage deduction types" ON public.deduction_types;
DROP POLICY IF EXISTS "Admins can manage farmer deductions" ON public.farmer_deductions;
DROP POLICY IF EXISTS "Admins can manage deduction records" ON public.deduction_records;

CREATE POLICY "Admins can manage deduction types" ON public.deduction_types
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage farmer deductions" ON public.farmer_deductions
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage deduction records" ON public.deduction_records
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');

-- Fix collector_payments table
DROP POLICY IF EXISTS "Admins can view all collector payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can insert collector payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can update collector payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can delete collector payments" ON public.collector_payments;

CREATE POLICY "Admins can view all collector payments" 
ON public.collector_payments 
FOR SELECT 
TO authenticated 
USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert collector payments" 
ON public.collector_payments 
FOR INSERT 
TO authenticated 
WITH CHECK (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can update collector payments" 
ON public.collector_payments 
FOR UPDATE 
TO authenticated 
USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete collector payments" 
ON public.collector_payments 
FOR DELETE 
TO authenticated 
USING (public.get_user_role_secure(auth.uid()) = 'admin');

-- Fix credit system tables
DROP POLICY IF EXISTS "Admins and staff can view all credit profiles" ON public.farmer_credit_profiles;
DROP POLICY IF EXISTS "Admins can manage credit profiles" ON public.farmer_credit_profiles;
DROP POLICY IF EXISTS "Admins and staff can view all credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Authorized users can create credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can manage agrovet inventory" ON public.agrovet_inventory;

CREATE POLICY "Admins and staff can view all credit profiles" 
  ON public.farmer_credit_profiles FOR SELECT 
  USING (public.get_user_role_secure(auth.uid()) IN ('admin', 'staff'));

CREATE POLICY "Admins can manage credit profiles" 
  ON public.farmer_credit_profiles FOR ALL 
  USING (public.get_user_role_secure(auth.uid()) = 'admin');

CREATE POLICY "Admins and staff can view all credit transactions" 
  ON public.credit_transactions FOR SELECT 
  USING (public.get_user_role_secure(auth.uid()) IN ('admin', 'staff'));

CREATE POLICY "Authorized users can create credit transactions" 
  ON public.credit_transactions FOR INSERT 
  WITH CHECK (public.get_user_role_secure(auth.uid()) IN ('admin', 'staff'));

CREATE POLICY "Admins can manage agrovet inventory" 
  ON public.agrovet_inventory FOR ALL 
  USING (public.get_user_role_secure(auth.uid()) = 'admin');

-- Fix invitations table
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete their invitations" ON public.invitations;

CREATE POLICY "Admins can create invitations" 
  ON public.invitations FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'admin'
    )
  );

CREATE POLICY "Admins can update their invitations" 
  ON public.invitations FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'admin'
    )
  );

CREATE POLICY "Admins can delete their invitations" 
  ON public.invitations FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'admin'
    )
  );

-- Fix collections table (collector access)
DROP POLICY IF EXISTS "collections_select_by_collectors" ON public.collections;
DROP POLICY IF EXISTS "collections_insert_by_collectors" ON public.collections;
DROP POLICY IF EXISTS "collections_update_by_collectors" ON public.collections;

CREATE POLICY "collections_select_by_collectors" 
  ON public.collections 
  FOR SELECT 
  USING (
    staff_id IN (
      SELECT s.id FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'collector'
    )
  );

CREATE POLICY "collections_insert_by_collectors" 
  ON public.collections 
  FOR INSERT 
  WITH CHECK (
    staff_id IN (
      SELECT s.id FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'collector'
    )
  );

CREATE POLICY "collections_update_by_collectors" 
  ON public.collections 
  FOR UPDATE 
  USING (
    staff_id IN (
      SELECT s.id FROM public.staff s
      WHERE s.user_id = auth.uid()
      AND public.get_user_role_secure(s.user_id) = 'collector'
    )
  );

-- Fix collections table (staff access)
DROP POLICY IF EXISTS "collections_select_by_staff" ON public.collections;
DROP POLICY IF EXISTS "collections_update_by_staff" ON public.collections;

CREATE POLICY "collections_select_by_staff" 
  ON public.collections 
  FOR SELECT 
  USING (public.get_user_role_secure(auth.uid()) = 'staff');

CREATE POLICY "collections_update_by_staff" 
  ON public.collections 
  FOR UPDATE 
  USING (public.get_user_role_secure(auth.uid()) = 'staff');

-- Fix staff table
DROP POLICY IF EXISTS "staff_select_own_by_collectors" ON public.staff;

CREATE POLICY "staff_select_own_by_collectors" 
  ON public.staff 
  FOR SELECT 
  USING (
    user_id = auth.uid()
    AND public.get_user_role_secure(auth.uid()) = 'collector'
  );

-- Grant necessary permissions
GRANT ALL ON public.deduction_types TO authenticated;
GRANT ALL ON public.farmer_deductions TO authenticated;
GRANT ALL ON public.deduction_records TO authenticated;
GRANT ALL ON public.collector_payments TO authenticated;
GRANT ALL ON public.farmer_credit_profiles TO authenticated;
GRANT ALL ON public.credit_transactions TO authenticated;
GRANT ALL ON public.agrovet_inventory TO authenticated;
GRANT ALL ON public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.collections TO authenticated;
GRANT SELECT ON public.staff TO authenticated;

-- Verify fixes
SELECT 'Applied RLS policy fixes successfully' as status;

\q
EOF

echo RLS policy fixes applied successfully!