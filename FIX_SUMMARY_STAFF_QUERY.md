# Fix Summary: Staff Management Page Query Issue

## Problem
The Staff management page was throwing a 400 Bad Request error with the message:
```
"Could not find a relationship between 'staff' and 'user_roles' in the schema cache"
```

## Root Cause
The issue was in the Supabase query syntax in `src/pages/admin/Staff.tsx`. The query was attempting to use an embedded query syntax:
```javascript
user_roles(user_id, role, active)
```

However, there is no direct foreign key relationship between the `staff` and `user_roles` tables in the database schema. Both tables reference the `profiles` table through their `user_id` columns, but there's no direct relationship between them.

When Supabase encounters this syntax, it tries to find a foreign key relationship between the tables, which doesn't exist, resulting in the error.

## Solution
Fixed the query by using separate queries instead of embedded queries:

1. **Fetch staff data** with profiles information using the existing relationship:
```javascript
const { data, error } = await supabase
  .from('staff')
  .select(`
    id, 
    employee_id, 
    user_id,
    profiles:user_id(full_name, email)
  `)
  .order('created_at', { ascending: false })
  .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
```

2. **Fetch user roles separately** using the user IDs from the staff data:
```javascript
const userIds = data.map(staffMember => staffMember.user_id);
let userRolesData = [];

if (userIds.length > 0) {
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role, active')
    .in('user_id', userIds);
  
  if (!rolesError && rolesData) {
    userRolesData = rolesData;
  }
}
```

3. **Combine the data** in the application logic:
```javascript
const staffWithRoles = data.map(staffMember => {
  const userRoles = userRolesData.filter(role => role.user_id === staffMember.user_id);
  // Process roles and create roles/activeRoles arrays
  return {
    ...staffMember,
    roles: roles,
    activeRoles: activeRoles
  };
});
```

## Files Modified
- `src/pages/admin/Staff.tsx` - Fixed query syntax and updated data fetching logic

## Benefits of This Approach
1. **Correctness**: Uses proper database relationships instead of trying to force a non-existent relationship
2. **Performance**: Still efficient as it uses only two queries instead of one complex query
3. **Maintainability**: Clear separation of concerns and easier to understand
4. **Compatibility**: Works with the existing database schema without requiring changes

## Testing
The fix has been implemented following Supabase's correct query patterns for tables that don't have direct foreign key relationships. The component should now load properly without the relationship error and display staff members with their roles and status correctly.

This fix maintains all existing functionality while resolving the immediate error that was preventing the Staff management page from loading properly.