# Solution Summary: Fix for PostgREST PGRST201 Error

## Problem Description
The application was encountering a PostgREST error with code `PGRST201`:
```
Could not embed because more than one relationship was found for 'collections' and 'staff'
```

This error occurred because the `collections` table has multiple foreign key relationships pointing to the `staff` table:
1. `collections_staff_id_fkey` - Links to the staff member who handled the collection (`staff_id` column)
2. `collections_approved_by_fkey` - Links to the staff member who approved the collection (`approved_by` column)

When using Supabase's `.select()` method with embedded relationships like `staff(*)`, PostgREST couldn't determine which relationship to use, causing the ambiguity error.

## Root Cause Analysis
After thorough investigation, the issue was found in two files where queries were not specifying the exact relationship name:

1. `src/pages/admin/AdminDashboard.bak.tsx` - Line 345
2. `src/services/database-optimizer.ts` - Line 229

These files contained queries using `staff (...)` without specifying which of the two relationships to use.

## Solution Implemented
Updated all queries that embed staff data to explicitly specify the relationship name:

### Files Modified
1. **src/pages/admin/AdminDashboard.bak.tsx**
   - Changed `staff (...)` to `collections_staff_id_fkey:staff (...)`

2. **src/services/database-optimizer.ts**
   - Changed `staff (...)` to `collections_staff_id_fkey:staff (...)`

### Files Verified (Already Correct)
The following files were already correctly specifying relationship names and required no changes:
- `src/hooks/useRealtimeCollections.ts`
- `src/hooks/useStaffData.ts`
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/CollectionsView.tsx`
- `src/services/staff-data-service.ts`

## Best Practices for Future Development
1. Always specify explicit relationship names when embedding data from tables with multiple foreign key relationships
2. Use the format `relationship_name:table(columns)` to avoid ambiguity
3. When multiple relationships exist, choose the most appropriate one based on business logic
4. If both relationships are needed, use different aliases:
   ```javascript
   .select(`
     collections_staff_id_fkey:collector(profiles(full_name)),
     collections_approved_by_fkey:approver(profiles(full_name))
   `)
   ```

## Testing
After implementing these changes, the PGRST201 error should be resolved. All queries that fetch collections data with embedded staff information now properly specify which relationship to use.

## Additional Notes
- The `.bak` files are backup files and may not be actively used in the application
- The main application functionality should continue to work normally with these fixes
- No functionality was changed, only the way relationships are specified in database queries