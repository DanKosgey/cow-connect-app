# Storage Diagnostics Guide

## Issue Identified
Based on the test results, we found:
1. The `collection-photos` bucket exists but is not public
2. Storage policies are not properly configured
3. The `storage.policies` table does not exist in this project

## Solution Steps

### 1. Enable Row Level Security (RLS)
First, enable RLS on the storage objects table:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### 2. Make the Bucket Public
Update the bucket to be public so photos can be viewed:
```sql
UPDATE storage.buckets 
SET public = true 
WHERE id = 'collection-photos';
```

### 3. Create Storage Policies
Create the necessary policies for the collection-photos bucket:
```sql
-- Policy for public access to view photos
CREATE POLICY "Public Access to Collection Photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'collection-photos');

-- Policy for authenticated users to upload photos
CREATE POLICY "Authenticated Collectors Can Upload Photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'collection-photos');

-- Policy for users to update their own photos
CREATE POLICY "Collectors Can Update Their Photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'collection-photos' AND auth.uid() = owner_id);

-- Policy for users to delete their own photos
CREATE POLICY "Collectors Can Delete Their Photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'collection-photos' AND auth.uid() = owner_id);
```

## Verification Queries

After applying the above changes, run these queries to verify:

```sql
-- Check that RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'objects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');

-- Check that the bucket is now public
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'collection-photos';

-- Check that policies were created (if the table exists)
SELECT name, bucket_id, operation, definition 
FROM storage.policies 
WHERE bucket_id = 'collection-photos';
```

## Alternative Approach

If the `storage.policies` table doesn't exist in your Supabase project, you may need to use the Supabase dashboard instead:

1. Go to your Supabase project dashboard
2. Navigate to Storage → Buckets
3. Find the `collection-photos` bucket
4. Click on the bucket name to open its settings
5. Toggle the "Public" switch to enable public access
6. Go to Authentication → Policies
7. Create the policies manually using the dashboard interface

## Testing

After applying these changes, test the photo upload functionality:
1. Navigate to the New Milk Collection page
2. Click "Choose File" in the Photo Documentation section
3. Select an image file
4. Verify that the photo uploads successfully
5. Check that the photo preview displays correctly
6. Submit a collection and verify the photo URL is saved

## Troubleshooting

If issues persist:

1. **Check Supabase Logs**: Look at the Supabase project logs for any error messages
2. **Verify User Permissions**: Ensure the authenticated user has the correct permissions
3. **Check Network Tab**: Inspect the browser's network tab for failed requests
4. **Contact Supabase Support**: If the `storage.policies` table truly doesn't exist, this may be a project-specific issue that requires Supabase support assistance