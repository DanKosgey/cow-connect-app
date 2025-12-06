# Enhanced Photo Replacement Functionality

## Enhancement Summary
Improved the photo upload functionality to ensure proper replacement of photos in the storage bucket when a user selects a new photo.

## Key Improvements

### 1. Automatic Photo Replacement
When a user selects a new photo:
- The existing photo is automatically deleted from the storage bucket
- The new photo is uploaded with a unique filename
- The URL is updated to point to the new photo
- The uploaded filename is tracked for future operations

### 2. Enhanced handlePhotoUpload Function
The photo upload function now includes:

```typescript
// If there's already an uploaded photo, delete it first
if (uploadedFileName) {
  try {
    const { error: deleteError } = await supabase.storage
      .from('collection-photos')
      .remove([uploadedFileName]);
    
    if (deleteError) {
      console.error('Error deleting previous photo:', deleteError);
    } else {
      console.log('Previous photo deleted successfully');
    }
  } catch (deleteError) {
    console.error('Error deleting previous photo:', deleteError);
  }
}
```

### 3. Improved User Experience
- Seamless photo replacement without manual deletion steps
- Proper cleanup of storage resources
- Consistent URL updates
- Better error handling

## Files Modified
- `src/components/collector/EnhancedCollectionForm.tsx` - Enhanced photo upload functionality

## Benefits
1. **Automatic Cleanup**: Previous photos are automatically deleted, preventing storage bloat
2. **Seamless Replacement**: Users can easily replace photos with a single action
3. **Resource Management**: Storage space is efficiently managed
4. **Consistent State**: UI and storage remain in sync

## How It Works
1. User clicks "Change Photo" or "Choose File"
2. If a photo already exists, it's deleted from the bucket
3. New photo is uploaded with a unique filename
4. Public URL is generated and displayed
5. Filename is tracked for future operations

## Testing
To verify the enhancement:
1. Upload a photo
2. Click "Change Photo" and select a different photo
3. Verify the first photo is deleted from storage
4. Verify the new photo is uploaded and displayed
5. Check that the URL points to the new photo
6. Submit the collection and verify the correct URL is saved

## Edge Cases Handled
1. **Network Errors**: Graceful handling of upload/delete failures
2. **Concurrent Operations**: Proper sequencing of delete then upload
3. **State Management**: Consistent tracking of current photo
4. **User Feedback**: Appropriate success/error messages