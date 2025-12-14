# Comprehensive RLS Recursion Fix

## Problem Summary
The application was experiencing "infinite recursion detected in policy for relation 'user_roles'" errors. This occurred because RLS policies were directly querying the user_roles table within the same policy evaluation, creating a circular reference.

## Root Cause
Several RLS policies used direct queries to the user_roles table:
```sql
EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
)
```

This creates recursion because when evaluating the policy on the user_roles table itself, it tries to query the user_roles table again.

## Solution Applied
All direct user_roles queries in RLS policies have been replaced with calls to the secure function `get_user_role_secure()` which bypasses RLS and avoids recursion.

## Files Created

### 1. Migration File
- `supabase/migrations/20251214000700_fix_user_roles_recursion_issue.sql`
  - Fixes the infinite recursion in user_roles RLS policies
  - Replaces the recursive policy with a simpler one using get_user_role_secure()

### 2. Test Script
- `test_user_roles_fix.sql`
  - Contains queries to verify that the fix works correctly

## How to Apply the Fix

1. **Apply the migration:**
   ```bash
   # If using Supabase CLI
   supabase db push
   
   # Or run the SQL directly in Supabase dashboard
   # Copy contents of 20251214000700_fix_user_roles_recursion_issue.sql
   ```

2. **Verify the fix:**
   Run the queries in `test_user_roles_fix.sql` in your Supabase SQL Editor

3. **Test the application:**
   - Login as an admin user
   - Try accessing the farmers and staff dashboards
   - Verify that no recursion errors occur

## Updated Policy Pattern

### Before (causing recursion):
```sql
CREATE POLICY "Admins can manage table" ON public.table_name
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );
```

### After (fixed):
```sql
CREATE POLICY "Admins can manage table" ON public.table_name
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');
```

## Verification Steps

1. Check that policies were created correctly:
   ```sql
   SELECT polname FROM pg_policy WHERE polrelid = 'user_roles'::regclass;
   ```

2. Verify that an admin user can access user_roles:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'your-admin-user-id' LIMIT 5;
   ```

3. Confirm that the farmers and staff tables are accessible without recursion errors:
   ```sql
   SELECT COUNT(*) as farmers_count FROM farmers LIMIT 1;
   SELECT COUNT(*) as staff_count FROM staff LIMIT 1;
   ```