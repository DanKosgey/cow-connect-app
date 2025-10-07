# Supabase Storage Configuration

## Overview
This document explains how to properly configure Supabase storage for the Cow Connect application to ensure document uploads work correctly.

## Required Storage Bucket Setup

### 1. Create the kyc-documents Bucket
1. Go to your Supabase project dashboard
2. Navigate to Storage → Buckets
3. Create a new bucket named `kyc-documents`
4. Set the bucket to public if needed for document previews

### 2. Configure Row Level Security (RLS)
The bucket needs proper RLS policies to allow authenticated users to upload documents.

#### Create the following policies:

**Select Policy (for public access to documents):**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'kyc-documents');
```

**Insert Policy (for authenticated users):**
```sql
CREATE POLICY "Authenticated Users Can Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kyc-documents');
```

**Update Policy (for document replacement):**
```sql
CREATE POLICY "Users Can Update Their Documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid() = owner_id);
```

**Delete Policy (for document removal):**
```sql
CREATE POLICY "Users Can Delete Their Documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid() = owner_id);
```

### 3. Apply Policies
Run the following SQL in the Supabase SQL editor:

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

## File Path Structure
Documents are stored using the following path structure:
```
{kyc-documents bucket}/
  {user_id}/
    {timestamp}-{document_type}.{extension}
```

Example:
```
kyc-documents/
  a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8/
    1759607449355-national_id_front.png
    1759607449356-national_id_back.png
```

## Troubleshooting Common Issues

### 1. Row Level Security Policy Violation
**Error:** `new row violates row-level security policy`

**Solution:**
- Ensure the RLS policies are properly configured as shown above
- Verify that the user is authenticated when uploading
- Check that the bucket name matches exactly (`kyc-documents`)

### 2. Bucket Not Found
**Error:** `Bucket not found`

**Solution:**
- Verify the bucket `kyc-documents` exists in your Supabase storage
- Check that the bucket name is spelled correctly in the code

### 3. Permission Denied
**Error:** `Permission denied` or `You do not have permission to upload documents`

**Solution:**
- Ensure the authenticated user has the correct permissions
- Verify that the RLS policies are applied correctly
- Check that the user is properly authenticated before uploading

## Testing the Configuration
After setting up the storage configuration:

1. Log in to the application as a farmer
2. Navigate to the farmer registration page
3. Try to upload a document
4. Check the browser console for any errors
5. Verify the document appears in the Supabase storage dashboard

## Security Considerations
- Always validate file types and sizes before uploading
- Use authenticated users only for uploads
- Implement proper error handling to avoid exposing sensitive information
- Regularly review and audit storage access logs