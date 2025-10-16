# KYC Document Upload Issue Fix

## Problem Summary

The storage tests work but your application code doesn't because:

1. **Storage Tests**: Use the **service key** (admin privileges) which bypasses all RLS policies
2. **Application Code**: Uses the **anon key** which requires proper user authentication and adheres to RLS policies

## Root Cause

From diagnostic tests:
```
✅ Service key upload successful
✅ Anon key upload correctly failed: new row violates row-level security policy
```

This shows that the RLS policies are working correctly. The issue is that your web app user isn't properly authenticated when attempting the upload.

## Solution Steps

### 1. Verify Storage Policies

Ensure these policies are applied to your Supabase instance:

```sql
-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for kyc-documents bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'kyc-documents');

CREATE POLICY "Authenticated Users Can Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kyc-documents');

CREATE POLICY "Users Can Update Their Documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid() = owner_id);

CREATE POLICY "Users Can Delete Their Documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid() = owner_id);
```

### 2. Verify Authentication Flow

Check that users are properly authenticated before uploading:

1. User signs in through the AuthProvider
2. Session is established with valid user ID
3. User navigates to KYC upload page
4. Upload is attempted with authenticated user

### 3. Debug Authentication Issues

Use the diagnostic tools we've created:

1. **In-browser diagnostics**: The KYCAuthDiagnostics component shows in development mode
2. **Console logging**: Check browser console for authentication state
3. **Network tab**: Verify requests include proper authentication headers

### 4. Common Fixes

#### Fix 1: Ensure User is Authenticated Before Upload

In your EnhancedKYCDocumentUpload component, add explicit authentication checks:

```typescript
// Add this to the uploadDocument function
const uploadDocument = useCallback(async (documentKey: string) => {
  // Explicit authentication check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error('Authentication Required', 'Please sign in to upload documents');
    return;
  }
  
  // Rest of upload logic...
}, []);
```

#### Fix 2: Add Better Error Handling

Enhance error messages to be more descriptive:

```typescript
catch (error: any) {
  console.error('KYCStorageService: Upload error:', error);
  
  // More specific error messages
  if (error.message.includes('row-level security')) {
    toast.error('Authentication Error', 'You must be signed in to upload documents');
  } else if (error.message.includes('Bucket not found')) {
    toast.error('Configuration Error', 'Storage bucket not configured properly');
  } else {
    toast.error('Upload Failed', error.message || 'Failed to upload document');
  }
  
  throw error;
}
```

#### Fix 3: Add Session Refresh

Sometimes sessions expire. Add session refresh capability:

```typescript
// In your upload function, refresh session if needed
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) {
  // Try to refresh session
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    toast.error('Session Expired', 'Please sign in again');
    navigate('/login');
    return;
  }
}
```

### 5. Testing the Fix

1. Sign in as a farmer user
2. Navigate to the KYC document upload page
3. Try to upload a document
4. Check browser console for diagnostic information
5. Verify the document appears in Supabase storage dashboard

### 6. Verification Commands

Run these scripts to verify the fix:

```bash
# Test storage policies
node scripts/verify-storage-policies.cjs

# Test KYC upload flow
node scripts/test-kyc-upload-flow.cjs

# Run diagnostics in browser using the KYCAuthDiagnostics component
```

## Expected Outcome

After implementing these fixes:
- Authenticated users can upload documents to the kyc-documents bucket
- Unauthenticated users still cannot upload (security preserved)
- Error messages are more descriptive
- Session handling is more robust

## Additional Notes

1. Make sure the bucket name is exactly "kyc-documents" (case-sensitive)
2. Ensure users have the "authenticated" role in Supabase
3. Check that the user_roles table has the correct role assignments
4. Verify that the RLS policies are applied to the storage.objects table

If issues persist, check:
- Browser console for detailed error messages
- Network tab for failed requests
- Supabase logs for server-side errors
- Authentication state using the diagnostic tools