# Fix for PostgREST Relationship Embedding Error

## Problem Description

The AdminDashboard was encountering a PostgREST error with code `PGRST201`:
```
Could not embed because more than one relationship was found for 'collections' and 'staff'
```

This error occurred because the `collections` table has multiple foreign key relationships pointing to the `staff` table:
1. `collections_staff_id_fkey` - Links to the staff member who handled the collection (`staff_id` column)
2. `collections_approved_by_fkey` - Links to the staff member who approved the collection (`approved_by` column)

When using Supabase's `.select()` method with embedded relationships like `staff(*)`, PostgREST couldn't determine which relationship to use, causing the ambiguity error.

## Solution

### 1. Identify Relationship Names

We identified the exact foreign key constraint names by running a database query:
```sql
SELECT
  con.conname AS constraint_name,
  array_agg(att.attname ORDER BY array_position(con.conkey, att.attnum)) AS fk_columns,
  conf.relname AS referenced_table,
  array_agg((SELECT att2.attname FROM pg_attribute att2 WHERE att2.attrelid = con.confrelid AND att2.attnum = unnest(con.confkey) ORDER BY array_position(con.confkey, att2.attnum))) AS referenced_columns
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
JOIN pg_class conf ON conf.oid = con.confrelid
JOIN unnest(con.conkey) WITH ORDINALITY AS fk(attnum, ord) ON true
JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum = fk.attnum
WHERE con.contype = 'f'
  AND nsp.nspname = 'public'
  AND cls.relname = 'collections'
  AND conf.relname = 'staff'
GROUP BY con.conname, conf.relname;
```

This query returned:
- `collections_approved_by_fkey` - fk_columns: {approved_by} → staff.id
- `collections_staff_id_fkey` - fk_columns: {staff_id} → staff.id

### 2. Specify Exact Relationship in Query

We updated the Supabase query in `AdminDashboard.tsx` to explicitly specify which relationship to use:

**Before (causing error):**
```javascript
supabase
  .from('collections')
  .select(`
    id,
    // ... other fields
    staff!inner(profiles(full_name))
  `)
```

**After (fixed):**
```javascript
supabase
  .from('collections')
  .select(`
    id,
    // ... other fields
    collections_staff_id_fkey:staff(profiles(full_name))
  `)
```

### 3. Relationship Choice

We chose `collections_staff_id_fkey` because:
- It represents the staff member who actually handled the milk collection
- This is the most relevant information for the dashboard display
- The `approved_by` relationship is typically used for approval workflows, which is not the primary focus of the collections display

## Implementation Details

### File Modified
- `src/pages/admin/AdminDashboard.tsx`

### Changes Made
1. Updated the Supabase query to use the explicit relationship name
2. Added proper TypeScript interfaces for type safety
3. Fixed caching mechanism to properly handle typed data
4. Ensured all references to staff data use the correct relationship

### Code Changes
```typescript
// Before
staff!inner(profiles(full_name))

// After  
collections_staff_id_fkey:staff(profiles(full_name))
```

## Testing

To verify the fix:
1. Load the admin dashboard
2. Check that collections data loads without the PGRST201 error
3. Verify that staff names are correctly displayed in the collections table
4. Confirm that caching still works properly
5. Ensure no TypeScript errors remain

## Future Considerations

If you need to access both staff relationships in the future:
1. Use different aliases for each relationship:
   ```javascript
   .select(`
     collections_staff_id_fkey:collector(profiles(full_name)),
     collections_approved_by_fkey:approver(profiles(full_name))
   `)
   ```

2. Or create database views with descriptive names for common relationship combinations

This approach ensures clarity and prevents ambiguity errors while maintaining optimal performance.