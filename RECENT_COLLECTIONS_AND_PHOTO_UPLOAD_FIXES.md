# Recent Collections and Photo Upload Fixes

## Summary of Changes Made

### 1. Enhanced Recent Collections Display
- Improved the recent collections section in the EnhancedCollectionForm component
- Added better error handling and debugging for data fetching
- Added a refresh button to manually refresh recent collections
- Improved the display of collection information with status badges
- Added fallback handling when farmer data is not available

### 2. Fixed Photo Upload Functionality
- Added file type and size validation for uploaded photos
- Improved error handling and user feedback
- Added a remove photo button
- Included file information and supported formats in the UI

### 3. Database Integration Improvements
- Ensured collection records include photo URLs and notes
- Added better debugging for collection data fetching
- Improved handling of collection-farmer relationships

### 4. Setup Scripts
- Created setup script for collection-photos storage bucket
- Created diagnostic scripts to test storage and collections table

## Required Setup Steps

### 1. Create collection-photos Storage Bucket
1. Log into your Supabase dashboard
2. Navigate to Storage → Buckets
3. Click "New Bucket"
4. Enter "collection-photos" as the bucket name
5. Set the bucket to public
6. Click "Create"

### 2. Apply Storage Policies
Run the following SQL commands in your Supabase SQL Editor:

```sql
-- Create policies for collection-photos bucket
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
USING (bucket_id = 'collection-photos' AND auth.uid() = owner_id);

CREATE POLICY "Collectors Can Delete Their Photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'collection-photos' AND auth.uid() = owner_id);
```

## Testing

### Test Recent Collections
1. Navigate to the New Milk Collection page
2. The recent collections section should display the 5 most recent collections
3. Use the refresh button to manually update the list
4. After recording a new collection, the list should automatically update

### Test Photo Upload
1. Navigate to the New Milk Collection page
2. Click "Choose File" in the Photo Documentation section
3. Select an image file (JPG, PNG, or GIF, max 5MB)
4. The photo should upload and display a preview
5. Click "Remove Photo" to clear the uploaded photo
6. When submitting a collection, the photo URL should be saved with the collection record

## Troubleshooting

### If Recent Collections Don't Display
1. Check browser console for errors
2. Verify that the collections table has data
3. Ensure the farmer IDs in collections match existing farmers

### If Photo Upload Fails
1. Check browser console for errors
2. Verify that the collection-photos bucket exists
3. Ensure storage policies are applied correctly
4. Confirm that the user is authenticated

## Files Modified

- `src/components/collector/EnhancedCollectionForm.tsx` - Main component with recent collections and photo upload
- `scripts/setup-collection-photos-bucket.js` - Setup script for storage bucket
- `scripts/test-collection-photos.js` - Test script for photo uploads
- `scripts/diagnose-collections-table.js` - Diagnostic script for collections table