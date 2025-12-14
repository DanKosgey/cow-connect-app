-- 2. Create simple admin policies
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