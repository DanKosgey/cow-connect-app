# Fix Storage Issues Through Supabase Dashboard

Since we don't have the necessary permissions to run ALTER TABLE and UPDATE commands directly, we'll fix the storage issues through the Supabase Dashboard.

## Step 1: Make the Bucket Public

1. Log into your Supabase Dashboard
2. Navigate to **Storage** → **Buckets**
3. Find the `collection-photos` bucket
4. Click on the bucket name to open its settings
5. Toggle the **Public** switch to enable public access
6. Click **Save**

## Step 2: Create Storage Policies

1. While still in the Storage section, click on the **Policies** tab
2. Click **New Policy**
3. Create the following policies one by one:

### Policy 1: Public Access to Collection Photos
- **Policy Name**: Public Access to Collection Photos
- **Operation**: SELECT
- **Who**: public
- **Using**: `bucket_id = 'collection-photos'`

### Policy 2: Authenticated Collectors Can Upload Photos
- **Policy Name**: Authenticated Collectors Can Upload Photos
- **Operation**: INSERT
- **Who**: authenticated
- **With Check**: `bucket_id = 'collection-photos'`

### Policy 3: Collectors Can Update Their Photos
- **Policy Name**: Collectors Can Update Their Photos
- **Operation**: UPDATE
- **Who**: authenticated
- **Using**: `bucket_id = 'collection-photos' AND (auth.uid())::text = owner_id::text`
- **With Check**: `bucket_id = 'collection-photos' AND (auth.uid())::text = owner_id::text`

### Policy 4: Collectors Can Delete Their Photos
- **Policy Name**: Collectors Can Delete Their Photos
- **Operation**: DELETE
- **Who**: authenticated
- **Using**: `bucket_id = 'collection-photos' AND (auth.uid())::text = owner_id::text`

## Alternative Method: Using SQL Editor with Service Role Key

If you prefer to use SQL, you can run the commands through the SQL Editor in the Supabase Dashboard, which runs with the necessary permissions:

1. Go to **SQL Editor** in your Supabase Dashboard
2. Paste and run the following commands:

```sql
-- Make the bucket public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'collection-photos';

-- Enable RLS on storage.objects (if not already enabled)
-- Note: This may fail if already enabled, which is fine
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public Access to Collection Photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'collection-photos');

CREATE POLICY "Authenticated Collectors Can Upload Photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'collection-photos');

CREATE POLICY "Collectors Can Update Their Photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'collection-photos' AND (auth.uid())::text = owner_id::text)
WITH CHECK (bucket_id = 'collection-photos' AND (auth.uid())::text = owner_id::text);

CREATE POLICY "Collectors Can Delete Their Photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'collection-photos' AND (auth.uid())::text = owner_id::text);
```

## Verification

After applying these changes:

1. Go back to your application
2. Try uploading a photo in the New Milk Collection form
3. Check that the photo uploads successfully and displays a preview
4. Submit a collection and verify the photo URL is saved correctly

## Troubleshooting

If you still encounter issues:

1. **Check Browser Console**: Look for any error messages
2. **Verify Bucket Name**: Ensure the bucket is named exactly `collection-photos`
3. **Check Network Tab**: Inspect failed requests in the browser's network tab
4. **Confirm Authentication**: Make sure you're logged in as a user with the correct permissions

## Testing Script

You can also run this test script to verify the setup:

```javascript
// Test bucket access
const { data, error } = await supabase.storage
  .from('collection-photos')
  .upload('test.txt', new Blob(['test']), { upsert: true });

if (error) {
  console.error('Bucket access failed:', error.message);
} else {
  console.log('Bucket access successful');
  // Clean up
  await supabase.storage.from('collection-photos').remove(['test.txt']);
}
```

This approach should resolve the storage issues without requiring direct database ownership permissions.