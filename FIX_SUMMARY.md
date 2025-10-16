# Fix Summary: Staff Management Page Error

## Problem
The Staff management page was throwing a 400 Bad Request error with the message:
```
column profiles_1.active does not exist
```

## Root Cause
The issue was in the Supabase query syntax in `src/pages/admin/Staff.tsx`. The query was incorrectly trying to access the `active` column from the `profiles` table instead of the `user_roles` table.

The problematic query syntax was:
```javascript
user_roles:user_id(
  role,
  active
)
```

This syntax was incorrect because:
1. `user_id` is a column in the `user_roles` table, not in the `staff` table
2. The alias syntax `table:foreign_key_column` was being misused
3. This caused Supabase to try to join the `user_roles` table using the wrong foreign key relationship

## Solution
Fixed the query syntax to correctly reference the `user_roles` table:

```javascript
user_roles(user_id, role, active)
```

This change was made in two places in the Staff.tsx file:
1. Initial data fetch (line ~47)
2. Refresh data function (line ~189)

## Additional Improvements
1. Updated the `getStats` function to use the new `roles` and `activeRoles` arrays that are created during data processing, rather than trying to access the raw `user_roles` data directly.

2. Ensured consistency in the data processing logic between the initial fetch and the refresh function.

## Files Modified
- `src/pages/admin/Staff.tsx` - Fixed query syntax and updated data processing logic

## Testing
Created test files to verify:
- `TEST_STAFF_QUERY.sql` - SQL query to verify the join logic
- `TEST_SUPABASE_STAFF_QUERY.js` - JavaScript snippet showing correct vs incorrect syntax

## Verification
After the fix, the Staff management page should:
1. Load without the 400 Bad Request error
2. Display staff members with their roles and status correctly
3. Show accurate statistics in the stats cards
4. Function properly when filtering and paginating

The fix addresses the immediate error and maintains all existing functionality while using the correct Supabase query syntax.