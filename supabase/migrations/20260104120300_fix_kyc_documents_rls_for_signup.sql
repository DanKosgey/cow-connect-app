-- Fix RLS policies for kyc_documents table to allow new user signup
-- This migration ensures that authenticated users can upload their KYC documents during signup

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own kyc documents" ON kyc_documents;
DROP POLICY IF EXISTS "Users can view own kyc documents" ON kyc_documents;
DROP POLICY IF EXISTS "Users can update own kyc documents" ON kyc_documents;
DROP POLICY IF EXISTS "Admins can view all kyc documents" ON kyc_documents;
DROP POLICY IF EXISTS "Admins can manage all kyc documents" ON kyc_documents;
DROP POLICY IF EXISTS "Service role can manage all kyc documents" ON kyc_documents;

-- Enable RLS on kyc_documents table (if not already enabled)
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to INSERT their own KYC documents
-- Users can insert documents linked to their pending_farmer_id or farmer_id
CREATE POLICY "Users can insert own kyc documents"
ON kyc_documents
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if the pending_farmer belongs to the user
  (pending_farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pending_farmers pf
    WHERE pf.id = kyc_documents.pending_farmer_id
    AND pf.user_id = auth.uid()
  ))
  OR
  -- Check if the farmer belongs to the user
  (farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM farmers f
    WHERE f.id = kyc_documents.farmer_id
    AND f.user_id = auth.uid()
  ))
);

-- Policy: Allow users to view their own KYC documents
CREATE POLICY "Users can view own kyc documents"
ON kyc_documents
FOR SELECT
TO authenticated
USING (
  -- Check if the pending_farmer belongs to the user
  (pending_farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pending_farmers pf
    WHERE pf.id = kyc_documents.pending_farmer_id
    AND pf.user_id = auth.uid()
  ))
  OR
  -- Check if the farmer belongs to the user
  (farmer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM farmers f
    WHERE f.id = kyc_documents.farmer_id
    AND f.user_id = auth.uid()
  ))
);

-- Policy: Allow users to update their own KYC documents
CREATE POLICY "Users can update own kyc documents"
ON kyc_documents
FOR UPDATE
TO authenticated
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

-- Policy: Allow admins to view all KYC documents
CREATE POLICY "Admins can view all kyc documents"
ON kyc_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Policy: Allow admins to manage all KYC documents
CREATE POLICY "Admins can manage all kyc documents"
ON kyc_documents
FOR ALL
TO authenticated
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

-- Policy: Allow service role to manage all KYC documents
CREATE POLICY "Service role can manage all kyc documents"
ON kyc_documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
