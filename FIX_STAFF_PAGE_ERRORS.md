# Fix Staff Page Errors

## Issues Identified

1. **Supabase 400 Bad Request Error**: The query to fetch staff data was using incorrect embedded query syntax
2. **React Infinite Loop Warning**: Maximum update depth exceeded due to improper useEffect dependencies
3. **TypeScript Interface Issues**: Missing properties in StaffMember interface

## Fixes Applied

### 1. Fixed Supabase Query Syntax

**Problem**: The embedded query syntax was incorrect:
```javascript
profiles:user_id(full_name, email)
```

**Solution**: Changed to proper embedded query syntax:
```javascript
profiles!inner(full_name, email)
```

This tells Supabase to join the profiles table using the foreign key relationship and fetch the specified columns.

### 2. Fixed Infinite Loop Issue

**Problem**: Unnecessary state and useEffect causing infinite re-renders:
```javascript
const [filteredStaff, setFilteredStaff] = useState<any[]>(staff);
useEffect(() => {
  setFilteredStaff(staff);
}, [staff]);
```

**Solution**: Removed the unnecessary state and useEffect. Used the staff data directly:
```javascript
// Use server-side pagination, so we don't need to paginate again on the client
const paginatedData = {
  data: staff,  // Use staff directly instead of filteredStaff
  totalCount: totalCount,
  page: currentPage,
  pageSize: pageSize,
  totalPages: totalPages
};
```

### 3. Fixed TypeScript Interface Issues

**Problem**: The StaffMember interface was missing `hasAnyRoles` and `allRolesInactive` properties.

**Solution**: 
1. Created a shared `StaffMember` interface in `src/types/staff.types.ts`
2. Imported the interface in both the hook and component files
3. Ensured the interface includes all required properties:
   - `hasAnyRoles: boolean`
   - `allRolesInactive: boolean`

### 4. Fixed Type Definition File

**Problem**: The `staff.types.ts` file had a reference to a non-existent `collection_points` table.

**Solution**: Commented out the problematic line:
```typescript
// export type CollectionPoint = Database['public']['Tables']['collection_points']['Row'];
```

## Files Modified

1. `src/hooks/useStaffManagementData.ts` - Fixed query syntax and imported shared interface
2. `src/pages/admin/Staff.tsx` - Removed infinite loop and imported shared interface
3. `src/types/staff.types.ts` - Fixed type definition file
4. `src/types/database.types.ts` - No changes needed (was just a linter error)

## Verification

After applying these fixes, the staff page should:
1. Load without the 400 Bad Request error
2. Display staff members with their roles and status correctly
3. Show accurate statistics in the stats cards
4. Function properly when filtering and paginating
5. Not cause infinite re-renders

The fixes address both the immediate errors and maintain all existing functionality while using the correct Supabase query syntax and React patterns.