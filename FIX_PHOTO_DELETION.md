# Fix for Photo Deletion Issue

## Issue Identified
The "Remove Photo" button was not actually deleting photos from the storage bucket. It was only clearing the URL from the component state, leaving the files orphaned in the bucket.

## Solution Implemented

### 1. Track Uploaded File Names
Added a new state variable `uploadedFileName` to track the name of the uploaded file:
```typescript
const [uploadedFileName, setUploadedFileName] = useState('');
```

### 2. Store File Name on Upload
When a photo is successfully uploaded, store the file name for later deletion:
```typescript
// Store the uploaded file name for potential deletion
setUploadedFileName(fileName);
```

### 3. Implement Actual Deletion
Updated the "Remove Photo" button to actually delete the file from storage:
```typescript
onClick={async () => {
  try {
    // Delete the file from storage if we have the file name
    if (uploadedFileName) {
      const { error } = await supabase.storage
        .from('collection-photos')
        .remove([uploadedFileName]);
      
      if (error) {
        console.error('Error deleting photo:', error);
        toast.error('Error', 'Failed to delete photo from storage');
      } else {
        console.log('Photo deleted successfully from storage');
      }
    }
    
    // Clear the state
    setPhotoUrl('');
    setUploadedFileName('');
  } catch (error) {
    console.error('Error removing photo:', error);
    toast.error('Error', 'Failed to remove photo');
  }
}}
```

### 4. Clear File Name on Form Reset
Updated the form reset function to also clear the uploaded file name:
```typescript
setPhotoUrl('');
setUploadedFileName(''); // Clear the uploaded file name
```

## Files Modified
- `src/components/collector/EnhancedCollectionForm.tsx` - Main component with all fixes

## Benefits
1. **Prevents Orphaned Files**: Photos are properly deleted from storage when removed
2. **Saves Storage Space**: Unused photos don't accumulate in the bucket
3. **Better User Experience**: The remove functionality now works as expected
4. **Consistent State Management**: Both UI state and storage state are kept in sync

## Testing
To verify the fix:
1. Upload a photo in the New Milk Collection form
2. Click "Remove Photo"
3. Verify that the photo is removed from the UI
4. Check the storage bucket to confirm the file was actually deleted
5. Submit the form and verify no errors occur

## Edge Cases Handled
1. **Network Errors**: Proper error handling if deletion fails
2. **Missing File Name**: Graceful handling if file name is not tracked
3. **Form Reset**: File name cleared when form is reset
4. **User Feedback**: Appropriate success/error messages