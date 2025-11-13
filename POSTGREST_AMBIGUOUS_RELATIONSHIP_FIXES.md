# PostgREST Ambiguous Relationship Error Fixes

## Issue Description
The error `PGRST201: Could not embed because more than one relationship was found for 'collections' and 'staff'` occurred when querying the collections table with embedded staff relationships. This happens because there are multiple foreign key relationships between the collections and staff tables:

1. `collections.staff_id` - References the collector who collected the milk
2. `milk_approvals.staff_id` - References the staff member who approved the milk

When querying collections and trying to embed staff data, PostgREST doesn't know which relationship to use.

## Fixes Implemented

### 1. Fixed getPendingCollections Function
**File**: `src/services/milk-approval-service.ts`
**Lines**: 410-414

**Before**:
```javascript
staff (
  id,
  user_id
)
```

**After**:
```javascript
staff!collections_staff_id_fkey (
  id,
  user_id
)
```

This explicitly specifies that we want to embed the staff relationship through the `collections_staff_id_fkey` foreign key constraint, which links to the collector who collected the milk.

### 2. Fixed getCollectionApprovalHistory Function
**File**: `src/services/milk-approval-service.ts`
**Lines**: 445-452

**Before**:
```javascript
staff (
  id,
  user_id,
  profiles (
    full_name
  )
)
```

**After**:
```javascript
staff!milk_approvals_staff_id_fkey (
  id,
  user_id,
  profiles (
    full_name
  )
)
```

This explicitly specifies that we want to embed the staff relationship through the `milk_approvals_staff_id_fkey` foreign key constraint, which links to the staff member who approved the milk.

## Verification

The fixes have been implemented and should resolve the PostgREST ambiguous relationship errors. The milk approval page should now load correctly without the PGRST201 error.

## Prevention

To prevent similar issues in the future:

1. Always specify the exact foreign key constraint name when embedding relationships in PostgREST queries where multiple relationships exist between tables
2. Use the format `table!foreign_key_constraint_name` to disambiguate relationships
3. Check database schema for multiple foreign key relationships between tables before writing embedding queries

## Related Database Schema

The issue was caused by these foreign key relationships:

```sql
-- In collections table
staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,

-- In milk_approvals table (added in migration)
staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
```

Both tables have a `staff_id` column that references the `staff` table, creating the ambiguity that needed to be resolved.