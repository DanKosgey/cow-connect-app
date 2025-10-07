# Foreign Key Constraint Violation Fix

## Problem
The error "insert or update on table 'collections' violates foreign key constraint 'collections_staff_id_fkey'" indicates that you are trying to insert a collection record with a [staff_id](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\types\database.types.ts#L190-L190) that doesn't exist in the staff table.

## Root Cause
The EnhancedCollectionForm component was incorrectly using the user ID directly as the [staff_id](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\types\database.types.ts#L190-L190). However, the collections table's [staff_id](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\types\database.types.ts#L190-L190) field references the staff table's ID, not the user ID. There's a one-to-one relationship between users and staff records, where:
- Users are stored in the `profiles` table (from Supabase auth)
- Staff records are stored in the `staff` table
- The `staff` table has a `user_id` field that references the `profiles` table
- The `collections` table's [staff_id](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\types\database.types.ts#L190-L190) field references the `staff` table's ID

## Solution
I've fixed the issue by:

1. **Fetching the correct staff ID** - Added a new state variable `staffId` to store the actual staff record ID
2. **Loading staff data on component mount** - Added a query to fetch the staff record based on the user ID
3. **Using the correct ID in the insert operation** - Updated the collection insert operation to use `staffId` instead of `user?.id`

## Changes Made

### EnhancedCollectionForm.tsx
1. Added `staffId` state variable:
   ```typescript
   const [staffId, setStaffId] = useState<string | null>(null);
   ```

2. Modified `fetchData` to load staff record:
   ```typescript
   // Fetch staff record to get the staff ID
   const { data: staffData, error: staffError } = await supabase
     .from('staff')
     .select('id')
     .eq('user_id', user?.id)
     .limit(1);

   if (staffError) throw staffError;
   
   if (!staffData || staffData.length === 0) {
     throw new Error('Staff record not found. Please contact administrator.');
   }
   
   setStaffId(staffData[0].id);
   ```

3. Updated `handleSubmit` to validate staff ID and use it in the insert:
   ```typescript
   if (!staffId) {
     showError('Error', 'Staff record not found. Please contact administrator.');
     return;
   }

   // In the insert operation:
   staff_id: staffId, // Use the correct staff ID
   ```

## How It Works
1. When the component loads, it fetches the staff record that corresponds to the current user
2. It stores the staff record's ID in the `staffId` state variable
3. When submitting a collection, it uses this `staffId` instead of the user ID
4. This ensures the foreign key constraint is satisfied because the [staff_id](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\types\database.types.ts#L190-L190) now references an actual record in the staff table

## Testing
To verify the fix:
1. Log in as a staff member
2. Navigate to the collection form
3. Fill out the form and submit
4. Verify that no foreign key constraint errors occur
5. Check that the collection is properly recorded in the database with the correct staff reference

## Future Considerations
- Consider implementing a utility function to fetch staff data that can be reused across components
- Add more comprehensive error handling for cases where staff records might be missing
- Implement caching for staff data to reduce database queries