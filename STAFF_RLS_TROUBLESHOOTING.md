# Staff RLS Policy Troubleshooting Guide

## Common Issues and Solutions

### 1. 403 Forbidden Errors on INSERT Operations

**Problem**: Staff members get 403 errors when trying to insert records into `milk_approvals` or `staff_performance` tables.

**Solution**: 
- Verify the user has a `staff` role in the `user_roles` table
- Confirm the user has a corresponding record in the `staff` table
- Check that RLS policies allow the specific operation for authenticated staff users

**Example Fix**:
```sql
-- Allow staff members to insert their own performance records
CREATE POLICY "Staff can insert their own performance records"
ON public.staff_performance 
FOR INSERT 
TO authenticated 
WITH CHECK (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
);
```

### 2. RLS Policy Conflicts

**Problem**: Existing policies conflict with new policies, causing unexpected access restrictions.

**Solution**:
- Drop old policies before creating new ones
- Use descriptive policy names to identify purpose
- Test policies incrementally

**Example**:
```sql
-- Drop old policies first
DROP POLICY IF EXISTS "old_policy_name" ON public.table_name;

-- Create new, more specific policy
CREATE POLICY "new_descriptive_policy_name" 
ON public.table_name 
FOR SELECT 
TO authenticated 
USING (condition);
```

### 3. Incorrect Staff ID Mapping

**Problem**: Functions try to use user ID directly instead of converting to staff ID.

**Solution**:
- Always convert user ID to staff ID using the staff table
- Verify the conversion succeeds before proceeding
- Handle cases where no staff record exists

**Example**:
```sql
-- Correct way to check staff ID
SELECT id FROM public.staff WHERE user_id = auth.uid();

-- Use the returned staff ID in subsequent operations
```

## Diagnostic Queries

### Check Current User's Access

```sql
-- Check if user is authenticated
SELECT auth.uid() as current_user_id;

-- Check user's roles
SELECT role, active FROM public.user_roles WHERE user_id = auth.uid();

-- Check if user has staff record
SELECT id as staff_id FROM public.staff WHERE user_id = auth.uid();
```

### Check Existing Policies

```sql
-- List policies on specific tables
SELECT polname FROM pg_policy WHERE polname LIKE '%milk_approvals%';
SELECT polname FROM pg_policy WHERE polname LIKE '%staff_performance%';

-- Detailed policy information
SELECT 
  p.polname,
  p.polcmd,
  p.polqual,
  p.polwithcheck
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname IN ('milk_approvals', 'staff_performance');
```

## Testing RLS Policies

### Manual Testing Steps

1. **Authenticate as a staff user**
   ```javascript
   // In your application code
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'staff@example.com',
     password: 'password'
   });
   ```

2. **Verify staff record exists**
   ```javascript
   const { data, error } = await supabase
     .from('staff')
     .select('id')
     .eq('user_id', userId);
   ```

3. **Test insert operation**
   ```javascript
   const { error } = await supabase
     .from('staff_performance')
     .insert({
       staff_id: staffId, // Must match authenticated user's staff ID
       period_start: '2023-01-01',
       period_end: '2023-01-31',
       // ... other required fields
     });
   ```

## Best Practices

### 1. Policy Design
- Make policies as specific as possible
- Use `auth.uid()` to check current user
- Join with `staff` table to verify staff ID mapping
- Include admin access where appropriate

### 2. Error Handling
- Always check for policy violations in application code
- Provide user-friendly error messages
- Log detailed errors for debugging

### 3. Testing
- Test policies with different user roles
- Verify both positive and negative cases
- Test edge cases (null values, invalid IDs, etc.)

## Emergency Fixes

If users are blocked by RLS policies:

### Using the Reset Script

Run the [reset-staff-rls-policies.ts](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/scripts/reset-staff-rls-policies.ts) script to generate SQL commands for resetting policies:

```bash
npx ts-node scripts/reset-staff-rls-policies.ts
```

Then copy and execute the generated SQL commands in your Supabase SQL Editor.

1. **Temporary bypass** (admin only):
   ```sql
   -- Temporarily disable RLS on a table
   ALTER TABLE public.staff_performance DISABLE ROW LEVEL SECURITY;
   
   -- Re-enable after fixing
   ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;
   ```

2. **Quick policy fix**:
   ```sql
   -- Add a broad policy for testing (remove in production)
   CREATE POLICY "temp_staff_access" 
   ON public.staff_performance 
   FOR ALL 
   TO authenticated 
   USING (true) 
   WITH CHECK (true);
   ```