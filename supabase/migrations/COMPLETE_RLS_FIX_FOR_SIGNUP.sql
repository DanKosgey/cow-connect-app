-- ============================================================================
-- COMPREHENSIVE RLS FIX FOR FARMER SIGNUP FLOW
-- ============================================================================
-- This script fixes all RLS policies to allow new farmers to complete signup
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. FIX PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles"
ON profiles FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. FIX USER_ROLES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own farmer role" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON user_roles;
DROP POLICY IF EXISTS "Service role can manage all roles" ON user_roles;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to assign themselves ONLY the 'farmer' role
CREATE POLICY "Users can insert own farmer role"
ON user_roles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'farmer');

CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own roles"
ON user_roles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all roles"
ON user_roles FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. FIX PENDING_FARMERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own pending farmer record" ON pending_farmers;
DROP POLICY IF EXISTS "Users can view own pending farmer record" ON pending_farmers;
DROP POLICY IF EXISTS "Users can update own pending farmer record" ON pending_farmers;
DROP POLICY IF EXISTS "Admins can view all pending farmers" ON pending_farmers;
DROP POLICY IF EXISTS "Admins can manage all pending farmers" ON pending_farmers;
DROP POLICY IF EXISTS "Service role can manage all pending farmers" ON pending_farmers;

ALTER TABLE pending_farmers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own pending farmer record"
ON pending_farmers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own pending farmer record"
ON pending_farmers FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own pending farmer record"
ON pending_farmers FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all pending farmers"
ON pending_farmers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

CREATE POLICY "Admins can manage all pending farmers"
ON pending_farmers FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

CREATE POLICY "Service role can manage all pending farmers"
ON pending_farmers FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. FIX KYC_DOCUMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own kyc documents" ON kyc_documents;
DROP POLICY IF EXISTS "Users can view own kyc documents" ON kyc_documents;
DROP POLICY IF EXISTS "Users can update own kyc documents" ON kyc_documents;
DROP POLICY IF EXISTS "Admins can view all kyc documents" ON kyc_documents;
DROP POLICY IF EXISTS "Admins can manage all kyc documents" ON kyc_documents;
DROP POLICY IF EXISTS "Service role can manage all kyc documents" ON kyc_documents;

ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own kyc documents"
ON kyc_documents FOR INSERT TO authenticated
WITH CHECK (
  (pending_farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pending_farmers pf
    WHERE pf.id = kyc_documents.pending_farmer_id
    AND pf.user_id = auth.uid()
  ))
  OR
  (farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM farmers f
    WHERE f.id = kyc_documents.farmer_id
    AND f.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can view own kyc documents"
ON kyc_documents FOR SELECT TO authenticated
USING (
  (pending_farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pending_farmers pf
    WHERE pf.id = kyc_documents.pending_farmer_id
    AND pf.user_id = auth.uid()
  ))
  OR
  (farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM farmers f
    WHERE f.id = kyc_documents.farmer_id
    AND f.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can update own kyc documents"
ON kyc_documents FOR UPDATE TO authenticated
USING (
  (pending_farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pending_farmers pf
    WHERE pf.id = kyc_documents.pending_farmer_id
    AND pf.user_id = auth.uid()
  ))
  OR
  (farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM farmers f
    WHERE f.id = kyc_documents.farmer_id
    AND f.user_id = auth.uid()
  ))
)
WITH CHECK (
  (pending_farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pending_farmers pf
    WHERE pf.id = kyc_documents.pending_farmer_id
    AND pf.user_id = auth.uid()
  ))
  OR
  (farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM farmers f
    WHERE f.id = kyc_documents.farmer_id
    AND f.user_id = auth.uid()
  ))
);

CREATE POLICY "Admins can view all kyc documents"
ON kyc_documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

CREATE POLICY "Admins can manage all kyc documents"
ON kyc_documents FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

CREATE POLICY "Service role can manage all kyc documents"
ON kyc_documents FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- DONE! All RLS policies have been fixed for farmer signup flow
-- ============================================================================
