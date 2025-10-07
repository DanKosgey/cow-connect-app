-- Phase 1: Storage policies for kyc-documents bucket
-- Apply these policies first to fix the "row-level security policy" errors

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public access to read documents (for document previews)
CREATE POLICY "Public Access to KYC Documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'kyc-documents');

-- Policy 2: Authenticated users can upload documents
CREATE POLICY "Authenticated Users Can Upload KYC Documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kyc-documents');

-- Policy 3: Users can update their own documents
CREATE POLICY "Users Can Update Their KYC Documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'kyc-documents' AND (auth.uid())::text = owner_id)
WITH CHECK (bucket_id = 'kyc-documents' AND (auth.uid())::text = owner_id);

-- Policy 4: Users can delete their own documents
CREATE POLICY "Users Can Delete Their KYC Documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'kyc-documents' AND (auth.uid())::text = owner_id);

-- Policy 5: Service role can manage all documents (for admin operations)
CREATE POLICY "Service Role Can Manage KYC Documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'kyc-documents');