# Fix for Collection Status Enum Error

## Issue
The application was throwing a 400 Bad Request error with the message:
```
invalid input value for enum collection_status_enum: "Rejected"
```

## Root Cause
The database enum [collection_status_enum](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/types/database.types.ts#L1834-L1834) only accepts these values:
- 'Collected'
- 'Verified'
- 'Paid'
- 'Cancelled'

But the application was trying to insert 'Rejected' as a status value, which is not valid.

## Solution
Updated the application to use the correct enum values:

1. Changed status from 'Rejected' to 'Cancelled' in the form submission
2. Updated UI labels and messages to reflect "Cancel Collection" instead of "Reject Collection"
3. Updated status badge styling to properly display 'Cancelled' status
4. Updated all user-facing text to use consistent terminology

## Files Modified
- `src/components/collector/EnhancedCollectionForm.tsx` - Main component with all the fixes

## Verification
After applying these changes, the collection form should now work correctly:
- Collections can be recorded with status 'Collected'
- Collections can be cancelled with status 'Cancelled'
- Recent collections display properly with correct status badges
- No more 400 Bad Request errors related to enum values

## Testing
To verify the fix:
1. Navigate to the New Milk Collection page
2. Fill in collection details
3. Optionally check "Cancel Collection" and provide a reason
4. Submit the form
5. Verify that no errors occur and the success message appears
6. Check that the recent collections section updates correctly