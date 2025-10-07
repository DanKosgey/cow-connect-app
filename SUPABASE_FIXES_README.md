# Supabase Integration Fixes

This document explains the fixes applied to resolve the Supabase integration issues in the farmer registration system.

## Issues Fixed

1. **Storage RLS Policy Violations**: Fixed "new row violates row-level security policy" errors
2. **Inconsistent File Path Structure**: Standardized file paths to use user UUID instead of national ID
3. **Incomplete Metadata Storage**: Ensured proper document metadata storage in kyc_documents table
4. **Missing RLS Policies**: Added comprehensive Row Level Security policies for all tables

## Changes Made

### 1. Application Code Updates

#### File Upload Logic (FarmerRegistration.tsx & CompleteRegistration.tsx)
- Changed file path structure from `nationalId/filename` to `user.id/filename`
- Added proper error handling for document uploads
- Implemented separate functions for uploading documents and saving metadata

#### Farmer Registration Flow
- Replaced multiple database operations with a single `upsert` operation
- Ensured all farmer fields are properly populated
- Added comprehensive error handling

### 2. Database Policy Updates

#### Storage Policies (01-storage-policies.sql)
- Added 5 policies for the kyc-documents bucket
- Fixed type casting issue with `auth.uid()` comparison
- Enabled proper access control for authenticated users

#### Farmers Table Policies (02-farmers-policies.sql)
- Added 5 policies for proper access control
- Farmers can read/update their own records
- Staff and admin have appropriate access levels

#### KYC Documents Policies (03-kyc-documents-policies.sql)
- Added 4 policies for document access control
- Enabled RLS on kyc_documents table
- Proper linking between farmers and their documents

#### Profiles Policies (04-profiles-policies.sql)
- Added 4 policies for profile access control
- Users can manage their own profiles
- Admin has appropriate access levels

## How to Apply the Fixes

### 1. Update Application Code
The FarmerRegistration.tsx and CompleteRegistration.tsx files have already been updated with the new file upload logic and registration flow.

### 2. Apply Database Policies
Run the SQL scripts in the following order:

1. `supabase-policies/01-storage-policies.sql`
2. `supabase-policies/02-farmers-policies.sql`
3. `supabase-policies/03-kyc-documents-policies.sql`
4. `supabase-policies/04-profiles-policies.sql`

### 3. Verify the Fixes
Use the queries in `supabase-policies/testing-queries.sql` to verify that the policies are working correctly.

## Testing Checklist

### Database Tests
- [ ] Run all SQL policy scripts in Supabase SQL Editor
- [ ] Verify kyc-documents bucket exists in Storage
- [ ] Check that storage.objects has 5 policies active
- [ ] Confirm public.farmers has 5 policies active
- [ ] Confirm public.kyc_documents RLS is enabled with 4 policies
- [ ] Verify public.profiles has 4 policies active

### Registration Flow Tests
- [ ] New user signup → verify profile created
- [ ] Email confirmation → verify can login
- [ ] Complete farmer form → verify farmer record created
- [ ] Upload documents → verify no RLS errors
- [ ] Check storage.objects → verify files with correct owner_id
- [ ] Check kyc_documents table → verify metadata stored
- [ ] Verify registration_completed = true

### Admin Dashboard Tests
- [ ] Login as admin/staff
- [ ] View pending farmers list
- [ ] Access farmer documents
- [ ] Update KYC status (approve/reject)
- [ ] Verify farmer sees updated status

### Error Handling Tests
- [ ] Try duplicate national_id → should fail gracefully
- [ ] Try uploading without auth → should fail with clear error
- [ ] Try accessing another user's documents → should fail (RLS)
- [ ] Try incomplete form → should show validation errors

## Key Takeaways

1. **Always cast auth.uid() to text** when comparing with storage.objects.owner_id
2. **Use user.id (UUID) for folder structure**, not nationalId
3. **Enable RLS on all sensitive tables** (kyc_documents had it disabled)
4. **Test with real users**, not just service role (service role bypasses RLS)
5. **Monitor Supabase logs** during testing to catch policy violations early

## Troubleshooting

If you still encounter issues:

1. Check that all policies have been applied correctly
2. Verify the kyc-documents bucket exists in Storage
3. Ensure the user is properly authenticated before uploading documents
4. Check Supabase logs for specific error messages
5. Verify that the application is using the correct Supabase URL and keys