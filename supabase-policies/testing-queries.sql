-- 🔍 Debugging Queries
-- Run these queries in the Supabase SQL Editor to verify the fixes

-- Check Active Policies
-- View all policies on storage.objects
SELECT * FROM pg_policies WHERE tablename = 'objects';

-- View all policies on farmers
SELECT * FROM pg_policies WHERE tablename = 'farmers';

-- View all policies on kyc_documents
SELECT * FROM pg_policies WHERE tablename = 'kyc_documents';

-- View all policies on profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check Storage Objects
-- View all uploaded files
SELECT * FROM storage.objects WHERE bucket_id = 'kyc-documents';

-- Check owner_id format (should match user UUID)
SELECT id, name, owner_id, (auth.uid())::text as current_user
FROM storage.objects 
WHERE bucket_id = 'kyc-documents';

-- Check Farmer Records
-- View all farmers with their users
SELECT f.*, p.email, ur.role
FROM farmers f
JOIN profiles p ON f.user_id = p.id
LEFT JOIN user_roles ur ON p.id = ur.user_id;

-- Check KYC Documents
-- View all kyc documents with farmer info
SELECT kd.*, f.full_name as farmer_name
FROM kyc_documents kd
JOIN farmers f ON kd.farmer_id = f.id;

-- Test Queries for Verification
-- Test 1: Check if a specific user can access their farmer record
SELECT * FROM farmers WHERE user_id = 'USER_UUID_HERE';

-- Test 2: Check if a specific user can access their documents
SELECT * FROM kyc_documents kd
JOIN farmers f ON kd.farmer_id = f.id
WHERE f.user_id = 'USER_UUID_HERE';

-- Test 3: Check if admin can access all farmers
SELECT COUNT(*) as total_farmers FROM farmers;

-- Test 4: Check if storage is properly configured
SELECT EXISTS(
  SELECT 1 FROM storage.buckets WHERE id = 'kyc-documents'
) as bucket_exists;